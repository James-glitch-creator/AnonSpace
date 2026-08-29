<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;
use MongoDB\BSON\Regex;

/** Admin-only account lookup, for investigating a reported/mentioned account -
 *  distinct from the regular SearchUsers action, which is scoped to "who can I
 *  message" and excludes yourself. This includes everyone, with moderation context. */
final class AdminSearchUsers
{
    public static function handle(array $query): never
    {
        Auth::requireAdmin();

        $q = trim((string) ($query['q'] ?? ''));
        if ($q === '') {
            Response::ok(['users' => []]);
        }

        $regex = new Regex(preg_quote($q, '/'), 'i');
        $results = Database::users()->find(
            ['handle' => $regex],
            ['limit' => 20, 'projection' => ['handle' => 1, 'role' => 1, 'status' => 1]]
        )->toArray();

        Response::ok(['users' => array_map(fn($u) => [
            'id' => (string) $u['_id'],
            'handle' => $u['handle'],
            'role' => $u['role'] ?? 'user',
            'status' => $u['status'] ?? 'active',
        ], $results)]);
    }
}
