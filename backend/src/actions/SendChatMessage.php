<?php

namespace App\Actions;

use App\Auth;
use App\Blocking;
use App\Chat;
use App\Ids;
use App\Response;
use App\Uploads;
use MongoDB\BSON\UTCDateTime;

final class SendChatMessage
{
    public static function handle(string $threadId, array $body, array $files = []): never
    {
        $user = Auth::requireUser();
        Auth::assertNotModerator($user, 'message other accounts');
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
        if (mb_strlen($messageBody) > 2000) {
            Response::error('Message body must be under 2000 characters', 422);
        }

        $hasPhoto = isset($files['photo']) && Uploads::hasUpload($files['photo']);
        $hasVideo = isset($files['video']) && Uploads::hasUpload($files['video']);

        if ($hasPhoto && $hasVideo) {
            Response::error('A message can include a photo or a video, not both.', 422);
        }

        if ($messageBody === '' && !$hasPhoto && !$hasVideo) {
            Response::error('Message must include text, a photo, or a video', 422);
        }

        $mediaType = 'none';
        $mediaUrl = null;

        if ($hasPhoto) {
            // One photo per message (unlike posts, which allow several) - keeps chat
            // attachments to the usual "one file per bubble" pattern.
            $urls = Uploads::savePhotos($files['photo']);
            $mediaUrl = $urls[0] ?? null;
            $mediaType = $mediaUrl !== null ? 'photo' : 'none';
        } elseif ($hasVideo) {
            $mediaUrl = Uploads::saveVideo($files['video']);
            $mediaType = $mediaUrl !== null ? 'video' : 'none';
        }

        $now = new UTCDateTime();
        $result = Chat::messages()->insertOne([
            'threadId' => $threadObjectId,
            'senderId' => $user['_id'],
            'body' => $messageBody,
            'mediaType' => $mediaType,
            'mediaUrl' => $mediaUrl,
            'createdAt' => $now,
        ]);

        $previewBody = $messageBody !== '' ? $messageBody : match ($mediaType) {
            'photo' => 'Sent a photo',
            'video' => 'Sent a video',
            default => '',
        };

        Chat::threads()->updateOne(['_id' => $threadObjectId], [
            '$set' => [
                'lastMessageAt' => $now,
                'lastMessageBody' => $previewBody,
                'lastMessageSenderId' => $user['_id'],
                // Sending a message means you're caught up on this thread yourself.
                "lastReadAt.{$user['_id']}" => $now,
            ],
        ]);

        $message = Chat::messages()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['message' => Chat::renderMessage((array) $message)], 201);
    }
}
