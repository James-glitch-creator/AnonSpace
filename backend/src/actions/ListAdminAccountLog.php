<?php

namespace App\Actions;

use App\AdminAccountLog;
use App\Auth;
use App\Response;

/** Superadmin-only: the grant/revoke history for admin accounts, shown on the Admins page. */
final class ListAdminAccountLog
{
    public static function handle(): never
    {
        Auth::requireSuperAdmin();

        Response::ok(['log' => AdminAccountLog::recent()]);
    }
}
