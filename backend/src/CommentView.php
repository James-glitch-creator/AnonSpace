<?php

namespace App;

final class CommentView
{
    public static function render(array $comment, ?string $myVote): array
    {
        $isBanned = ($comment['status'] ?? 'visible') === 'banned';

        return [
            'id' => (string) $comment['_id'],
            'postId' => (string) $comment['postId'],
            'parentId' => isset($comment['parentId']) ? (string) $comment['parentId'] : null,
            'authorId' => (string) $comment['authorId'],
            'authorHandle' => $comment['authorHandle'],
            // Never send moderated text back to the client. The document remains only
            // as a tombstone so its parent/reply relationships stay intact.
            'body' => $isBanned ? 'Banned comment' : $comment['body'],
            'isBanned' => $isBanned,
            'upvotes' => (int) $comment['upvotes'],
            'downvotes' => (int) $comment['downvotes'],
            'createdAt' => $comment['createdAt']->toDateTime()->format(DATE_ATOM),
            'myVote' => $isBanned ? null : $myVote,
        ];
    }
}
