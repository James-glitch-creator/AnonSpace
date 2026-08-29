<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/** Shared by every path that bans a community: an approved community report, and an
 *  admin banning directly from a community's page in the admin panel. Doesn't delete
 *  anything - it flips the community to 'status: banned', which hides it from public
 *  listings/search and blocks joining or posting into it, while leaving its history intact
 *  for the record. No-op (returns false) if it's already banned or doesn't exist. */
final class CommunityModeration
{
    /**
     * @param 'report'|'manual' $context Which path triggered this, for the log reason and
     *   the creator's notification wording.
     * @param string|null $customReason Manual bans only - the reason an admin picked in
     *   the ban dialog.
     */
    public static function ban(string $slug, string $context, ObjectId $actorId, ?string $customReason = null): bool
    {
        $community = Communities::collection()->findOne(['slug' => $slug]);
        if ($community === null || ($community['status'] ?? 'active') === 'banned') {
            return false;
        }

        Communities::collection()->updateOne(['_id' => $community['_id']], ['$set' => ['status' => 'banned']]);

        [$reason, $message] = $context === 'report'
            ? [
                'Confirmed by admin report review',
                "Your community \"{$community['name']}\" was banned following a report review.",
            ]
            : [
                "Manually banned by admin — {$customReason}",
                "Your community \"{$community['name']}\" was banned by an admin for \"{$customReason}\".",
            ];

        Database::banLogs()->insertOne([
            'targetType' => 'Community',
            'targetId' => $community['_id'],
            'communitySlug' => $slug,
            'finalRatio' => null,
            'reason' => $reason,
            'bannedBy' => $actorId,
            'createdAt' => new UTCDateTime(),
        ]);

        if (isset($community['creatorId'])) {
            Notifications::create(
                $community['creatorId'],
                'community_banned',
                $message,
                'community',
                $community['_id']
            );
        }

        return true;
    }
}
