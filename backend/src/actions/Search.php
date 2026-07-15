<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Database;
use App\PostView;
use App\Response;
use App\Votes;
use MongoDB\BSON\Regex;

final class Search
{
    public static function handle(array $query): never
    {
        $user = Auth::requireUser();
        $q = trim((string) ($query['q'] ?? ''));

        if ($q === '') {
            Response::ok(['posts' => [], 'communities' => []]);
        }

        $regex = new Regex(preg_quote($q, '/'), 'i');

        $posts = Database::posts()->find(
            ['status' => 'visible', 'body' => $regex],
            ['sort' => ['createdAt' => -1], 'limit' => 20]
        )->toArray();

        $ids = array_map(fn($p) => $p['_id'], $posts);
        $voteMap = Votes::mapFor($user['_id'], 'post', $ids);

        $communities = Communities::collection()->find(['name' => $regex], ['limit' => 20])->toArray();
        $joinedIds = Communities::joinedIds($user['_id']);

        Response::ok([
            'posts' => array_map(
                fn($p) => PostView::render((array) $p, $voteMap[(string) $p['_id']] ?? null),
                $posts
            ),
            'communities' => array_map(
                fn($c) => CommunityView::render((array) $c, in_array((string) $c['_id'], $joinedIds, true)),
                $communities
            ),
        ]);
    }
}
