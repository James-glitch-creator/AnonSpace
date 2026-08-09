<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
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

        $lastMessageSenderId = $thread['lastMessageSenderId'] ?? null;
        $sentByMe = $lastMessageSenderId !== null && (string) $lastMessageSenderId === (string) $currentUserId;

        return [
            'id' => (string) $thread['_id'],
            'handle' => $other['handle'] ?? 'Unknown',
            'lastMessageAt' => $thread['lastMessageAt']->toDateTime()->format(DATE_ATOM),
            'lastMessageBody' => $thread['lastMessageBody'] ?? null,
            'lastMessageSentByMe' => $sentByMe,
            'isBlocked' => $otherId !== null && Blocking::isBlocked($currentUserId, $otherId),
            'isUnread' => self::isUnread($thread, $currentUserId, $lastMessageSenderId, $sentByMe),
        ];
    }

    private static function isUnread(
        array $thread,
        ObjectId $currentUserId,
        ?ObjectId $lastMessageSenderId,
        bool $sentByMe
    ): bool {
        if ($lastMessageSenderId === null || $sentByMe) {
            return false;
        }

        $lastReadAt = $thread['lastReadAt'][(string) $currentUserId] ?? null;
        if ($lastReadAt === null) {
            return true;
        }

        // UTCDateTime::__toString() returns milliseconds since epoch; compare numerically
        // rather than as strings so this doesn't depend on both values having the same
        // digit count.
        return (int) (string) $lastReadAt < (int) (string) $thread['lastMessageAt'];
    }

    /** Marks a thread as read by this user, up to its current lastMessageAt. */
    public static function markRead(ObjectId $userId, ObjectId $threadId): void
    {
        self::threads()->updateOne(
            ['_id' => $threadId, 'participantIds' => $userId],
            ['$set' => ["lastReadAt.{$userId}" => new UTCDateTime()]]
        );
    }

    /** True if any of this user's threads have a message they haven't read yet. */
    public static function hasUnread(ObjectId $userId): bool
    {
        $threads = self::threads()->find(['participantIds' => $userId])->toArray();
        foreach ($threads as $thread) {
            $lastMessageSenderId = $thread['lastMessageSenderId'] ?? null;
            $sentByMe = $lastMessageSenderId !== null && (string) $lastMessageSenderId === (string) $userId;
            if (self::isUnread((array) $thread, $userId, $lastMessageSenderId, $sentByMe)) {
                return true;
            }
        }

        return false;
    }

    public static function renderMessage(array $message): array
    {
        return [
            'id' => (string) $message['_id'],
            'threadId' => (string) $message['threadId'],
            'senderId' => (string) $message['senderId'],
            'body' => $message['body'],
            'mediaType' => $message['mediaType'] ?? 'none',
            'mediaUrl' => $message['mediaUrl'] ?? null,
            'createdAt' => $message['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }
}
