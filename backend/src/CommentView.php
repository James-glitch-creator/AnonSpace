<?php

namespace App;

final class CommentView
{
    public static function render(array $comment, ?string $myVote): array
    {
        return [
            'id' => (string) $comment['_id'],
            'postId' => (string) $comment['postId'],
            'authorHandle' => $comment['authorHandle'],
            'body' => $comment['body'],
            'upvotes' => (int) $comment['upvotes'],
            'downvotes' => (int) $comment['downvotes'],
            'createdAt' => $comment['createdAt']->toDateTime()->format(DATE_ATOM),
            'myVote' => $myVote,
        ];
    }
}
