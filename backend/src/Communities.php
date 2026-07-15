<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class Communities
{
    public static function collection(): Collection
    {
        return Database::communities();
    }

    public static function members(): Collection
    {
        return Database::communityMembers();
    }

    public static function isJoined(ObjectId $userId, ObjectId $communityId): bool
    {
        return self::members()->findOne([
            'userId' => $userId,
            'communityId' => $communityId,
        ]) !== null;
    }

    /** @return string[] community IDs (as strings) the user has joined */
    public static function joinedIds(ObjectId $userId): array
    {
        $rows = self::members()->find(['userId' => $userId])->toArray();

        return array_map(fn($m) => (string) $m['communityId'], $rows);
    }
}
