<?php

namespace App\Actions;

use App\AdminActionsFeed;
use App\Auth;
use App\AutoBan;
use App\Database;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class AdminOverview
{
    /** How far below the auto-ban threshold still counts as "near the line". */
    private const NEAR_MARGIN = 0.10;

    private const RANGES = ['today', '7d', '30d'];

    public static function handle(array $query): never
    {
        Auth::requireAdmin();

        $range = (string) ($query['range'] ?? 'today');
        if (!in_array($range, self::RANGES, true)) {
            $range = 'today';
        }
        $since = self::rangeStart($range);

        // "Registered accounts" is a count of regular users, not staff - admins/superadmins
        // aren't accounts the platform is signing people up for. A missing role still means
        // 'user' (see Auth::requireUser and friends), and $nin matches that missing field too.
        $regularUser = ['role' => ['$nin' => ['admin', 'superadmin']]];

        Response::ok([
            'stats' => [
                'accountCount' => Database::users()->countDocuments($regularUser),
                'newAccounts' => Database::users()->countDocuments(
                    $regularUser + ['createdAt' => ['$gte' => $since]]
                ),
                'newContent' => Database::posts()->countDocuments(['createdAt' => ['$gte' => $since]])
                    + Database::comments()->countDocuments(['createdAt' => ['$gte' => $since]]),
                'autoBans' => Database::banLogs()->countDocuments([
                    'bannedBy' => null,
                    'createdAt' => ['$gte' => $since],
                ]),
                'pendingReports' => Database::reports()->countDocuments(['status' => 'pending']),
                'nearThresholdCount' => self::nearThresholdCount('post') + self::nearThresholdCount('comment'),
                'activeCommunities' => Database::communities()->countDocuments([]),
            ],
            'range' => $range,
            'adminActions' => AdminActionsFeed::forAdmin(null),
        ]);
    }

    /** 'today' is the calendar day so far (midnight UTC); '7d'/'30d' are rolling windows
     *  from right now, matching the Reports page's own range picker. */
    private static function rangeStart(string $range): UTCDateTime
    {
        return match ($range) {
            '7d' => new UTCDateTime((time() - 7 * 24 * 60 * 60) * 1000),
            '30d' => new UTCDateTime((time() - 30 * 24 * 60 * 60) * 1000),
            default => new UTCDateTime(strtotime('today UTC') * 1000),
        };
    }

    /**
     * Count of visible posts/comments with enough votes to be evaluated, sitting between
     * (threshold - margin) and the threshold itself - not yet auto-banned, but close.
     *
     * @param 'post'|'comment' $targetType
     */
    private static function nearThresholdCount(string $targetType): int
    {
        $collection = $targetType === 'post' ? Database::posts() : Database::comments();

        return $collection->countDocuments([
            'status' => 'visible',
            '$expr' => [
                '$and' => [
                    ['$gte' => [['$add' => ['$upvotes', '$downvotes']], AutoBan::MIN_VOTES]],
                    [
                        '$gte' => [
                            ['$divide' => ['$downvotes', ['$add' => ['$upvotes', '$downvotes']]]],
                            AutoBan::THRESHOLD - self::NEAR_MARGIN,
                        ],
                    ],
                    [
                        '$lt' => [
                            ['$divide' => ['$downvotes', ['$add' => ['$upvotes', '$downvotes']]]],
                            AutoBan::THRESHOLD,
                        ],
                    ],
                ],
            ],
        ]);
    }
}
