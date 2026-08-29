<?php

namespace App\Actions;

use App\AdminAccountLog;
use App\Auth;
use App\Database;
use App\Ids;
use App\Response;

/** Demotes an admin back to a regular user. Superadmin accounts can't be revoked here. */
final class RevokeAdmin
{
    public static function handle(string $userId): never
    {
        $actor = Auth::requireSuperAdmin();

        $targetId = Ids::parse($userId);
        if ($targetId === null) {
            Response::error('Invalid user id', 422);
        }

        if ((string) $targetId === (string) $actor['_id']) {
            Response::error("You can't revoke your own admin access", 403);
        }

        $target = Database::users()->findOne(['_id' => $targetId]);
        if ($target === null) {
            Response::error('Account not found', 404);
        }

        if (($target['role'] ?? 'user') !== 'admin') {
            Response::error('Only admin accounts can be revoked here', 422);
        }

        Database::users()->updateOne(['_id' => $targetId], ['$set' => ['role' => 'user']]);

        AdminAccountLog::record('revoked', $targetId, $target['handle'], $actor['_id'], $actor['handle']);

        Response::ok(['revoked' => true]);
    }
}
