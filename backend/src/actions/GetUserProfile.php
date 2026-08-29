<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;

/** Admin-only account lookup - regular users can't search or browse each other's
 *  accounts on an anonymous platform; this is strictly a moderation tool. */
final class GetUserProfile
{
    public static function handle(string $handle): never
    {
        Auth::requireAdmin();

        $target = Database::users()->findOne(['handle' => $handle]);
        if ($target === null) {
            Response::error('Account not found', 404);
        }

        Response::ok(['user' => [
            'id' => (string) $target['_id'],
            'handle' => $target['handle'],
            'role' => $target['role'] ?? 'user',
            'status' => $target['status'] ?? 'active',
            'createdAt' => isset($target['createdAt']) ? $target['createdAt']->toDateTime()->format(DATE_ATOM) : null,
        ]]);
    }
}
