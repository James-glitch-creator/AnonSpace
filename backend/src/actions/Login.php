<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;
use App\Validator;

final class Login
{
    public static function handle(array $body): never
    {
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if (!Validator::isEmail($email) || $password === '') {
            Response::error('Email and password are required', 422);
        }

        $user = Database::users()->findOne(['email' => $email]);

        if ($user === null || !Auth::verifyPassword($password, $user['passwordHash'])) {
            Response::error('Invalid email or password', 401);
        }

        if (($user['status'] ?? 'active') === 'banned') {
            Response::error('This account has been banned.', 403);
        }

        $user = Auth::normalizeSuperadminHandle((array) $user);
        Auth::issueSession($user);

        Response::ok(['user' => Auth::publicUser($user)]);
    }
}
