<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\PostView;
use App\Response;
use App\Uploads;
use MongoDB\BSON\UTCDateTime;

final class CreatePost
{
    public static function handle(array $body, array $files = []): never
    {
        $user = Auth::requireUser();

        $communitySlug = trim((string) ($body['communitySlug'] ?? ''));
        $postBody = trim((string) ($body['body'] ?? ''));
        $repostOfRaw = trim((string) ($body['repostOfId'] ?? ''));

        if ($communitySlug === '') {
            Response::error('communitySlug is required', 422);
        }

        $repostOfId = null;
        if ($repostOfRaw !== '') {
            $repostOfId = Ids::parse($repostOfRaw);
            if ($repostOfId === null) {
                Response::error('Invalid repostOfId', 422);
            }
            $original = Database::posts()->findOne(['_id' => $repostOfId, 'status' => 'visible']);
            if ($original === null) {
                Response::error('Original post not found', 404);
            }
            // Can't reshare content you can't see yourself (also blocks probing a private
            // community's posts by id).
            Communities::ensurePostVisible((array) $original, $user['_id']);
            // No nested reposts - always attach to the primary post. The client already
            // sends the primary's id, but this is enforced here too rather than trusted,
            // since it's a data-integrity rule (nothing should ever point at a repost)
            // and not just a UI nicety.
            $depth = 0;
            while (isset($original['repostOfId']) && $depth < 5) {
                $primary = Database::posts()->findOne(['_id' => $original['repostOfId'], 'status' => 'visible']);
                if ($primary === null) {
                    break;
                }
                $original = $primary;
                $depth++;
            }
            $repostOfId = $original['_id'];

            // A private community's posts stay inside that community - reposting must not
            // become a way to publish them to the public feed or leak them into another
            // community the original audience never opted into.
            $originalCommunity = Database::communities()->findOne(['slug' => $original['communitySlug']]);
            $originalIsPrivate = $originalCommunity !== null && ($originalCommunity['visibility'] ?? 'public') === 'private';
            if ($originalIsPrivate && $communitySlug !== $original['communitySlug']) {
                Response::error('Posts from a private community can only be reposted within that community', 403);
            }
        }

        // A repost's own caption is optional - resharing needs nothing more than picking
        // where it goes - but a regular post still needs actual content.
        if ($postBody === '' && $repostOfId === null) {
            Response::error('Post body must be between 1 and 4000 characters', 422);
        }
        if (mb_strlen($postBody) > 4000) {
            Response::error('Post body must be between 1 and 4000 characters', 422);
        }

        $community = Database::communities()->findOne(['slug' => $communitySlug]);
        if ($community === null || ($community['status'] ?? 'active') === 'banned') {
            Response::error('Community not found', 404);
        }

        $hasPhotos = isset($files['photos']) && Uploads::hasUpload($files['photos']);
        $hasVideo = isset($files['video']) && Uploads::hasUpload($files['video']);

        if ($hasPhotos && $hasVideo) {
            Response::error('A post can include photos or a video, not both.', 422);
        }

        $mediaType = 'none';
        $mediaUrls = [];
        $videoUrl = null;

        if ($hasPhotos) {
            $mediaUrls = Uploads::savePhotos($files['photos']);
            $mediaType = 'photos';
        } elseif ($hasVideo) {
            $videoUrl = Uploads::saveVideo($files['video']);
            $mediaType = 'video';
        }

        $result = Database::posts()->insertOne([
            'communitySlug' => $communitySlug,
            'authorId' => $user['_id'],
            'authorHandle' => $user['handle'],
            'body' => $postBody,
            'mediaType' => $mediaType,
            'mediaUrls' => $mediaUrls,
            'videoUrl' => $videoUrl,
            'upvotes' => 0,
            'downvotes' => 0,
            'commentCount' => 0,
            'status' => 'visible',
            'repostOfId' => $repostOfId,
            'createdAt' => new UTCDateTime(),
        ]);

        $post = Database::posts()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['post' => PostView::render((array) $post, null, false)], 201);
    }
}
