<?php

namespace App;

use MongoDB\BSON\ObjectId;

final class Blocking
{
    public static function isBlocked(ObjectId $blockerId, ObjectId $blockedId): bool
    {
        return Database::blockedUsers()->findOne([
            'blockerId' => $blockerId,
            'blockedId' => $blockedId,
        ]) !== null;
    }

    /** True if either user has blocked the other — used to gate messaging both ways. */
    public static function eitherBlocked(ObjectId $userA, ObjectId $userB): bool
    {
        return self::isBlocked($userA, $userB) || self::isBlocked($userB, $userA);
    }

    /** @return string[] user IDs (as strings) this user has blocked */
    public static function blockedIds(ObjectId $blockerId): array
    {
        $rows = Database::blockedUsers()->find(['blockerId' => $blockerId])->toArray();

        return array_map(fn($r) => (string) $r['blockedId'], $rows);
    }
}
