<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

final class SavedPosts
{
    /** Toggles the save state and returns the new state. */
    public static function toggle(ObjectId $userId, ObjectId $postId): bool
    {
        $collection = Database::savedPosts();
        $existing = $collection->findOne(['userId' => $userId, 'postId' => $postId]);

        if ($existing !== null) {
            $collection->deleteOne(['_id' => $existing['_id']]);
            return false;
        }

        $collection->insertOne([
            'userId' => $userId,
            'postId' => $postId,
            'createdAt' => new UTCDateTime(),
        ]);

        return true;
    }

    /**
     * @param ObjectId[] $postIds
     * @return array<string, bool> map of postId (string) => true for saved posts
     */
    public static function mapFor(ObjectId $userId, array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        $cursor = Database::savedPosts()->find([
            'userId' => $userId,
            'postId' => ['$in' => $postIds],
        ]);

        $map = [];
        foreach ($cursor as $save) {
            $map[(string) $save['postId']] = true;
        }

        return $map;
    }
}
