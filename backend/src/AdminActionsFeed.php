<?php

namespace App;

use MongoDB\BSON\ObjectId;

/** Shared by the Overview page (every admin's recent actions) and the per-admin actions
 *  page a superadmin sees after tapping an admin's name (one admin's actions only). */
final class AdminActionsFeed
{
    private const DEFAULT_LIMIT = 30;

    /** @param ObjectId|null $adminId Null for everyone (Overview); a specific admin's id
     *   to scope the feed to just what they've done. */
    public static function forAdmin(?ObjectId $adminId, int $limit = self::DEFAULT_LIMIT): array
    {
        $banFilter = ['bannedBy' => $adminId ?? ['$ne' => null]];
        $dismissFilter = [
            'status' => 'dismissed',
            'reviewedBy' => $adminId ?? ['$ne' => null],
        ];

        $bans = Database::banLogs()->find(
            $banFilter,
            ['sort' => ['createdAt' => -1], 'limit' => $limit]
        )->toArray();

        $dismissals = Database::reports()->find(
            $dismissFilter,
            ['sort' => ['reviewedAt' => -1], 'limit' => $limit]
        )->toArray();

        $actions = [
            ...array_map(fn($b) => self::renderBan((array) $b), $bans),
            ...array_map(fn($r) => self::renderDismissal((array) $r), $dismissals),
        ];

        usort($actions, fn($a, $b) => strcmp($b['at'], $a['at']));

        return array_slice($actions, 0, $limit);
    }

    private static function renderBan(array $log): array
    {
        $admin = Database::users()->findOne(['_id' => $log['bannedBy']]);

        return [
            'id' => (string) $log['_id'],
            'action' => 'ban',
            'targetType' => strtolower((string) $log['targetType']),
            'preview' => self::previewFor($log['targetType'], $log['targetId']),
            'reason' => $log['reason'],
            'adminHandle' => $admin['handle'] ?? 'Unknown admin',
            'at' => $log['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }

    private static function renderDismissal(array $report): array
    {
        $admin = Database::users()->findOne(['_id' => $report['reviewedBy']]);

        return [
            'id' => (string) $report['_id'],
            'action' => 'dismiss',
            'targetType' => strtolower((string) $report['targetType']),
            'preview' => self::previewFor($report['targetType'], $report['targetId']),
            'reason' => $report['reason'],
            'adminHandle' => $admin['handle'] ?? 'Unknown admin',
            'at' => $report['reviewedAt']->toDateTime()->format(DATE_ATOM),
        ];
    }

    private static function previewFor(string $targetType, ObjectId $targetId): string
    {
        $value = match (strtolower($targetType)) {
            'post' => self::excerpt(Database::posts()->findOne(['_id' => $targetId])['body'] ?? null),
            'comment' => self::excerpt(Database::comments()->findOne(['_id' => $targetId])['body'] ?? null),
            'community' => Communities::collection()->findOne(['_id' => $targetId])['name'] ?? null,
            'user' => Database::users()->findOne(['_id' => $targetId])['handle'] ?? null,
            default => null,
        };

        return $value ?? '(deleted)';
    }

    private static function excerpt(?string $body): ?string
    {
        if ($body === null) {
            return null;
        }

        return mb_strlen($body) > 140 ? mb_substr($body, 0, 140) . '…' : $body;
    }
}
