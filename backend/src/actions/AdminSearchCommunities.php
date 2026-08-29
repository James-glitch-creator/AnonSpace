<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;
use MongoDB\BSON\Regex;

/** Admin-only community lookup, for jumping straight to a community's moderation detail
 *  view - mirrors AdminSearchUsers. Unlike the regular community list, this matches by
 *  slug too and includes private communities regardless of the admin's own membership. */
final class AdminSearchCommunities
{
    public static function handle(array $query): never
    {
        Auth::requireAdmin();

        $q = trim((string) ($query['q'] ?? ''));
        if ($q === '') {
            Response::ok(['communities' => []]);
        }

        $regex = new Regex(preg_quote($q, '/'), 'i');
        $results = Database::communities()->find(
            ['$or' => [['name' => $regex], ['slug' => $regex]]],
            [
                'limit' => 20,
                'projection' => ['slug' => 1, 'name' => 1, 'memberCount' => 1, 'visibility' => 1, 'color' => 1],
            ]
        )->toArray();

        Response::ok(['communities' => array_map(fn($c) => [
            'id' => (string) $c['_id'],
            'slug' => $c['slug'],
            'name' => $c['name'],
            'memberCount' => (int) ($c['memberCount'] ?? 0),
            'visibility' => $c['visibility'] ?? 'public',
            'color' => $c['color'] ?? 'bg-slate-500',
        ], $results)]);
    }
}
