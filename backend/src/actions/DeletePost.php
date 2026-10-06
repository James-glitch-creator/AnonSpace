<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\PostDeletion;
use App\Response;

final class DeletePost
{
    public static function handle(string $id): never
    {
        $user = Auth::requireUser();
        $postId = Ids::parse($id);

        if ($postId === null) {
            Response::error('Invalid id', 422);
        }

        $post = Database::posts()->findOne(['_id' => $postId]);
        if ($post === null) {
            Response::error('Post not found', 404);
        }

        $isAuthor = (string) $post['authorId'] === (string) $user['_id'];
        $isCommunityAdmin = false;

        if (!$isAuthor) {
            $community = Communities::collection()->findOne(['slug' => $post['communitySlug']]);
            $isCommunityAdmin = $community !== null && Communities::isCreator($user['_id'], (array) $community);
        }

        if (!$isAuthor && !$isCommunityAdmin) {
            Response::error('You can only delete your own posts.', 403);
        }

        if (!$isAuthor) {
            Response::error('Use community moderation to delete a member post with a reason.', 403);
        }

        PostDeletion::delete((array) $post);

        Response::ok(['deleted' => true]);
    }
}
