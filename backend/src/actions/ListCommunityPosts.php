<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Pagination;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;
use MongoDB\BSON\Regex;

final class ListCommunityPosts
{
    private const SORTS = ['new', 'old', 'top', 'bottom'];

    public static function handle(string $slug, array $query): never
    {
        $user = Auth::requireUser();

        $community = Database::communities()->findOne(['slug' => $slug]);
        if ($community === null || ($community['status'] ?? 'active') === 'banned') {
            Response::error('Community not found', 404);
        }

        Communities::ensureVisible((array) $community, $user['_id']);

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
        // Used by the community page's "highlights" strip to fetch just the pinned posts,
        // separately from the normal (unfiltered) feed below it.
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
        $voteMap = Votes::mapFor($user['_id'], 'post', $ids);
        $savedMap = SavedPosts::mapFor($user['_id'], $ids);

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
