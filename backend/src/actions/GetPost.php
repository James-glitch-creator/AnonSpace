<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;

final class GetPost
{
    public static function handle(string $id): never
    {
        $user = Auth::requireUser();
        $postId = Ids::parse($id);

        if ($postId === null) {
            Response::error('Invalid id', 422);
        }

        $post = Database::posts()->findOne(['_id' => $postId, 'status' => 'visible']);
        if ($post === null) {
            Response::error('Post not found', 404);
        }

        Communities::ensurePostVisible((array) $post, $user['_id']);

        $voteMap = Votes::mapFor($user['_id'], 'post', [$postId]);
        $savedMap = SavedPosts::mapFor($user['_id'], [$postId]);

        Response::ok([
            'post' => PostView::render(
                (array) $post,
                $voteMap[(string) $postId] ?? null,
                $savedMap[(string) $postId] ?? false
            ),
        ]);
    }
}
