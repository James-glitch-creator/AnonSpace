<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;

final class ListAdminAccounts
{
    public static function handle(): never
    {
        Auth::requireSuperAdmin();

        // Superadmins aren't listed here - this page is for admin accounts a superadmin
        // registers and can revoke, not a roster of every privileged account.
        $accounts = Database::users()->find(
            ['role' => 'admin'],
            ['sort' => ['createdAt' => -1]]
        )->toArray();

        Response::ok(['accounts' => array_map(fn($u) => Auth::publicUser((array) $u), $accounts)]);
    }
}
