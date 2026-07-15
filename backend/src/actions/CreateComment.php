<?php

namespace App\Actions;

use App\Auth;
use App\CommentView;
use App\Database;
use App\Ids;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class CreateComment
{
    public static function handle(string $postId, array $body): never
    {
        $user = Auth::requireUser();
        $postObjectId = Ids::parse($postId);

        if ($postObjectId === null) {
            Response::error('Invalid post id', 422);
        }

        $post = Database::posts()->findOne(['_id' => $postObjectId, 'status' => 'visible']);
        if ($post === null) {
            Response::error('Post not found', 404);
        }

        $commentBody = trim((string) ($body['body'] ?? ''));
        if ($commentBody === '' || mb_strlen($commentBody) > 2000) {
            Response::error('Comment body must be between 1 and 2000 characters', 422);
        }

        $result = Database::comments()->insertOne([
            'postId' => $postObjectId,
            'authorId' => $user['_id'],
            'authorHandle' => $user['handle'],
            'body' => $commentBody,
            'upvotes' => 0,
            'downvotes' => 0,
            'status' => 'visible',
            'createdAt' => new UTCDateTime(),
        ]);

        Database::posts()->updateOne(['_id' => $postObjectId], ['$inc' => ['commentCount' => 1]]);

        $comment = Database::comments()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['comment' => CommentView::render((array) $comment, null)], 201);
    }
}
