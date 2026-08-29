<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Database;
use App\Response;
use MongoDB\BSON\UTCDateTime;

/** Admin-only - unlike GetCommunity, doesn't hide anything based on the admin's own
 *  membership. Needed to actually review a reported private community. */
final class AdminGetCommunity
{
    public static function handle(string $slug): never
    {
        Auth::requireAdmin();

        $community = Communities::collection()->findOne(['slug' => $slug]);
        if ($community === null) {
            Response::error('Community not found', 404);
        }

        $rendered = CommunityView::render((array) $community, false, false);

        // Communities created before creatorHandle was denormalized onto the document
        // don't have it - fall back to a live lookup so older communities still show one.
        if ($rendered['creatorHandle'] === null && isset($community['creatorId'])) {
            $creator = Database::users()->findOne(['_id' => $community['creatorId']]);
            $rendered['creatorHandle'] = $creator['handle'] ?? null;
        }

        $rendered['stats'] = self::computeStats($slug);

        Response::ok(['community' => $rendered]);
    }

    /** Counts every post ever made here (any status) for the activity/percentage figures -
     *  a banned post still represents something that got posted, not just what's
     *  currently visible. */
    private static function computeStats(string $slug): array
    {
        $posts = Database::posts();
        $filter = ['communitySlug' => $slug];

        $totalPosts = $posts->countDocuments($filter);
        $bannedPosts = $posts->countDocuments($filter + ['status' => 'banned']);

        $now = time();
        $since = fn(int $seconds) => $filter + [
            'createdAt' => ['$gte' => new UTCDateTime(($now - $seconds) * 1000)],
        ];

        return [
            'totalPosts' => $totalPosts,
            'bannedPosts' => $bannedPosts,
            'bannedPercent' => $totalPosts > 0 ? round(($bannedPosts / $totalPosts) * 100, 1) : 0.0,
            'postsLast24h' => $posts->countDocuments($since(24 * 60 * 60)),
            'postsLast7d' => $posts->countDocuments($since(7 * 24 * 60 * 60)),
            'postsLast30d' => $posts->countDocuments($since(30 * 24 * 60 * 60)),
        ];
    }
}
