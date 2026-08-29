<?php

namespace App\Actions;

use App\AccountModeration;
use App\Auth;
use App\CommunityModeration;
use App\ContentModeration;
use App\Ids;
use App\ModerationReasons;
use App\Response;
use MongoDB\BSON\ObjectId;

/** Lets an admin ban a post, comment, account, or community directly - no report needed
 *  first - always with a reason they pick from the same list Report uses. Post/comment
 *  bans run ahead of the automatic downvote-ratio system; account/community bans are
 *  otherwise only reachable by approving a report. */
final class BanTarget
{
    /** @param 'post'|'comment'|'user'|'community' $targetType */
    public static function handle(string $targetType, string $idOrSlug, array $body): never
    {
        $actor = Auth::requireAdmin();
        $reason = ModerationReasons::resolve($body);

        $banned = match ($targetType) {
            'post', 'comment' => self::banContent($targetType, $idOrSlug, $actor['_id'], $reason),
            'user' => self::banAccount($idOrSlug, $actor['_id'], $reason),
            'community' => CommunityModeration::ban($idOrSlug, 'manual', $actor['_id'], $reason),
        };

        if (!$banned) {
            Response::error('Not found, already banned, or cannot be banned this way', 404);
        }

        Response::ok(['banned' => true]);
    }

    private static function banContent(string $targetType, string $id, ObjectId $actorId, string $reason): bool
    {
        $targetId = self::parseId($id);

        return ContentModeration::ban($targetType, $targetId, 'manual', $actorId, $reason);
    }

    private static function banAccount(string $id, ObjectId $actorId, string $reason): bool
    {
        $targetId = self::parseId($id);

        return AccountModeration::ban($targetId, 'manual', $actorId, $reason);
    }

    private static function parseId(string $id): ObjectId
    {
        $parsed = Ids::parse($id);
        if ($parsed === null) {
            Response::error('Invalid id', 422);
        }

        return $parsed;
    }
}
