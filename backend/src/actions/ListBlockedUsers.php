<?php

namespace App\Actions;

use App\Auth;
use App\Blocking;
use App\Response;

final class ListBlockedUsers
{
    public static function handle(): never
    {
        $user = Auth::requireUser();
        Response::ok(['users' => Blocking::listBlocked($user['_id'])]);
    }
}
