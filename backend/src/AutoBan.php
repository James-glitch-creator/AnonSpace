<?php

namespace App;

use MongoDB\BSON\ObjectId;

final class AutoBan
{
    /** Content is auto-banned once its downvote share reaches this fraction of total votes. */
    public const THRESHOLD = 0.5;

    /** Content needs at least this many total votes before the ratio is evaluated at all. */
    public const MIN_VOTES = 4; // TODO: temporary for testing - restore to 18 afterward.

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

        if ($total < self::MIN_VOTES) {
            return;
        }

        if ($downvotes / $total < self::THRESHOLD) {
            return;
        }

        ContentModeration::ban($targetType, $targetId, 'auto', null);
    }
}
