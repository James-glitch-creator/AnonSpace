<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

final class Votes
{
    /**
     * Casts, changes, or retracts a user's vote and updates the target's counters.
     *
     * @param 'post'|'comment' $targetType
     * @param 'up'|'down'|null $direction
     */
    public static function cast(ObjectId $userId, string $targetType, ObjectId $targetId, ?string $direction): void
    {
        $votes = Database::votes();
        $collection = $targetType === 'post' ? Database::posts() : Database::comments();

        $existing = $votes->findOne([
            'userId' => $userId,
            'targetType' => $targetType,
            'targetId' => $targetId,
        ]);

        $previous = $existing['direction'] ?? null;

        if ($previous === $direction) {
            return;
        }

        $inc = [];

        if ($previous === 'up') {
            $inc['upvotes'] = ($inc['upvotes'] ?? 0) - 1;
        } elseif ($previous === 'down') {
            $inc['downvotes'] = ($inc['downvotes'] ?? 0) - 1;
        }

        if ($direction === 'up') {
            $inc['upvotes'] = ($inc['upvotes'] ?? 0) + 1;
        } elseif ($direction === 'down') {
            $inc['downvotes'] = ($inc['downvotes'] ?? 0) + 1;
        }

        if ($direction === null) {
            if ($existing !== null) {
                $votes->deleteOne(['_id' => $existing['_id']]);
            }
        } elseif ($existing === null) {
            $votes->insertOne([
                'userId' => $userId,
                'targetType' => $targetType,
                'targetId' => $targetId,
                'direction' => $direction,
                'createdAt' => new UTCDateTime(),
            ]);
        } else {
            $votes->updateOne(['_id' => $existing['_id']], ['$set' => ['direction' => $direction]]);
        }

        if ($inc !== []) {
            $collection->updateOne(['_id' => $targetId], ['$inc' => $inc]);
        }
    }

    /**
     * @param 'post'|'comment' $targetType
     * @param ObjectId[] $targetIds
     * @return array<string, string> map of targetId (string) => direction
     */
    public static function mapFor(ObjectId $userId, string $targetType, array $targetIds): array
    {
        if ($targetIds === []) {
            return [];
        }

        $cursor = Database::votes()->find([
            'userId' => $userId,
            'targetType' => $targetType,
            'targetId' => ['$in' => $targetIds],
        ]);

        $map = [];
        foreach ($cursor as $vote) {
            $map[(string) $vote['targetId']] = $vote['direction'];
        }

        return $map;
    }
}
