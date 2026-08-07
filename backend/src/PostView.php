<?php

namespace App;

final class PostView
{
    public static function render(array $post, ?string $myVote, bool $isSaved): array
    {
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
            'createdAt' => $post['createdAt']->toDateTime()->format(DATE_ATOM),
            'myVote' => $myVote,
            'isSaved' => $isSaved,
        ];
    }
}
