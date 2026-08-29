<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;
use MongoDB\BSON\ObjectId;

final class ListBanLogs
{
    public static function handle(): never
    {
        Auth::requireAdmin();

        $logs = Database::banLogs()->find([], ['sort' => ['createdAt' => -1], 'limit' => 200])->toArray();

        Response::ok(['banLogs' => array_map(fn($log) => self::render((array) $log), $logs)]);
    }

    private static function render(array $log): array
    {
        $targetType = $log['targetType'];
        $targetId = $log['targetId'];

        $preview = match ($targetType) {
            'Post' => self::excerpt(Database::posts()->findOne(['_id' => $targetId])['body'] ?? null),
            'Comment' => self::excerpt(Database::comments()->findOne(['_id' => $targetId])['body'] ?? null),
            'User' => Database::users()->findOne(['_id' => $targetId])['handle'] ?? null,
            'Community' => Database::communities()->findOne(['_id' => $targetId])['name'] ?? null,
            default => null,
        };

        /** @var ObjectId|null $bannedBy */
        $bannedBy = $log['bannedBy'] ?? null;
        $bannedByHandle = $bannedBy !== null
            ? (Database::users()->findOne(['_id' => $bannedBy])['handle'] ?? 'Unknown admin')
            : null;

        return [
            'id' => (string) $log['_id'],
            'targetType' => $targetType,
            'targetId' => (string) $targetId,
            'preview' => $preview ?? '(deleted)',
            'communitySlug' => $log['communitySlug'] ?? null,
            'finalRatio' => $log['finalRatio'] ?? null,
            'reason' => $log['reason'],
            // Null means the automatic downvote-ratio system did this, not a person.
            'bannedByHandle' => $bannedByHandle,
            'createdAt' => $log['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }

    private static function excerpt(?string $body): ?string
    {
        if ($body === null) {
            return null;
        }

        return mb_strlen($body) > 140 ? mb_substr($body, 0, 140) . '…' : $body;
    }
}
