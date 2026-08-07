<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\Response;
use App\SavedPosts;

final class ToggleSavePost
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

        if ((string) $post['authorId'] === (string) $user['_id']) {
            Response::error("You can't save your own post.", 403);
        }

        $isSaved = SavedPosts::toggle($user['_id'], $postId);

        Response::ok(['isSaved' => $isSaved]);
    }
}
