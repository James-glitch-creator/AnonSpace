<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\PostView;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class CreatePost
{
    public static function handle(array $body): never
    {
        $user = Auth::requireUser();

        $communitySlug = trim((string) ($body['communitySlug'] ?? ''));
        $postBody = trim((string) ($body['body'] ?? ''));

        if ($communitySlug === '') {
            Response::error('communitySlug is required', 422);
        }

        if ($postBody === '' || mb_strlen($postBody) > 4000) {
            Response::error('Post body must be between 1 and 4000 characters', 422);
        }

        $community = Database::communities()->findOne(['slug' => $communitySlug]);
        if ($community === null) {
            Response::error('Community not found', 404);
        }

        $result = Database::posts()->insertOne([
            'communitySlug' => $communitySlug,
            'authorId' => $user['_id'],
            'authorHandle' => $user['handle'],
            'body' => $postBody,
            'upvotes' => 0,
            'downvotes' => 0,
            'commentCount' => 0,
            'status' => 'visible',
            'createdAt' => new UTCDateTime(),
        ]);

        $post = Database::posts()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['post' => PostView::render((array) $post, null)], 201);
    }
}
