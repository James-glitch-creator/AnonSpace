<?php

namespace App;

final class PostView
{
    public static function render(array $post, ?string $myVote): array
    {
        return [
            'id' => (string) $post['_id'],
            'communitySlug' => $post['communitySlug'],
            'authorHandle' => $post['authorHandle'],
            'body' => $post['body'],
            'upvotes' => (int) $post['upvotes'],
            'downvotes' => (int) $post['downvotes'],
            'commentCount' => (int) $post['commentCount'],
            'createdAt' => $post['createdAt']->toDateTime()->format(DATE_ATOM),
            'myVote' => $myVote,
        ];
    }
}
