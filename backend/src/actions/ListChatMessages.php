<?php

namespace App\Actions;

use App\Auth;
use App\Chat;
use App\Ids;
use App\Response;

final class ListChatMessages
{
    public static function handle(string $threadId, array $query): never
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

        $filter = ['threadId' => $threadObjectId];

        if (!empty($query['after'])) {
            $afterId = Ids::parse((string) $query['after']);
            if ($afterId !== null) {
                $filter['_id'] = ['$gt' => $afterId];
            }
        }

        $messages = Chat::messages()->find($filter, ['sort' => ['createdAt' => 1], 'limit' => 200])->toArray();

        Response::ok(['messages' => array_map(fn($m) => Chat::renderMessage((array) $m), $messages)]);
    }
}
