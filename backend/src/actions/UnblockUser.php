<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;

final class UnblockUser
{
    public static function handle(array $body): never
    {
        $user = Auth::requireUser();
        $handle = trim((string) ($body['handle'] ?? ''));

        if ($handle === '') {
            Response::error('handle is required', 422);
        }

        $target = Database::users()->findOne(['handle' => $handle]);
        if ($target === null) {
            Response::error('User not found', 404);
        }

        Database::blockedUsers()->deleteOne([
            'blockerId' => $user['_id'],
            'blockedId' => $target['_id'],
        ]);

        Response::ok(['isBlocked' => false]);
    }
}
