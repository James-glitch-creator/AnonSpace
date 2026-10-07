<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Ids;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Uploads;
use App\Votes;
use Throwable;

final class UpdatePost
{
    public static function handle(string $id, array $body, array $files = []): never
    {
        $user = Auth::requireUser();
        $postId = Ids::parse($id);
        if ($postId === null) {
            Response::error('Invalid post id', 422);
        }

        $post = Database::posts()->findOne(['_id' => $postId, 'status' => 'visible']);
        if ($post === null) {
            Response::error('Post not found', 404);
        }
        if ((string) $post['authorId'] !== (string) $user['_id']) {
            Response::error('You can only edit your own posts', 403);
        }

        $text = trim((string) ($body['body'] ?? ''));
        if (($text === '' && ($post['repostOfId'] ?? null) === null) || mb_strlen($text) > 4000) {
            Response::error('Post body must be between 1 and 4000 characters', 422);
        }

        $oldUrls = array_values((array) ($post['mediaUrls'] ?? []));
        $keepUrls = $oldUrls;
        if (array_key_exists('keepPhotoUrls', $body)) {
            $parsed = json_decode((string) $body['keepPhotoUrls'], true);
            if (!is_array($parsed) || !array_is_list($parsed)) {
                Response::error('Invalid photo selection', 422);
            }
            $keepUrls = [];
            foreach ($parsed as $url) {
                if (!is_string($url) || !in_array($url, $oldUrls, true) || in_array($url, $keepUrls, true)) {
                    Response::error('Invalid photo selection', 422);
                }
                $keepUrls[] = $url;
            }
        }

        $newPhotoCount = isset($files['photos']) ? Uploads::photoCount($files['photos']) : 0;
        if (count($keepUrls) + $newPhotoCount > 10) {
            Response::error('A post can include at most 10 photos', 422);
        }
        if (($post['mediaType'] ?? 'none') === 'video' && $newPhotoCount > 0) {
            Response::error('A video post cannot also include photos', 422);
        }
        if (($post['repostOfId'] ?? null) !== null && $newPhotoCount > 0) {
            Response::error('A repost cannot include photos', 422);
        }

        $newUrls = $newPhotoCount > 0 ? Uploads::savePhotos($files['photos']) : [];
        $mediaUrls = array_merge($keepUrls, $newUrls);
        $mediaType = ($post['mediaType'] ?? 'none') === 'video'
            ? 'video'
            : ($mediaUrls === [] ? 'none' : 'photos');

        try {
            $result = Database::posts()->updateOne(
                ['_id' => $postId, 'authorId' => $user['_id'], 'status' => 'visible'],
                ['$set' => ['body' => $text, 'mediaType' => $mediaType, 'mediaUrls' => $mediaUrls]]
            );
            if ($result->getMatchedCount() === 0) {
                foreach ($newUrls as $url) {
                    Uploads::delete($url);
                }
                Response::error('Post is no longer available', 404);
            }
        } catch (Throwable $error) {
            foreach ($newUrls as $url) {
                Uploads::delete($url);
            }
            throw $error;
        }

        foreach (array_diff($oldUrls, $keepUrls) as $url) {
            Uploads::delete($url);
        }

        $updated = Database::posts()->findOne(['_id' => $postId]);
        $voteMap = Votes::mapFor($user['_id'], 'post', [$postId]);
        $savedMap = SavedPosts::mapFor($user['_id'], [$postId]);
        Response::ok(['post' => PostView::render(
            (array) $updated,
            $voteMap[(string) $postId] ?? null,
            $savedMap[(string) $postId] ?? false
        )]);
    }
}
