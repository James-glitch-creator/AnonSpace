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
    /** Fixed account-age interval at which another name refresh becomes available. */
    private const INTERVAL = '+6 months';

    public static function handle(): never
    {
        $user = Auth::requireUser();
        // Admins use their real name as their handle, not a rotating anonymous one -
        // there's nothing here for them to refresh.
        Auth::assertNotModerator($user, 'refresh their handle');

        $now = new DateTimeImmutable();
        [$windowStartedAt, $nextEligible] = self::refreshWindow($user, $now);
        $lastChanged = isset($user['handleChangedAt'])
            ? DateTimeImmutable::createFromInterface($user['handleChangedAt']->toDateTime())
            : null;

        if ($now < $windowStartedAt || ($lastChanged !== null && $lastChanged >= $windowStartedAt)) {
            Response::error(
                'You can refresh your anonymous name once every 6 months after creating your account.',
                429,
                ['nextEligibleAt' => $now < $windowStartedAt
                    ? $windowStartedAt->format(DATE_ATOM)
                    : $nextEligible->format(DATE_ATOM)],
            );
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
            'nextEligibleAt' => $nextEligible->format(DATE_ATOM),
        ]);
    }

    /**
     * Returns the start of the current six-month account-age window and the next one.
     * The schedule stays anchored to account creation rather than drifting when a user
     * waits before using an available refresh.
     *
     * @return array{DateTimeImmutable, DateTimeImmutable}
     */
    private static function refreshWindow(array $user, DateTimeImmutable $now): array
    {
        $createdAt = DateTimeImmutable::createFromInterface($user['createdAt']->toDateTime());
        $windowStartedAt = $createdAt->modify(self::INTERVAL);

        if ($now < $windowStartedAt) {
            return [$windowStartedAt, $windowStartedAt->modify(self::INTERVAL)];
        }

        $intervalNumber = 1;
        $nextEligible = $createdAt->modify('+12 months');
        while ($now >= $nextEligible) {
            $intervalNumber++;
            $windowStartedAt = $nextEligible;
            $nextEligible = $createdAt->modify('+' . (($intervalNumber + 1) * 6) . ' months');
        }

        return [$windowStartedAt, $nextEligible];
    }
}
