<?php

namespace App\Actions;

use App\Auth;
use App\CommentView;
use App\Database;
use App\Pagination;
use App\Response;
use App\Votes;

/** Admin-only, same reasoning as ListUserPosts - lets a moderator review everything an
 *  account has commented, not just what it's posted. Returns the same shape the regular
 *  comment thread UI uses, plus a bit of extra context (which post/community), so the
 *  admin panel can render it with the exact same component users see. */
final class ListUserComments
{
    public static function handle(string $handle, array $query): never
    {
        $admin = Auth::requireAdmin();
        ['limit' => $limit, 'skip' => $skip, 'page' => $page] = Pagination::fromQuery($query);

        $target = Database::users()->findOne(['handle' => $handle]);
        if ($target === null) {
            Response::error('Account not found', 404);
        }

        $comments = Database::comments()->find(
            ['authorId' => $target['_id'], 'status' => 'visible'],
            ['sort' => ['createdAt' => -1], 'skip' => $skip, 'limit' => $limit]
        )->toArray();

        $ids = array_map(fn($c) => $c['_id'], $comments);
        $voteMap = Votes::mapFor($admin['_id'], 'comment', $ids);

        Response::ok([
            'comments' => array_map(
                fn($c) => self::render((array) $c, $voteMap[(string) $c['_id']] ?? null),
                $comments
            ),
            'page' => $page,
        ]);
    }

    private static function render(array $comment, ?string $myVote): array
    {
        $post = Database::posts()->findOne(['_id' => $comment['postId']]);

        return [
            ...CommentView::render($comment, $myVote),
            'postPreview' => $post !== null ? self::excerpt($post['body']) : null,
            'communitySlug' => $post['communitySlug'] ?? null,
        ];
    }

    private static function excerpt(string $body): string
    {
        return mb_strlen($body) > 100 ? mb_substr($body, 0, 100) . '…' : $body;
    }
}
