<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

final class AutoBan
{
    /** Content is auto-banned once its downvote share reaches this fraction of total votes. */
    private const THRESHOLD = 0.25;

    /** Content needs at least this many total votes before the ratio is evaluated at all. */
    private const MIN_VOTES = 18;

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

        $ratio = $downvotes / $total;

        if ($ratio < self::THRESHOLD) {
            return;
        }

        $collection->updateOne(['_id' => $targetId], ['$set' => ['status' => 'banned']]);

        $communitySlug = $targetType === 'post'
            ? $target['communitySlug']
            : self::parentCommunitySlug($target);

        Database::banLogs()->insertOne([
            'targetType' => $targetType === 'post' ? 'Post' : 'Comment',
            'targetId' => $targetId,
            'communitySlug' => $communitySlug,
            'finalRatio' => round($ratio * 100, 2),
            'reason' => 'Auto-ban: downvote ratio exceeded threshold',
            'createdAt' => new UTCDateTime(),
        ]);
    }

    private static function parentCommunitySlug(array $comment): string
    {
        $post = Database::posts()->findOne(['_id' => $comment['postId']]);

        return $post['communitySlug'] ?? 'unknown';
    }
}
