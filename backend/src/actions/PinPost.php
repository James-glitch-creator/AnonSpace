<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;
use Exception;
use MongoDB\BSON\ObjectId;

/** Owner-only: toggles whether a post shows in the community's "highlights" strip. */
final class PinPost
{
    private const MAX_PINNED = 4;

    public static function handle(string $slug, string $postId): never
    {
        $user = Auth::requireUser();

        $community = Communities::collection()->findOne(['slug' => $slug]);
        if ($community === null) {
            Response::error('Community not found', 404);
        }

        if (!Communities::isCreator($user['_id'], (array) $community)) {
            Response::error('Only the community creator can pin posts', 403);
        }

        try {
            $id = new ObjectId($postId);
        } catch (Exception) {
            Response::error('Invalid post id', 422);
        }

        $post = Database::posts()->findOne(['_id' => $id, 'communitySlug' => $slug]);
        if ($post === null) {
            Response::error('Post not found', 404);
        }

        $nextPinned = !($post['isPinned'] ?? false);

        if ($nextPinned) {
            $pinnedCount = Database::posts()->countDocuments(['communitySlug' => $slug, 'isPinned' => true]);
            if ($pinnedCount >= self::MAX_PINNED) {
                Response::error('You can pin at most ' . self::MAX_PINNED . ' posts', 422);
            }
        }

        Database::posts()->updateOne(['_id' => $id], ['$set' => ['isPinned' => $nextPinned]]);

        $updated = Database::posts()->findOne(['_id' => $id]);
        $voteMap = Votes::mapFor($user['_id'], 'post', [$id]);
        $savedMap = SavedPosts::mapFor($user['_id'], [$id]);

        Response::ok([
            'post' => PostView::render(
                (array) $updated,
                $voteMap[(string) $id] ?? null,
                $savedMap[(string) $id] ?? false
            ),
        ]);
    }
}
