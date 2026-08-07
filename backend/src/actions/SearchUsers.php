<?php

namespace App\Actions;

use App\Auth;
use App\Blocking;
use App\Database;
use App\Response;
use MongoDB\BSON\Regex;

final class SearchUsers
{
    public static function handle(array $query): never
    {
        $user = Auth::requireUser();
        $q = trim((string) ($query['q'] ?? ''));

        if ($q === '') {
            Response::ok(['users' => []]);
        }

        $regex = new Regex(preg_quote($q, '/'), 'i');
        $results = Database::users()->find(
            ['handle' => $regex, '_id' => ['$ne' => $user['_id']]],
            ['limit' => 20, 'projection' => ['handle' => 1]]
        )->toArray();

        $blockedIds = Blocking::blockedIds($user['_id']);

        Response::ok([
            'users' => array_map(fn($u) => [
                'id' => (string) $u['_id'],
                'handle' => $u['handle'],
                'isBlocked' => in_array((string) $u['_id'], $blockedIds, true),
            ], $results),
        ]);
    }
}
