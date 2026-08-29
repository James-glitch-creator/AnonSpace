<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;
use App\Validator;

final class ChangePassword
{
    public static function handle(array $body): never
    {
        $user = Auth::requireUser();

        $currentPassword = (string) ($body['currentPassword'] ?? '');
        $newPassword = (string) ($body['newPassword'] ?? '');

        if (!Auth::verifyPassword($currentPassword, $user['passwordHash'])) {
            Response::error('Current password is incorrect', 401);
        }

        if (!Validator::isStrongPassword($newPassword)) {
            Response::error('New password must be at least 8 characters', 422);
        }

        Database::users()->updateOne(
            ['_id' => $user['_id']],
            ['$set' => ['passwordHash' => Auth::hashPassword($newPassword)]]
        );

        Response::ok(['message' => 'Password updated']);
    }
}
