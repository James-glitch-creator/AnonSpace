<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Pagination;
use App\PostView;
use App\Response;
use App\Votes;

final class ListSavedPosts
{
    public static function handle(array $query): never
    {
        $user = Auth::requireUser();
        ['limit' => $limit, 'skip' => $skip, 'page' => $page] = Pagination::fromQuery($query);

        $saves = Database::savedPosts()->find(
            ['userId' => $user['_id']],
            ['sort' => ['createdAt' => -1], 'skip' => $skip, 'limit' => $limit]
        )->toArray();

        $postIds = array_map(fn($s) => $s['postId'], $saves);

        if ($postIds === []) {
            Response::ok(['posts' => [], 'page' => $page]);
        }

        $postFilter = ['_id' => ['$in' => $postIds], 'status' => 'visible'];
        $hiddenSlugs = Communities::hiddenPrivateSlugs($user['_id']);
        if ($hiddenSlugs !== []) {
            $postFilter['communitySlug'] = ['$nin' => $hiddenSlugs];
        }

        $posts = Database::posts()->find($postFilter)->toArray();

        $byId = [];
        foreach ($posts as $p) {
            $byId[(string) $p['_id']] = $p;
        }

        $ordered = array_values(array_filter(
            array_map(fn($id) => $byId[(string) $id] ?? null, $postIds)
        ));

        $voteMap = Votes::mapFor($user['_id'], 'post', $postIds);

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render((array) $p, $voteMap[(string) $p['_id']] ?? null, true),
                $ordered
            ),
            'page' => $page,
        ]);
    }
}
