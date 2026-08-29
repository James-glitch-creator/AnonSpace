<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Pagination;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;
use MongoDB\BSON\Regex;

/** Admin-only browse of every visible post site-wide, latest or most popular, optionally
 *  searched by body text. Unlike the regular feed, isn't scoped to the admin's own
 *  memberships (they have none) or blocked by private communities - moderation needs to
 *  reach everything. */
final class AdminListPosts
{
    private const SORTS = ['new', 'top'];

    public static function handle(array $query): never
    {
        $admin = Auth::requireAdmin();

        $sort = (string) ($query['sort'] ?? 'new');
        if (!in_array($sort, self::SORTS, true)) {
            $sort = 'new';
        }

        $q = trim((string) ($query['q'] ?? ''));

        ['limit' => $limit, 'skip' => $skip] = Pagination::fromQuery($query);

        $filter = ['status' => 'visible'];
        if ($q !== '') {
            $filter['body'] = new Regex(preg_quote($q, '/'), 'i');
        }

        $sortSpec = $sort === 'top' ? ['upvotes' => -1, 'createdAt' => -1] : ['createdAt' => -1];

        $posts = Database::posts()->find(
            $filter,
            ['sort' => $sortSpec, 'skip' => $skip, 'limit' => $limit]
        )->toArray();

        $ids = array_map(fn($p) => $p['_id'], $posts);
        $voteMap = Votes::mapFor($admin['_id'], 'post', $ids);
        $savedMap = SavedPosts::mapFor($admin['_id'], $ids);

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render(
                    (array) $p,
                    $voteMap[(string) $p['_id']] ?? null,
                    $savedMap[(string) $p['_id']] ?? false
                ),
                $posts
            ),
        ]);
    }
}
