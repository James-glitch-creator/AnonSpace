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

/** Admin-only - unlike ListCommunityPosts, works for private communities regardless of
 *  the admin's own membership (so there's no Communities::ensureVisible check here), and
 *  supports the same search/sort/pinned-only filtering as the regular community page so
 *  the admin view can offer the same controls. Needed to actually review a reported
 *  private community. */
final class AdminListCommunityPosts
{
    private const SORTS = ['new', 'old', 'top', 'bottom'];

    public static function handle(string $slug, array $query): never
    {
        $admin = Auth::requireAdmin();

        $community = Database::communities()->findOne(['slug' => $slug]);
        if ($community === null) {
            Response::error('Community not found', 404);
        }

        $sort = (string) ($query['sort'] ?? 'new');
        if (!in_array($sort, self::SORTS, true)) {
            $sort = 'new';
        }

        $q = trim((string) ($query['q'] ?? ''));

        ['limit' => $limit, 'skip' => $skip] = Pagination::fromQuery($query);

        $filter = ['communitySlug' => $slug, 'status' => 'visible'];
        if ($q !== '') {
            $filter['body'] = new Regex(preg_quote($q, '/'), 'i');
        }
        if ((string) ($query['pinned'] ?? '') === 'true') {
            $filter['isPinned'] = true;
        }

        $sortSpec = match ($sort) {
            'old' => ['createdAt' => 1],
            'top' => ['upvotes' => -1, 'createdAt' => -1],
            'bottom' => ['downvotes' => -1, 'createdAt' => -1],
            default => ['createdAt' => -1],
        };

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
