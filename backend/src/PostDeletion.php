<?php

namespace App;

/** Removes a post and its dependent records, regardless of who initiated deletion. */
final class PostDeletion
{
    public static function delete(array $post): void
    {
        $postId = $post['_id'];
        $commentIds = array_map(
            fn($comment) => $comment['_id'],
            Database::comments()->find(['postId' => $postId], ['projection' => ['_id' => 1]])->toArray()
        );

        Database::votes()->deleteMany(['targetType' => 'post', 'targetId' => $postId]);
        Database::reports()->deleteMany(['targetType' => 'Post', 'targetId' => $postId]);
        Database::notifications()->deleteMany(['targetType' => 'post', 'targetId' => $postId]);
        Database::savedPosts()->deleteMany(['postId' => $postId]);

        if ($commentIds !== []) {
            Database::votes()->deleteMany(['targetType' => 'comment', 'targetId' => ['$in' => $commentIds]]);
            Database::reports()->deleteMany(['targetType' => 'Comment', 'targetId' => ['$in' => $commentIds]]);
            Database::notifications()->deleteMany(['targetType' => 'comment', 'targetId' => ['$in' => $commentIds]]);
        }
        Database::comments()->deleteMany(['postId' => $postId]);
        Database::posts()->deleteOne(['_id' => $postId]);

        foreach ($post['mediaUrls'] ?? [] as $url) {
            Uploads::delete($url);
        }
        if (!empty($post['videoUrl'])) {
            Uploads::delete($post['videoUrl']);
        }
    }
}
