<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\RandomName;
use App\Response;
use DateTimeImmutable;
use MongoDB\BSON\UTCDateTime;

final class RefreshHandle
{
    /** How often an account may roll a new anonymous name. */
    private const COOLDOWN = '+6 months';

    public static function handle(): never
    {
        $user = Auth::requireUser();
        // Admins use their real name as their handle, not a rotating anonymous one -
        // there's nothing here for them to refresh.
        Auth::assertNotModerator($user, 'refresh their handle');

        $lastChanged = $user['handleChangedAt'] ?? null;
        if ($lastChanged !== null) {
            $nextEligible = $lastChanged->toDateTime()->modify(self::COOLDOWN);
            $now = new DateTimeImmutable();
            if ($now < $nextEligible) {
                Response::error(
                    'You can only refresh your anonymous name once every 6 months.',
                    429,
                    ['nextEligibleAt' => $nextEligible->format(DATE_ATOM)]
                );
            }
        }

        $users = Database::users();
        $newHandle = RandomName::generate($users);
        $now = new UTCDateTime();

        $users->updateOne(
            ['_id' => $user['_id']],
            ['$set' => ['handle' => $newHandle, 'handleChangedAt' => $now]]
        );

        Response::ok([
            'handle' => $newHandle,
            'nextEligibleAt' => $now->toDateTime()->modify(self::COOLDOWN)->format(DATE_ATOM),
        ]);
    }
}
