<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Pagination;
use App\PostView;
use App\Response;
use App\Votes;

final class ListCommunityPosts
{
    public static function handle(string $slug, array $query): never
    {
        $user = Auth::requireUser();

        $community = Database::communities()->findOne(['slug' => $slug]);
        if ($community === null) {
            Response::error('Community not found', 404);
        }

        ['limit' => $limit, 'skip' => $skip] = Pagination::fromQuery($query);

        $posts = Database::posts()->find(
            ['communitySlug' => $slug, 'status' => 'visible'],
            ['sort' => ['createdAt' => -1], 'skip' => $skip, 'limit' => $limit]
        )->toArray();

        $ids = array_map(fn($p) => $p['_id'], $posts);
        $voteMap = Votes::mapFor($user['_id'], 'post', $ids);

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render((array) $p, $voteMap[(string) $p['_id']] ?? null),
                $posts
            ),
        ]);
    }
}
