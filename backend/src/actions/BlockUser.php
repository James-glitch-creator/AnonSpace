<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class BlockUser
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

        if ((string) $target['_id'] === (string) $user['_id']) {
            Response::error("You can't block yourself", 422);
        }

        Database::blockedUsers()->updateOne(
            ['blockerId' => $user['_id'], 'blockedId' => $target['_id']],
            [
                '$setOnInsert' => [
                    'blockerId' => $user['_id'],
                    'blockedId' => $target['_id'],
                    'createdAt' => new UTCDateTime(),
                ],
            ],
            ['upsert' => true]
        );

        Response::ok(['isBlocked' => true]);
    }
}
