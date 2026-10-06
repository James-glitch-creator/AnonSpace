<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

final class AutoBan
{
    public const DEFAULT_THRESHOLD_PERCENT = 50;
    public const DEFAULT_MIN_VOTES = 4;

    /** @return array{thresholdPercent: int, minVotes: int} */
    public static function settings(): array
    {
        $settings = Database::settings()->findOne(['_id' => 'auto_ban']);

        return [
            'thresholdPercent' => (int) ($settings['thresholdPercent'] ?? self::DEFAULT_THRESHOLD_PERCENT),
            'minVotes' => (int) ($settings['minVotes'] ?? self::DEFAULT_MIN_VOTES),
        ];
    }

    /** Saves both values atomically; applies on subsequent vote evaluations. */
    public static function updateSettings(array $body, ObjectId $actorId): array
    {
        $percent = $body['thresholdPercent'] ?? null;
        $minVotes = $body['minVotes'] ?? null;
        if (!is_int($percent) || $percent < 1 || $percent > 100) {
            Response::error('Downvote threshold must be a whole number between 1 and 100.', 422);
        }
        if (!is_int($minVotes) || $minVotes < 1 || $minVotes > 1000000) {
            Response::error('Minimum votes must be a whole number between 1 and 1,000,000.', 422);
        }

        $settings = ['thresholdPercent' => $percent, 'minVotes' => $minVotes];
        Database::settings()->updateOne(
            ['_id' => 'auto_ban'],
            ['$set' => $settings + ['updatedBy' => $actorId, 'updatedAt' => new UTCDateTime()]],
            ['upsert' => true]
        );

        return $settings;
    }

    /**
     * @param 'post'|'comment' $targetType
     */
    public static function evaluate(string $targetType, ObjectId $targetId): void
    {
        $collection = $targetType === 'post' ? Database::posts() : Database::comments();
        $target = $collection->findOne(['_id' => $targetId]);

        if ($target === null || ($target['status'] ?? 'visible') === 'banned') {
            return;
        }

        $upvotes = (int) $target['upvotes'];
        $downvotes = (int) $target['downvotes'];
        $total = $upvotes + $downvotes;
        $settings = self::settings();

        if ($total < $settings['minVotes']) {
            return;
        }

        if ($downvotes * 100 < $settings['thresholdPercent'] * $total) {
            return;
        }

        ContentModeration::ban($targetType, $targetId, 'auto', null);
    }
}
