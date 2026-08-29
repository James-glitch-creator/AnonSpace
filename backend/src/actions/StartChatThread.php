<?php

namespace App\Actions;

use App\Auth;
use App\Chat;
use App\Database;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class StartChatThread
{
    public static function handle(array $body): never
    {
        $user = Auth::requireUser();
        Auth::assertNotModerator($user, 'message other accounts');
        $recipientHandle = trim((string) ($body['recipientHandle'] ?? ''));

        if ($recipientHandle === '') {
            Response::error('recipientHandle is required', 422);
        }

        $recipient = Database::users()->findOne(['handle' => $recipientHandle]);
        if ($recipient === null) {
            Response::error('User not found', 404);
        }

        if ((string) $recipient['_id'] === (string) $user['_id']) {
            Response::error('You cannot start a chat with yourself', 422);
        }

        $existing = Chat::threads()->findOne([
            '$and' => [
                ['participantIds' => ['$all' => [$user['_id'], $recipient['_id']]]],
                ['participantIds' => ['$size' => 2]],
            ],
        ]);

        if ($existing !== null) {
            Response::ok(['thread' => Chat::renderThread((array) $existing, $user['_id'])]);
        }

        $now = new UTCDateTime();
        $result = Chat::threads()->insertOne([
            'participantIds' => [$user['_id'], $recipient['_id']],
            'createdAt' => $now,
            'lastMessageAt' => $now,
        ]);

        $thread = Chat::threads()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['thread' => Chat::renderThread((array) $thread, $user['_id'])], 201);
    }
}
