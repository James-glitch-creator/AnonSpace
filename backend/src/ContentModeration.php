<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/** Shared by every path that bans a post/comment: the auto-ban system, an approved
 *  report, and an admin acting directly from the review queue. */
final class ContentModeration
{
    /**
     * Bans a post or comment, logs it, and notifies the author. No-op (returns false) if
     * it's already banned or doesn't exist - safe to call more than once for the same
     * target.
     *
     * @param 'post'|'comment' $targetType
     * @param 'auto'|'report'|'manual' $context Which path triggered this, for the log
     *   reason and the author's notification wording.
     * @param ObjectId|null $bannedBy Null for the automatic downvote-ratio system; the
     *   admin's id for a report-approval or manual ban.
     * @param string|null $customReason Manual bans only - the reason an admin picked in
     *   the ban dialog, in place of the generic "from the review queue" text.
     */
    public static function ban(
        string $targetType,
        ObjectId $targetId,
        string $context,
        ?ObjectId $bannedBy,
        ?string $customReason = null
    ): bool {
        $collection = $targetType === 'post' ? Database::posts() : Database::comments();
        $target = $collection->findOne(['_id' => $targetId]);
        if ($target === null || ($target['status'] ?? 'visible') === 'banned') {
            return false;
        }

        $collection->updateOne(['_id' => $targetId], ['$set' => ['status' => 'banned']]);

        $communitySlug = $targetType === 'post'
            ? ($target['communitySlug'] ?? 'unknown')
            : self::parentCommunitySlug((array) $target);

        $upvotes = (int) ($target['upvotes'] ?? 0);
        $downvotes = (int) ($target['downvotes'] ?? 0);
        $total = $upvotes + $downvotes;

        [$reason, $message] = match ($context) {
            'auto' => [
                'Auto-ban: downvote ratio exceeded threshold',
                "Your {$targetType} in c/{$communitySlug} was removed after receiving too many downvotes.",
            ],
            'report' => [
                'Confirmed by admin report review',
                "Your {$targetType} in c/{$communitySlug} was removed following a report review.",
            ],
            default => [
                $customReason !== null
                    ? "Manually banned by admin — {$customReason}"
                    : 'Manually banned by admin from the review queue',
                $customReason !== null
                    ? "Your {$targetType} in c/{$communitySlug} was removed by an admin for \"{$customReason}\"."
                    : "Your {$targetType} in c/{$communitySlug} was removed by an admin.",
            ],
        };

        Database::banLogs()->insertOne([
            'targetType' => $targetType === 'post' ? 'Post' : 'Comment',
            'targetId' => $targetId,
            'communitySlug' => $communitySlug,
            'finalRatio' => $total > 0 ? round(($downvotes / $total) * 100, 2) : 0.0,
            'reason' => $reason,
            'bannedBy' => $bannedBy,
            'createdAt' => new UTCDateTime(),
        ]);

        Notifications::create($target['authorId'], 'content_banned', $message, $targetType, $targetId);

        return true;
    }

    private static function parentCommunitySlug(array $comment): string
    {
        $post = Database::posts()->findOne(['_id' => $comment['postId']]);

        return $post['communitySlug'] ?? 'unknown';
    }
}
