<?php

namespace App\Actions;

use App\Auth;
use App\Blocking;
use App\Chat;
use App\Ids;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class SendChatMessage
{
    public static function handle(string $threadId, array $body): never
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

        $otherId = null;
        foreach ($thread['participantIds'] as $participantId) {
            if ((string) $participantId !== (string) $user['_id']) {
                $otherId = $participantId;
                break;
            }
        }

        if ($otherId !== null && Blocking::eitherBlocked($user['_id'], $otherId)) {
            Response::error('You cannot message this account', 403);
        }

        $messageBody = trim((string) ($body['body'] ?? ''));
        if ($messageBody === '' || mb_strlen($messageBody) > 2000) {
            Response::error('Message body must be between 1 and 2000 characters', 422);
        }

        $now = new UTCDateTime();
        $result = Chat::messages()->insertOne([
            'threadId' => $threadObjectId,
            'senderId' => $user['_id'],
            'body' => $messageBody,
            'createdAt' => $now,
        ]);

        Chat::threads()->updateOne(['_id' => $threadObjectId], ['$set' => ['lastMessageAt' => $now]]);

        $message = Chat::messages()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['message' => Chat::renderMessage((array) $message)], 201);
    }
}
