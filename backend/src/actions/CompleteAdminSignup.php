<?php

namespace App\Actions;

use App\AdminAccountLog;
use App\Auth;
use App\Database;
use App\Env;
use App\Jwt;
use App\Response;
use App\Validator;
use MongoDB\BSON\UTCDateTime;
use RuntimeException;

/** Step 3 of the admin registration flow - superadmin only, mirrors CompleteSignup. */
final class CompleteAdminSignup
{
    public static function handle(array $body): never
    {
        $actor = Auth::requireSuperAdmin();

        $ticket = (string) ($body['ticket'] ?? '');
        $fullName = trim((string) ($body['fullName'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($ticket === '') {
            Response::error('Missing or expired verification ticket', 401);
        }

        if ($fullName === '') {
            Response::error('Full name is required', 422);
        }

        if (!Validator::isStrongPassword($password)) {
            Response::error('Password must be at least 8 characters', 422);
        }

        try {
            $payload = Jwt::decode($ticket, Env::get('JWT_SECRET', ''));
        } catch (RuntimeException) {
            Response::error('Your verification session expired. Please start over.', 401);
        }

        if (($payload['purpose'] ?? null) !== 'admin-signup' || !isset($payload['email'])) {
            Response::error('Invalid verification ticket', 401);
        }

        $email = $payload['email'];
        $users = Database::users();

        if ($users->findOne(['email' => $email]) !== null) {
            Response::error('An account with that email already exists', 409);
        }

        // Admins aren't anonymous the way regular users are - they use their real name
        // as their handle instead of a randomly generated one, everywhere it's shown
        // (sidebar, ban logs, admin action log, ...).
        if ($users->findOne(['handle' => $fullName]) !== null) {
            Response::error('An admin with that name already exists', 409);
        }

        $result = $users->insertOne([
            'email' => $email,
            'passwordHash' => Auth::hashPassword($password),
            'handle' => $fullName,
            'fullName' => $fullName,
            'role' => 'admin',
            'createdAt' => new UTCDateTime(),
        ]);

        AdminAccountLog::record(
            'granted',
            $result->getInsertedId(),
            $fullName,
            $actor['_id'],
            $actor['handle']
        );

        // Deliberately does NOT call Auth::issueSession() - the superadmin operating this
        // flow stays logged in as themselves; this only provisions the new admin account.
        $user = $users->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['user' => Auth::publicUser((array) $user)], 201);
    }
}
