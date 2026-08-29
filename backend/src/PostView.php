<?php

namespace App;

final class PostView
{
    public static function render(array $post, ?string $myVote, bool $isSaved): array
    {
        $repostOfId = $post['repostOfId'] ?? null;

        return [
            'id' => (string) $post['_id'],
            'communitySlug' => $post['communitySlug'],
            'authorId' => (string) $post['authorId'],
            'authorHandle' => $post['authorHandle'],
            'body' => $post['body'],
            'mediaType' => $post['mediaType'] ?? 'none',
            'mediaUrls' => $post['mediaUrls'] ?? [],
            'videoUrl' => $post['videoUrl'] ?? null,
            'upvotes' => (int) $post['upvotes'],
            'downvotes' => (int) $post['downvotes'],
            'commentCount' => (int) $post['commentCount'],
            'isPinned' => (bool) ($post['isPinned'] ?? false),
            'createdAt' => $post['createdAt']->toDateTime()->format(DATE_ATOM),
            'myVote' => $myVote,
            'isSaved' => $isSaved,
            'isRepost' => $repostOfId !== null,
            // Resolved live rather than a snapshot taken at repost time, so an edit or a
            // later takedown of the original shows up wherever it's been reposted. Null
            // here with isRepost still true means the original is gone (banned/deleted) -
            // the repost itself stays up, just without anything to embed.
            'repostOf' => $repostOfId !== null ? self::renderEmbedded($repostOfId) : null,
        ];
    }

    private static function renderEmbedded(\MongoDB\BSON\ObjectId $originalId): ?array
    {
        $original = Database::posts()->findOne(['_id' => $originalId, 'status' => 'visible']);
        if ($original === null) {
            return null;
        }

        return [
            'id' => (string) $original['_id'],
            'communitySlug' => $original['communitySlug'],
            'authorHandle' => $original['authorHandle'],
            'body' => $original['body'],
            'mediaType' => $original['mediaType'] ?? 'none',
            'mediaUrls' => $original['mediaUrls'] ?? [],
            'videoUrl' => $original['videoUrl'] ?? null,
            'createdAt' => $original['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }
}
