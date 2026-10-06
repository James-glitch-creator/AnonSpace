<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Notifications;
use App\PostDeletion;
use App\Response;
use Exception;
use MongoDB\BSON\ObjectId;

final class KickMember
{
    public static function handle(string $slug, string $userId): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null) {
            Response::error('Community not found', 404);
        }

        if (!Communities::isCreator($user['_id'], (array) $community)) {
            Response::error('Only the community creator can manage members', 403);
        }

        if ($userId === (string) $user['_id']) {
            Response::error("You can't kick yourself from your own community", 422);
        }

        try {
            $targetId = new ObjectId($userId);
        } catch (Exception) {
            Response::error('Invalid member id', 422);
        }

        $existing = Communities::members()->findOne([
            'communityId' => $community['_id'],
            'userId' => $targetId,
        ]);

        if ($existing === null) {
            Response::error('That user is not a member of this community', 404);
        }

        $deletedPosts = 0;
        foreach (Database::posts()->find(['communitySlug' => $slug, 'authorId' => $targetId]) as $post) {
            PostDeletion::delete((array) $post);
            $deletedPosts++;
        }

        Communities::members()->deleteOne(['_id' => $existing['_id']]);
        Communities::collection()->updateOne(['_id' => $community['_id']], ['$inc' => ['memberCount' => -1]]);
        Notifications::create(
            $targetId,
            'content_banned',
            "You were removed from c/{$slug}, and {$deletedPosts} of your posts there were deleted."
        );

        Response::ok(['kicked' => true, 'deletedPosts' => $deletedPosts]);
    }
}
