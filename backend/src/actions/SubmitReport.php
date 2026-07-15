<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Ids;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class SubmitReport
{
    private const REASONS = [
        'Spam or scam',
        'Harassment or hate speech',
        'Misinformation',
        'Illegal content',
        'Off-topic',
        'Other',
    ];

    public static function handle(array $body): never
    {
        $user = Auth::requireUser();

        $targetType = (string) ($body['targetType'] ?? '');
        if (!in_array($targetType, ['post', 'comment'], true)) {
            Response::error('targetType must be "post" or "comment"', 422);
        }

        $targetId = Ids::parse((string) ($body['targetId'] ?? ''));
        if ($targetId === null) {
            Response::error('Invalid targetId', 422);
        }

        $reason = (string) ($body['reason'] ?? '');
        if (!in_array($reason, self::REASONS, true)) {
            Response::error('Invalid reason', 422);
        }

        $details = trim((string) ($body['details'] ?? ''));
        if (mb_strlen($details) > 1000) {
            Response::error('Details must be under 1000 characters', 422);
        }

        $collection = $targetType === 'post' ? Database::posts() : Database::comments();
        if ($collection->findOne(['_id' => $targetId]) === null) {
            Response::error('Content not found', 404);
        }

        Database::reports()->insertOne([
            'targetType' => $targetType === 'post' ? 'Post' : 'Comment',
            'targetId' => $targetId,
            'reason' => $reason,
            'details' => $details !== '' ? $details : null,
            'reporterId' => $user['_id'],
            'status' => 'pending',
            'createdAt' => new UTCDateTime(),
        ]);

        Response::ok(['message' => 'Report submitted'], 201);
    }
}
