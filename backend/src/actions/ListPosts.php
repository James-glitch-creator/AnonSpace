<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Pagination;
use App\PostView;
use App\Response;
use App\Votes;

final class ListPosts
{
    public static function handle(array $query): never
    {
        $user = Auth::requireUser();
        $sort = ($query['sort'] ?? 'new') === 'top' ? 'top' : 'new';
        ['limit' => $limit, 'skip' => $skip, 'page' => $page] = Pagination::fromQuery($query);

        $filter = ['status' => 'visible'];

        if ($sort === 'top') {
            $cursor = Database::posts()->aggregate([
                ['$match' => $filter],
                ['$addFields' => ['score' => ['$subtract' => ['$upvotes', '$downvotes']]]],
                ['$sort' => ['score' => -1, 'createdAt' => -1]],
                ['$skip' => $skip],
                ['$limit' => $limit],
            ]);
            $posts = iterator_to_array($cursor);
        } else {
            $posts = Database::posts()->find($filter, [
                'sort' => ['createdAt' => -1],
                'skip' => $skip,
                'limit' => $limit,
            ])->toArray();
        }

        $ids = array_map(fn($p) => $p['_id'], $posts);
        $voteMap = Votes::mapFor($user['_id'], 'post', $ids);

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render((array) $p, $voteMap[(string) $p['_id']] ?? null),
                $posts
            ),
            'page' => $page,
        ]);
    }
}
