<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Pagination;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;

/** Admin-only - lets a moderator review everything an account has posted, including
 *  posts in private communities they aren't a member of themselves. */
final class ListUserPosts
{
    public static function handle(string $handle, array $query): never
    {
        $admin = Auth::requireAdmin();
        ['limit' => $limit, 'skip' => $skip, 'page' => $page] = Pagination::fromQuery($query);

        $target = Database::users()->findOne(['handle' => $handle]);
        if ($target === null) {
            Response::error('Account not found', 404);
        }

        $filter = ['authorId' => $target['_id'], 'status' => 'visible'];

        $posts = Database::posts()->find(
            $filter,
            ['sort' => ['createdAt' => -1], 'skip' => $skip, 'limit' => $limit]
        )->toArray();

        $ids = array_map(fn($p) => $p['_id'], $posts);
        $voteMap = Votes::mapFor($admin['_id'], 'post', $ids);
        $savedMap = SavedPosts::mapFor($admin['_id'], $ids);

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render(
                    (array) $p,
                    $voteMap[(string) $p['_id']] ?? null,
                    $savedMap[(string) $p['_id']] ?? false
                ),
                $posts
            ),
            'page' => $page,
        ]);
    }
}
