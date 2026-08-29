<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/** Shared by every path that bans a user account: an approved account report, and an
 *  admin banning directly from that account's profile in the admin panel. No-op (returns
 *  false) if it's already banned, doesn't exist, or belongs to an admin/superadmin - that
 *  path is deliberately reserved for RevokeAdmin, run by a superadmin who can see who
 *  they're revoking. */
final class AccountModeration
{
    /**
     * @param 'report'|'manual' $context Which path triggered this, for the log reason and
     *   the account's notification wording.
     * @param string|null $customReason Manual bans only - the reason an admin picked in
     *   the ban dialog.
     */
    public static function ban(ObjectId $userId, string $context, ObjectId $actorId, ?string $customReason = null): bool
    {
        $target = Database::users()->findOne(['_id' => $userId]);
        if ($target === null || ($target['status'] ?? 'active') === 'banned') {
            return false;
        }
        if (($target['role'] ?? 'user') !== 'user') {
            return false;
        }

        Database::users()->updateOne(['_id' => $userId], ['$set' => ['status' => 'banned']]);

        [$reason, $message] = $context === 'report'
            ? ['Confirmed by admin report review', 'Your account has been banned for violating community guidelines.']
            : [
                "Manually banned by admin — {$customReason}",
                "Your account has been banned by an admin for \"{$customReason}\".",
            ];

        Database::banLogs()->insertOne([
            'targetType' => 'User',
            'targetId' => $userId,
            'communitySlug' => null,
            'finalRatio' => null,
            'reason' => $reason,
            'bannedBy' => $actorId,
            'createdAt' => new UTCDateTime(),
        ]);

        Notifications::create($userId, 'account_banned', $message, 'user', $userId);

        return true;
    }
}
