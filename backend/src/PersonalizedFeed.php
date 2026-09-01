<?php

namespace App;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

/**
 * Builds a lightweight, explainable interest profile from actions the product already
 * stores. This is intentionally a heuristic ranker: it can improve immediately without
 * collecting invasive browsing telemetry or requiring a separate ML service.
 */
final class PersonalizedFeed
{
    /**
     * @return array{posts: array<int, array>, nextCursor: ?string}
     */
    public static function page(array $user, array $query): array
    {
        $limit = min(30, max(1, (int) ($query['limit'] ?? 10)));
        $cursor = self::decodeCursor((string) ($query['cursor'] ?? ''));

        // `snapshot` is frozen for the whole session (first request only) - it's the
        // reference point every post's age/freshness is scored against, so it has to stay
        // put or older posts would keep drifting relative to each other while the user is
        // mid-scroll. `watermark` is the opposite: it moves forward on every single
        // request, right up to "now".
        $snapshotMs = $cursor['snapshot'] ?? (int) floor(microtime(true) * 1000);
        $priorWatermarkMs = $cursor['watermark'] ?? $snapshotMs;
        $watermarkMs = (int) floor(microtime(true) * 1000);
        $cycle = $cursor['cycle'] ?? 0;

        // One cycle is every visible post except private communities the user hasn't
        // joined. Low relevance only changes *where* a post sits in that ranking, never
        // whether it appears. Blocking is a safety exclusion, not a relevance signal.
        $filter = [
            'status' => 'visible',
            'createdAt' => ['$lte' => new UTCDateTime($watermarkMs)],
        ];

        $hiddenSlugs = Communities::hiddenPrivateSlugs($user['_id']);
        if ($hiddenSlugs !== []) {
            $filter['communitySlug'] = ['$nin' => $hiddenSlugs];
        }

        $excludedAuthors = self::excludedAuthorIds($user['_id']);
        if ($excludedAuthors !== []) {
            $filter['authorId'] = ['$nin' => $excludedAuthors];
        }

        $candidates = Database::posts()->find($filter, [
            'sort' => ['createdAt' => -1],
        ])->toArray();

        if ($candidates === []) {
            return ['posts' => [], 'nextCursor' => null];
        }

        ['communities' => $communityAffinity, 'authors' => $authorAffinity] =
            self::buildAffinity($user['_id']);

        $rank = static function (int $forCycle) use (
            $candidates,
            $user,
            $snapshotMs,
            $communityAffinity,
            $authorAffinity
        ): array {
            $ranked = array_map(function ($post) use (
                $user,
                $snapshotMs,
                $forCycle,
                $communityAffinity,
                $authorAffinity
            ): array {
                $post = (array) $post;
                $post['_feedScore'] = self::score(
                    $post,
                    (string) $user['_id'],
                    $snapshotMs,
                    $forCycle,
                    $communityAffinity,
                    $authorAffinity
                );
                return $post;
            }, $candidates);

            usort($ranked, static function (array $a, array $b): int {
                $scoreOrder = $b['_feedScore'] <=> $a['_feedScore'];
                return $scoreOrder !== 0
                    ? $scoreOrder
                    : strcmp((string) $b['_id'], (string) $a['_id']);
            });

            return $ranked;
        };

        $ranked = $rank($cycle);

        // Walk through the ranked cycle from high to low. New posts that match this
        // user's interests are prepended onto the *next* page even if the walk is
        // currently in the low-priority tail - they must not wait until the next cycle.
        // Other new posts just take their ranked slot and do not jump the queue.
        // The walk cursor (score/id) only advances over cycle posts, not injected ones,
        // so a burst of new interest posts cannot skip the rest of the cycle.
        $injected = [];
        $remaining = $ranked;
        $skipIds = is_array($cursor) ? $cursor['skip'] : [];

        if ($cursor !== null) {
            $injected = [];
            $remaining = [];
            foreach ($ranked as $post) {
                $id = (string) $post['_id'];
                $createdMs = $post['createdAt']->toDateTime()->getTimestamp() * 1000;
                $isNew = $createdMs > $priorWatermarkMs;
                if ($isNew && self::matchesInterest($post, $communityAffinity, $authorAffinity)) {
                    $injected[] = $post;
                    $skipIds[$id] = true;
                    continue;
                }

                if (isset($skipIds[$id])) {
                    continue;
                }

                $score = (float) $post['_feedScore'];
                $cursorScore = (float) $cursor['score'];
                if (
                    $score < $cursorScore
                    || (
                        $score === $cursorScore
                        && strcmp($id, (string) $cursor['id']) < 0
                    )
                ) {
                    $remaining[] = $post;
                }
            }

            if ($remaining === [] && $injected === []) {
                $cycle++;
                $skipIds = [];
                $ranked = $rank($cycle);
                $remaining = $ranked;
            }
        }

        $cycleSlots = $injected === [] ? $limit : max(0, $limit - count($injected));
        $cycleWindow = array_slice($remaining, 0, $cycleSlots);
        $posts = array_merge($injected, $cycleWindow);

        $lastCycle = $cycleWindow !== []
            ? $cycleWindow[array_key_last($cycleWindow)]
            : null;
        if ($lastCycle !== null) {
            $walkScore = $lastCycle['_feedScore'];
            $walkId = (string) $lastCycle['_id'];
        } elseif ($cursor !== null) {
            $walkScore = $cursor['score'];
            $walkId = $cursor['id'];
        } else {
            $last = $posts[array_key_last($posts)] ?? null;
            $walkScore = $last['_feedScore'] ?? 0.0;
            $walkId = $last === null ? '' : (string) $last['_id'];
        }

        $nextCursor = $posts === [] ? null : self::encodeCursor([
            'snapshot' => $snapshotMs,
            'watermark' => $watermarkMs,
            'score' => $walkScore,
            'id' => $walkId,
            'cycle' => $cycle,
            'skip' => array_keys($skipIds),
        ]);

        foreach ($posts as &$post) {
            unset($post['_feedScore']);
        }
        unset($post);

        return ['posts' => $posts, 'nextCursor' => $nextCursor];
    }

    /**
     * @return array{communities: array<string, float>, authors: array<string, float>}
     */
    private static function buildAffinity(ObjectId $userId): array
    {
        $communities = [];
        $authors = [];

        $memberships = Database::communityMembers()->find(
            ['userId' => $userId],
            ['projection' => ['communityId' => 1]]
        )->toArray();
        $communityIds = array_map(fn($row) => $row['communityId'], $memberships);
        if ($communityIds !== []) {
            foreach (Database::communities()->find(
                ['_id' => ['$in' => $communityIds]],
                ['projection' => ['slug' => 1]]
            ) as $community) {
                $communities[(string) $community['slug']] =
                    ($communities[(string) $community['slug']] ?? 0.0) + 4.0;
            }
        }

        $votes = Database::votes()->find(
            ['userId' => $userId, 'targetType' => 'post'],
            ['sort' => ['createdAt' => -1], 'limit' => 500]
        )->toArray();
        self::applyPostSignals(
            $votes,
            fn($row) => $row['targetId'],
            fn($row) => ($row['direction'] ?? null) === 'up' ? [3.0, 1.25] : [-4.0, -2.0],
            $communities,
            $authors
        );

        $saves = Database::savedPosts()->find(
            ['userId' => $userId],
            ['sort' => ['createdAt' => -1], 'limit' => 300]
        )->toArray();
        self::applyPostSignals(
            $saves,
            fn($row) => $row['postId'],
            fn() => [4.0, 2.0],
            $communities,
            $authors
        );

        $comments = Database::comments()->find(
            ['authorId' => $userId, 'status' => 'visible'],
            ['sort' => ['createdAt' => -1], 'limit' => 300]
        )->toArray();
        self::applyPostSignals(
            $comments,
            fn($row) => $row['postId'],
            fn() => [2.0, 1.0],
            $communities,
            $authors
        );

        return ['communities' => $communities, 'authors' => $authors];
    }

    /**
     * @param array<int, object|array> $signals
     * @param callable(object|array): ObjectId $postId
     * @param callable(object|array): array{float, float} $weights
     * @param array<string, float> $communities
     * @param array<string, float> $authors
     */
    private static function applyPostSignals(
        array $signals,
        callable $postId,
        callable $weights,
        array &$communities,
        array &$authors
    ): void {
        if ($signals === []) {
            return;
        }

        $ids = array_values(array_unique(
            array_map(fn($row) => (string) $postId($row), $signals)
        ));
        $objectIds = array_map(fn(string $id) => new ObjectId($id), $ids);
        $posts = Database::posts()->find(
            ['_id' => ['$in' => $objectIds]],
            ['projection' => ['communitySlug' => 1, 'authorId' => 1]]
        )->toArray();
        $postMap = [];
        foreach ($posts as $post) {
            $postMap[(string) $post['_id']] = $post;
        }

        foreach ($signals as $signal) {
            $post = $postMap[(string) $postId($signal)] ?? null;
            if ($post === null) {
                continue;
            }
            [$communityWeight, $authorWeight] = $weights($signal);
            $slug = (string) $post['communitySlug'];
            $authorId = (string) $post['authorId'];
            $communities[$slug] = ($communities[$slug] ?? 0.0) + $communityWeight;
            $authors[$authorId] = ($authors[$authorId] ?? 0.0) + $authorWeight;
        }
    }

    /**
     * @param array<string, float> $communityAffinity
     * @param array<string, float> $authorAffinity
     */
    private static function score(
        array $post,
        string $userId,
        int $snapshotMs,
        int $cycle,
        array $communityAffinity,
        array $authorAffinity
    ): float {
        $createdMs = $post['createdAt']->toDateTime()->getTimestamp() * 1000;
        $ageHours = max(0.0, ($snapshotMs - $createdMs) / 3_600_000);

        // A three-day half-life keeps the feed moving while still allowing a strong,
        // relevant post to outlive the purely chronological list.
        $freshness = 10.0 * exp(-log(2) * $ageHours / 72.0);
        $positiveEngagement = max(0, (int) $post['upvotes'] - (int) $post['downvotes'])
            + ((int) $post['commentCount'] * 2);
        $quality = min(8.0, log(1 + $positiveEngagement) * 1.7)
            - min(5.0, log(1 + (int) $post['downvotes']) * 0.8);

        $community = max(-12.0, min(18.0, $communityAffinity[(string) $post['communitySlug']] ?? 0.0));
        $author = max(-6.0, min(10.0, $authorAffinity[(string) $post['authorId']] ?? 0.0));

        // Stable within one cycle: gives new topics a small chance without reshuffling
        // while the user scrolls through the same cursor chain. The cycle rides along in
        // the hash seed so once the feed has looped back to the top (see page() above),
        // re-served posts don't land in the exact same order as last time through - same
        // idea as Facebook/TikTok not replaying an identical scroll on an endless feed.
        // Its amplitude also grows a little each cycle, so a long session gradually
        // loosens up rather than settling into a fixed rotation.
        $hash = sprintf('%u', crc32($userId . ':' . (string) $post['_id'] . ':' . $snapshotMs . ':' . $cycle));
        $amplitude = 1.5 * (1 + min($cycle, 5) * 0.5);
        $exploration = ((int) $hash / 4_294_967_295) * $amplitude;

        return round($community + $author + $freshness + $quality + $exploration, 6);
    }

    /**
     * A post "matches interest" when this user already has a positive signal for its
     * community or author (joined, upvoted, saved, or commented). Those are the posts
     * that jump onto the next page if they appear mid-scroll.
     *
     * @param array<string, float> $communityAffinity
     * @param array<string, float> $authorAffinity
     */
    private static function matchesInterest(
        array $post,
        array $communityAffinity,
        array $authorAffinity
    ): bool {
        $community = $communityAffinity[(string) $post['communitySlug']] ?? 0.0;
        $author = $authorAffinity[(string) $post['authorId']] ?? 0.0;

        return $community > 0.0 || $author > 0.0;
    }

    /** @return ObjectId[] */
    private static function excludedAuthorIds(ObjectId $userId): array
    {
        $rows = Database::blockedUsers()->find([
            '$or' => [
                ['blockerId' => $userId],
                ['blockedId' => $userId],
            ],
        ])->toArray();

        $ids = [];
        foreach ($rows as $row) {
            $other = (string) $row['blockerId'] === (string) $userId
                ? $row['blockedId']
                : $row['blockerId'];
            $ids[(string) $other] = $other;
        }
        return array_values($ids);
    }

    /**
     * @return array{snapshot: int, watermark: int, score: float, id: string, cycle: int, skip: array<string, true>}|null
     */
    private static function decodeCursor(string $cursor): ?array
    {
        if ($cursor === '') {
            return null;
        }

        $padded = strtr($cursor, '-_', '+/');
        $padding = strlen($padded) % 4;
        if ($padding !== 0) {
            $padded .= str_repeat('=', 4 - $padding);
        }
        $decoded = base64_decode($padded, true);
        $data = $decoded === false ? null : json_decode($decoded, true);

        if (
            !is_array($data)
            || !isset($data['snapshot'], $data['score'], $data['id'])
            || !is_numeric($data['snapshot'])
            || !is_numeric($data['score'])
            || !is_string($data['id'])
            || !preg_match('/^[a-f0-9]{24}$/i', $data['id'])
            // Older cursors minted before wraparound shipped have no cycle at all -
            // treat those as cycle 0 rather than rejecting them.
            || (isset($data['cycle']) && !is_numeric($data['cycle']))
            || (isset($data['watermark']) && !is_numeric($data['watermark']))
            || (isset($data['skip']) && !is_array($data['skip']))
        ) {
            Response::error('Invalid feed cursor', 422);
        }

        $snapshot = (int) $data['snapshot'];
        $skip = [];
        foreach (isset($data['skip']) && is_array($data['skip']) ? $data['skip'] : [] as $id) {
            if (!is_string($id) || preg_match('/^[a-f0-9]{24}$/i', $id) !== 1) {
                Response::error('Invalid feed cursor', 422);
            }
            $skip[$id] = true;
        }

        return [
            'snapshot' => $snapshot,
            // Watermark has been encoded for a while, but older cursors may omit it.
            // Falling back to snapshot keeps pagination valid; without a moving watermark
            // every post since the session started would pass the "new since last page"
            // check and reappear on every subsequent load.
            'watermark' => isset($data['watermark']) ? (int) $data['watermark'] : $snapshot,
            'score' => (float) $data['score'],
            'id' => $data['id'],
            'cycle' => isset($data['cycle']) ? max(0, (int) $data['cycle']) : 0,
            'skip' => $skip,
        ];
    }

    /**
     * @param array{snapshot: int, watermark: int, score: float, id: string, cycle: int, skip: list<string>} $data
     */
    private static function encodeCursor(array $data): string
    {
        return rtrim(strtr(base64_encode((string) json_encode($data)), '+/', '-_'), '=');
    }
}
