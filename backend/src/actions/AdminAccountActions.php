<?php

namespace App\Actions;

use App\AdminActionsFeed;
use App\Auth;
use App\Database;
use App\Ids;
use App\Response;

/** Superadmin-only: one admin's ban/dismissal history, for the page a superadmin lands
 *  on after tapping that admin's name on the Admins page. */
final class AdminAccountActions
{
    public static function handle(string $id): never
    {
        Auth::requireSuperAdmin();

        $targetId = Ids::parse($id);
        if ($targetId === null) {
            Response::error('Invalid admin id', 422);
        }

        $admin = Database::users()->findOne(['_id' => $targetId]);
        if ($admin === null || !in_array($admin['role'] ?? 'user', ['admin', 'superadmin'], true)) {
            Response::error('Admin not found', 404);
        }

        Response::ok([
            'admin' => Auth::publicUser((array) $admin),
            'actions' => AdminActionsFeed::forAdmin($targetId),
        ]);
    }
}
