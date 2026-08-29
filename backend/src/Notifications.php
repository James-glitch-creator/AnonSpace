<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;

final class Notifications
{
    public static function collection(): Collection
    {
        return Database::notifications();
    }

    /**
     * @param 'reported'|'content_banned'|'account_banned'|'community_banned'|'report_approved'|'report_dismissed' $type
     * @param 'post'|'comment'|'community'|'user'|null $targetType
     */
    public static function create(
        ObjectId $userId,
        string $type,
        string $message,
        ?string $targetType = null,
        ?ObjectId $targetId = null
    ): void {
        $recipient = Database::users()->findOne(
            ['_id' => $userId],
            ['projection' => ['mutedNotificationTypes' => 1]]
        );
        $muted = $recipient['mutedNotificationTypes'] ?? [];
        if (in_array($type, (array) $muted, true)) {
            return;
        }

        self::collection()->insertOne([
            'userId' => $userId,
            'type' => $type,
            'message' => $message,
            'targetType' => $targetType,
            'targetId' => $targetId,
            'isRead' => false,
            'createdAt' => new UTCDateTime(),
        ]);
    }

    public static function render(array $notification): array
    {
        return [
            'id' => (string) $notification['_id'],
            'type' => $notification['type'],
            'message' => $notification['message'],
            'targetType' => $notification['targetType'] ?? null,
            'targetId' => isset($notification['targetId']) ? (string) $notification['targetId'] : null,
            'isRead' => (bool) $notification['isRead'],
            'createdAt' => $notification['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }

    /** @return array<int, array<string, mixed>> */
    public static function listForUser(ObjectId $userId, int $limit = 30): array
    {
        $rows = self::collection()->find(
            ['userId' => $userId],
            ['sort' => ['createdAt' => -1], 'limit' => $limit]
        )->toArray();

        return array_map(fn($row) => self::render((array) $row), $rows);
    }

    public static function unreadCount(ObjectId $userId): int
    {
        return self::collection()->countDocuments(['userId' => $userId, 'isRead' => false]);
    }

    public static function markRead(ObjectId $userId, ObjectId $notificationId): void
    {
        self::collection()->updateOne(
            ['_id' => $notificationId, 'userId' => $userId],
            ['$set' => ['isRead' => true]]
        );
    }

    public static function markAllRead(ObjectId $userId): void
    {
        self::collection()->updateMany(
            ['userId' => $userId, 'isRead' => false],
            ['$set' => ['isRead' => true]]
        );
    }
}
