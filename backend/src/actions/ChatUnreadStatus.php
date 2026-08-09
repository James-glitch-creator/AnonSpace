<?php

namespace App\Actions;

use App\Auth;
use App\Chat;
use App\Response;

final class ChatUnreadStatus
{
    public static function handle(): never
    {
        $user = Auth::requireUser();

        Response::ok(['hasUnread' => Chat::hasUnread($user['_id'])]);
    }
}
