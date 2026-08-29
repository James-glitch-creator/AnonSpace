<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Response;

final class UpdateNotificationPreferences
{
    private const TYPES = ['reported', 'content_banned', 'report_approved', 'report_dismissed'];

    public static function handle(array $body): never
    {
        $user = Auth::requireUser();

        $muted = $body['mutedTypes'] ?? [];
        if (!is_array($muted)) {
            Response::error('mutedTypes must be an array', 422);
        }

        foreach ($muted as $type) {
            if (!is_string($type) || !in_array($type, self::TYPES, true)) {
                Response::error('Invalid notification type', 422);
            }
        }

        $muted = array_values(array_unique($muted));

        Database::users()->updateOne(
            ['_id' => $user['_id']],
            ['$set' => ['mutedNotificationTypes' => $muted]]
        );

        Response::ok(['mutedTypes' => $muted]);
    }
}
