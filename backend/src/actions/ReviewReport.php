<?php

namespace App\Actions;

use App\AccountModeration;
use App\Auth;
use App\Communities;
use App\CommunityModeration;
use App\ContentModeration;
use App\Database;
use App\Notifications;
use App\Response;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

final class ReviewReport
{
    private const TARGET_TYPES = ['Post' => 'post', 'Comment' => 'comment', 'Community' => 'community', 'User' => 'user'];

    public static function handle(string $reportId, array $body): never
    {
        $actor = Auth::requireAdmin();

        $reportObjectId = self::parseId($reportId);
        $action = (string) ($body['action'] ?? '');
        if (!in_array($action, ['approve', 'dismiss'], true)) {
            Response::error('action must be "approve" or "dismiss"', 422);
        }

        $report = Database::reports()->findOne(['_id' => $reportObjectId]);
        if ($report === null) {
            Response::error('Report not found', 404);
        }
        if ($report['status'] !== 'pending') {
            Response::error('This report was already reviewed', 409);
        }

        $targetType = self::TARGET_TYPES[$report['targetType']] ?? strtolower((string) $report['targetType']);
        $targetId = $report['targetId'];

        $reviewedAt = new UTCDateTime();

        if ($action === 'approve') {
            self::applyApproval($targetType, $targetId, $actor['_id']);
            Database::reports()->updateOne(['_id' => $reportObjectId], ['$set' => [
                'status' => 'reviewed',
                'reviewedBy' => $actor['_id'],
                'reviewedAt' => $reviewedAt,
            ]]);
            Notifications::create(
                $report['reporterId'],
                'report_approved',
                "Your report was reviewed and confirmed - the {$targetType} was actioned.",
                $targetType,
                $targetId
            );
        } else {
            Database::reports()->updateOne(['_id' => $reportObjectId], ['$set' => [
                'status' => 'dismissed',
                'reviewedBy' => $actor['_id'],
                'reviewedAt' => $reviewedAt,
            ]]);
            Notifications::create(
                $report['reporterId'],
                'report_dismissed',
                "Your report was reviewed - no policy violation was found.",
                $targetType,
                $targetId
            );
        }

        Response::ok(['status' => $action === 'approve' ? 'reviewed' : 'dismissed']);
    }

    /**
     * Bans post/comment content, a reported account, or a reported community, and
     * notifies whoever got banned. Admin/superadmin accounts can never be banned through
     * this path, even if reported - see AccountModeration.
     */
    private static function applyApproval(string $targetType, ObjectId $targetId, ObjectId $actorId): void
    {
        if ($targetType === 'user') {
            AccountModeration::ban($targetId, 'report', $actorId);
            return;
        }

        if ($targetType === 'community') {
            $community = Communities::collection()->findOne(['_id' => $targetId]);
            if ($community !== null) {
                CommunityModeration::ban($community['slug'], 'report', $actorId);
            }
            return;
        }

        if ($targetType !== 'post' && $targetType !== 'comment') {
            return;
        }

        ContentModeration::ban($targetType, $targetId, 'report', $actorId);
    }

    private static function parseId(string $id): ObjectId
    {
        $parsed = \App\Ids::parse($id);
        if ($parsed === null) {
            Response::error('Invalid report id', 422);
        }

        return $parsed;
    }
}
