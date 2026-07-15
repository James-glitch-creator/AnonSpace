<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Env;
use App\Jwt;
use App\RandomName;
use App\Response;
use App\Validator;
use MongoDB\BSON\UTCDateTime;
use RuntimeException;

final class CompleteSignup
{
    public static function handle(array $body): never
    {
        $ticket = (string) ($body['ticket'] ?? '');
        $password = (string) ($body['password'] ?? '');

        if ($ticket === '') {
            Response::error('Missing or expired verification ticket', 401);
        }

        if (!Validator::isStrongPassword($password)) {
            Response::error('Password must be at least 8 characters', 422);
        }

        try {
            $payload = Jwt::decode($ticket, Env::get('JWT_SECRET', ''));
        } catch (RuntimeException) {
            Response::error('Your verification session expired. Please start over.', 401);
        }

        if (($payload['purpose'] ?? null) !== 'signup' || !isset($payload['email'])) {
            Response::error('Invalid verification ticket', 401);
        }

        $email = $payload['email'];
        $users = Database::users();

        if ($users->findOne(['email' => $email]) !== null) {
            Response::error('An account with that email already exists', 409);
        }

        $result = $users->insertOne([
            'email' => $email,
            'passwordHash' => Auth::hashPassword($password),
            'handle' => RandomName::generate($users),
            'role' => 'user',
            'createdAt' => new UTCDateTime(),
        ]);

        $user = $users->findOne(['_id' => $result->getInsertedId()]);
        Auth::issueSession((array) $user);

        Response::ok(['user' => Auth::publicUser((array) $user)], 201);
    }
}
