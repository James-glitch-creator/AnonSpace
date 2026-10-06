<?php

namespace App\Actions;

use App\Auth;
use App\AutoBan;
use App\Response;

final class AdminAutoBanSettings
{
    public static function get(): never
    {
        Auth::requireAdmin();
        Response::ok(['settings' => AutoBan::settings()]);
    }

    public static function update(array $body): never
    {
        $actor = Auth::requireSuperAdmin();
        Response::ok(['settings' => AutoBan::updateSettings($body, $actor['_id'])]);
    }
}
