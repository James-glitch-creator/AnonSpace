<?php

namespace App\Actions;

use App\Auth;
use App\Chat;
use App\Ids;
use App\Response;

final class MarkChatThreadRead
{
    public static function handle(string $threadId): never
    {
        $user = Auth::requireUser();
        $threadObjectId = Ids::parse($threadId);

        if ($threadObjectId === null) {
            Response::error('Invalid thread id', 422);
        }

        $thread = Chat::threads()->findOne(['_id' => $threadObjectId, 'participantIds' => $user['_id']]);
        if ($thread === null) {
            Response::error('Thread not found', 404);
        }

        Chat::markRead($user['_id'], $threadObjectId);

        Response::ok(['read' => true]);
    }
}
