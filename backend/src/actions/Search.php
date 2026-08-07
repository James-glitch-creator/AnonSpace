<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Database;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;
use MongoDB\BSON\Regex;

final class Search
{
    public static function handle(array $query): never
    {
        $user = Auth::requireUser();
        $q = trim((string) ($query['q'] ?? ''));

        if ($q === '') {
            Response::ok(['posts' => [], 'communities' => []]);
        }

        $regex = new Regex(preg_quote($q, '/'), 'i');

        $postFilter = ['status' => 'visible', 'body' => $regex];
        $hiddenSlugs = Communities::hiddenPrivateSlugs($user['_id']);
        if ($hiddenSlugs !== []) {
            $postFilter['communitySlug'] = ['$nin' => $hiddenSlugs];
        }

        $posts = Database::posts()->find(
            $postFilter,
            ['sort' => ['createdAt' => -1], 'limit' => 20]
        )->toArray();

        $ids = array_map(fn($p) => $p['_id'], $posts);
        $voteMap = Votes::mapFor($user['_id'], 'post', $ids);
        $savedMap = SavedPosts::mapFor($user['_id'], $ids);

        // Communities themselves are discoverable by name even when private — only their
        // posts stay member-only. This lets someone find a private community to request
        // to join, without exposing what's actually posted inside it.
        $joinedIds = Communities::joinedIds($user['_id']);
        $communities = Communities::collection()->find(['name' => $regex], ['limit' => 20])->toArray();

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render(
                    (array) $p,
                    $voteMap[(string) $p['_id']] ?? null,
                    $savedMap[(string) $p['_id']] ?? false
                ),
                $posts
            ),
            'communities' => array_map(
                fn($c) => CommunityView::render(
                    (array) $c,
                    in_array((string) $c['_id'], $joinedIds, true),
                    Communities::isCreator($user['_id'], (array) $c)
                ),
                $communities
            ),
        ]);
    }
}
