<?php

namespace App\Actions;

use App\Auth;
use App\Notifications;
use App\Response;

final class MarkAllNotificationsRead
{
    public static function handle(): never
    {
        $user = Auth::requireUser();
        Notifications::markAllRead($user['_id']);
        Response::ok(['read' => true]);
    }
}
