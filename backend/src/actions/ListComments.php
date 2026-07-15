<?php

namespace App\Actions;

use App\Auth;
use App\CommentView;
use App\Database;
use App\Ids;
use App\Pagination;
use App\Response;
use App\Votes;

final class ListComments
{
    public static function handle(string $postId, array $query): never
    {
        $user = Auth::requireUser();
        $postObjectId = Ids::parse($postId);

        if ($postObjectId === null) {
            Response::error('Invalid post id', 422);
        }

        ['limit' => $limit, 'skip' => $skip] = Pagination::fromQuery($query, 50, 100);

        $comments = Database::comments()->find(
            ['postId' => $postObjectId, 'status' => 'visible'],
            ['sort' => ['createdAt' => 1], 'skip' => $skip, 'limit' => $limit]
        )->toArray();

        $ids = array_map(fn($c) => $c['_id'], $comments);
        $voteMap = Votes::mapFor($user['_id'], 'comment', $ids);

        Response::ok([
            'comments' => array_map(
                fn($c) => CommentView::render((array) $c, $voteMap[(string) $c['_id']] ?? null),
                $comments
            ),
        ]);
    }
}
