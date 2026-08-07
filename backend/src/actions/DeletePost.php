<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\Response;
use App\Uploads;

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

        $commentIds = array_map(
            fn($c) => $c['_id'],
            Database::comments()->find(['postId' => $postId], ['projection' => ['_id' => 1]])->toArray()
        );

        Database::votes()->deleteMany(['targetType' => 'post', 'targetId' => $postId]);
        if ($commentIds !== []) {
            Database::votes()->deleteMany(['targetType' => 'comment', 'targetId' => ['$in' => $commentIds]]);
        }
        Database::comments()->deleteMany(['postId' => $postId]);
        Database::posts()->deleteOne(['_id' => $postId]);

        foreach ($post['mediaUrls'] ?? [] as $url) {
            Uploads::delete($url);
        }
        if (!empty($post['videoUrl'])) {
            Uploads::delete($post['videoUrl']);
        }

        Response::ok(['deleted' => true]);
    }
}
