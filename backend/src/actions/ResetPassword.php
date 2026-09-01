<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Env;
use App\Jwt;
use App\Response;
use App\Validator;
use RuntimeException;

/** Step 3 of the forgot-password flow - swaps the password on whichever account the OTP
 *  in step 2 verified. Doesn't sign the caller in: unlike CompleteSignup, there's no new
 *  account to hand a session to, and it leaves the normal login form as the one place a
 *  session actually gets issued. */
final class ResetPassword
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

        if (($payload['purpose'] ?? null) !== 'password-reset' || !isset($payload['email'])) {
            Response::error('Invalid verification ticket', 401);
        }

        $user = Database::users()->findOne(['email' => $payload['email']]);
        if ($user === null) {
            Response::error('Account no longer exists', 404);
        }

        Database::users()->updateOne(
            ['_id' => $user['_id']],
            ['$set' => ['passwordHash' => Auth::hashPassword($password)]]
        );

        Response::ok(['message' => 'Password updated']);
    }
}
