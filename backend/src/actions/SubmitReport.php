<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\ModerationReasons;
use App\Notifications;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class SubmitReport
{
    private const TARGET_LABELS = [
        'post' => 'Post',
        'comment' => 'Comment',
        'community' => 'Community',
        'user' => 'User',
    ];

    public static function handle(array $body): never
    {
        $user = Auth::requireUser();

        $targetType = (string) ($body['targetType'] ?? '');
        if (!isset(self::TARGET_LABELS[$targetType])) {
            Response::error('targetType must be "post", "comment", "community", or "user"', 422);
        }

        $targetId = Ids::parse((string) ($body['targetId'] ?? ''));
        if ($targetId === null) {
            Response::error('Invalid targetId', 422);
        }

        $reason = (string) ($body['reason'] ?? '');
        if (!in_array($reason, ModerationReasons::LIST, true)) {
            Response::error('Invalid reason', 422);
        }

        $details = trim((string) ($body['details'] ?? ''));
        if (mb_strlen($details) > 1000) {
            Response::error('Details must be under 1000 characters', 422);
        }

        $collection = match ($targetType) {
            'post' => Database::posts(),
            'comment' => Database::comments(),
            'community' => Communities::collection(),
            'user' => Database::users(),
        };
        $target = $collection->findOne(['_id' => $targetId]);
        if ($target === null) {
            Response::error('Content not found', 404);
        }

        $ownerId = match ($targetType) {
            'community' => $target['creatorId'] ?? null,
            'user' => $target['_id'],
            default => $target['authorId'],
        };
        if ($ownerId !== null && (string) $ownerId === (string) $user['_id']) {
            $self = $targetType === 'user' ? 'yourself' : "your own {$targetType}";
            Response::error("You can't report {$self}.", 403);
        }

        Database::reports()->insertOne([
            'targetType' => self::TARGET_LABELS[$targetType],
            'targetId' => $targetId,
            'reason' => $reason,
            'details' => $details !== '' ? $details : null,
            'reporterId' => $user['_id'],
            'status' => 'pending',
            'createdAt' => new UTCDateTime(),
        ]);

        // Let the reported account know, without revealing who reported them - keeps
        // the "who reported this" detail out of reach the same way voting already is.
        if ($ownerId !== null) {
            $message = $targetType === 'user'
                ? "Someone reported your account for \"{$reason}\"."
                : "Your {$targetType} was reported for \"{$reason}\".";
            Notifications::create($ownerId, 'reported', $message, $targetType, $targetId);
        }

        Response::ok(['message' => 'Report submitted'], 201);
    }
}
