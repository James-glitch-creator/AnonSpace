<?php

namespace App\Actions;

use App\Auth;
use App\Notifications;
use App\Response;

final class ListNotifications
{
    public static function handle(): never
    {
        $user = Auth::requireUser();

        Response::ok([
            'notifications' => Notifications::listForUser($user['_id']),
            'unreadCount' => Notifications::unreadCount($user['_id']),
        ]);
    }
}
