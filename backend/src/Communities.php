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

    /** 404s if the community is private and the user hasn't joined it. */
    public static function ensureVisible(array $community, ObjectId $userId): void
    {
        $visibility = $community['visibility'] ?? 'public';
        if ($visibility === 'private' && !self::isJoined($userId, $community['_id'])) {
            Response::error('Community not found', 404);
        }
    }

    public static function isCreator(ObjectId $userId, array $community): bool
    {
        return isset($community['creatorId']) && (string) $community['creatorId'] === (string) $userId;
    }

    /**
     * Slugs of private communities the user has NOT joined — for excluding their posts
     * from feeds/search that span multiple communities.
     *
     * @return string[]
     */
    public static function hiddenPrivateSlugs(ObjectId $userId): array
    {
        $joinedIds = self::joinedIds($userId);
        $privates = self::collection()->find(
            ['visibility' => 'private'],
            ['projection' => ['_id' => 1, 'slug' => 1]]
        )->toArray();

        return array_values(array_map(
            fn($c) => $c['slug'],
            array_filter($privates, fn($c) => !in_array((string) $c['_id'], $joinedIds, true))
        ));
    }

    /** 404s if the post's community is private and the user hasn't joined it. */
    public static function ensurePostVisible(array $post, ObjectId $userId): void
    {
        $community = self::collection()->findOne(['slug' => $post['communitySlug']]);
        if ($community !== null) {
            self::ensureVisible((array) $community, $userId);
        }
    }
}
