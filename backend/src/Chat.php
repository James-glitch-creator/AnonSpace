<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class Chat
{
    public static function threads(): Collection
    {
        return Database::chatThreads();
    }

    public static function messages(): Collection
    {
        return Database::chatMessages();
    }

    public static function renderThread(array $thread, ObjectId $currentUserId): array
    {
        $otherId = null;
        foreach ($thread['participantIds'] as $participantId) {
            if ((string) $participantId !== (string) $currentUserId) {
                $otherId = $participantId;
                break;
            }
        }

        $other = $otherId !== null ? Database::users()->findOne(['_id' => $otherId]) : null;

        return [
            'id' => (string) $thread['_id'],
            'handle' => $other['handle'] ?? 'Unknown',
            'lastMessageAt' => $thread['lastMessageAt']->toDateTime()->format(DATE_ATOM),
        ];
    }

    public static function renderMessage(array $message): array
    {
        return [
            'id' => (string) $message['_id'],
            'threadId' => (string) $message['threadId'],
            'senderId' => (string) $message['senderId'],
            'body' => $message['body'],
            'createdAt' => $message['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }
}
