<?php

namespace App\Actions;

use App\Auth;
use App\Ids;
use App\Notifications;
use App\Response;

final class MarkNotificationRead
{
    public static function handle(string $notificationId): never
    {
        $user = Auth::requireUser();

        $objectId = Ids::parse($notificationId);
        if ($objectId === null) {
            Response::error('Invalid notification id', 422);
        }

        Notifications::markRead($user['_id'], $objectId);
        Response::ok(['read' => true]);
    }
}
