<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/** A superadmin's own audit trail - who granted or revoked admin access, and when. Kept
 *  separate from AdminActionsFeed (ban_logs/reports), which is moderation history and
 *  not a superadmin's job. */
final class AdminAccountLog
{
    private const DEFAULT_LIMIT = 30;

    /** @param 'granted'|'revoked' $action */
    public static function record(
        string $action,
        ObjectId $targetId,
        string $targetHandle,
        ObjectId $performedBy,
        string $performedByHandle
    ): void {
        Database::adminLogs()->insertOne([
            'action' => $action,
            'targetId' => $targetId,
            'targetHandle' => $targetHandle,
            'performedBy' => $performedBy,
            'performedByHandle' => $performedByHandle,
            'createdAt' => new UTCDateTime(),
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    public static function recent(int $limit = self::DEFAULT_LIMIT): array
    {
        $rows = Database::adminLogs()->find(
            [],
            ['sort' => ['createdAt' => -1], 'limit' => $limit]
        )->toArray();

        return array_map(fn($row) => self::render((array) $row), $rows);
    }

    private static function render(array $log): array
    {
        return [
            'id' => (string) $log['_id'],
            'action' => $log['action'],
            'targetHandle' => $log['targetHandle'],
            'performedByHandle' => $log['performedByHandle'],
            'at' => $log['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }
}
