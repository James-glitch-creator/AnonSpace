<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Ids;
use App\Response;

final class DeleteComment
{
    public static function handle(string $id): never
    {
        $user = Auth::requireUser();
        $commentId = Ids::parse($id);

        if ($commentId === null) {
            Response::error('Invalid comment id', 422);
        }

        $comment = Database::comments()->findOne(['_id' => $commentId]);
        if ($comment === null) {
            Response::error('Comment not found', 404);
        }

        if ((string) $comment['authorId'] !== (string) $user['_id']) {
            Response::error('You can only delete your own comments.', 403);
        }

        // Preserve other people's replies by moving them up one level rather than
        // cascading the deletion through content the current user does not own.
        $newParentId = $comment['parentId'] ?? null;
        Database::comments()->updateMany(
            ['parentId' => $commentId],
            ['$set' => ['parentId' => $newParentId]]
        );

        Database::votes()->deleteMany(['targetType' => 'comment', 'targetId' => $commentId]);
        Database::reports()->deleteMany(['targetType' => 'comment', 'targetId' => $commentId]);
        Database::notifications()->deleteMany(['targetType' => 'comment', 'targetId' => $commentId]);
        Database::comments()->deleteOne(['_id' => $commentId]);
        Database::posts()->updateOne(
            ['_id' => $comment['postId'], 'commentCount' => ['$gt' => 0]],
            ['$inc' => ['commentCount' => -1]]
        );

        Response::ok([
            'deleted' => true,
            'parentId' => $newParentId === null ? null : (string) $newParentId,
        ]);
    }
}
