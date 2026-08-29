<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Response;
use MongoDB\BSON\ObjectId;

final class ListAdminReports
{
    private const TARGET_TYPES = ['Post' => 'post', 'Comment' => 'comment', 'Community' => 'community', 'User' => 'user'];

    public static function handle(): never
    {
        Auth::requireAdmin();

        $reports = Database::reports()->find(
            ['status' => 'pending'],
            ['sort' => ['createdAt' => -1], 'limit' => 100]
        )->toArray();

        Response::ok(['reports' => array_map(fn($report) => self::render((array) $report), $reports)]);
    }

    private static function render(array $report): array
    {
        $targetType = self::TARGET_TYPES[$report['targetType']] ?? strtolower((string) $report['targetType']);
        $targetId = $report['targetId'];

        // postId is only meaningful for comment reports - it's what lets the admin panel
        // link a reported comment to the post thread it actually lives in.
        $preview = null;
        $communitySlug = null;
        $postId = null;

        switch ($targetType) {
            case 'post':
                [$preview, $communitySlug] = self::postPreview($targetId);
                break;
            case 'comment':
                [$preview, $communitySlug, $postId] = self::commentPreview($targetId);
                break;
            case 'community':
                [$preview, $communitySlug] = self::communityPreview($targetId);
                break;
            case 'user':
                $preview = Database::users()->findOne(['_id' => $targetId])['handle'] ?? null;
                break;
        }

        $reporter = Database::users()->findOne(['_id' => $report['reporterId']]);

        return [
            'id' => (string) $report['_id'],
            'targetType' => $targetType,
            'targetId' => (string) $targetId,
            'postId' => $postId,
            'preview' => $preview ?? '(deleted)',
            'communitySlug' => $communitySlug,
            'reason' => $report['reason'],
            'details' => $report['details'] ?? null,
            'reporterHandle' => $reporter['handle'] ?? 'Unknown',
            'createdAt' => $report['createdAt']->toDateTime()->format(DATE_ATOM),
        ];
    }

    /** @return array{0: ?string, 1: ?string} */
    private static function postPreview(ObjectId $id): array
    {
        $post = Database::posts()->findOne(['_id' => $id]);
        if ($post === null) {
            return [null, null];
        }

        return [self::excerpt($post['body'] ?? ''), $post['communitySlug'] ?? null];
    }

    /** @return array{0: ?string, 1: ?string, 2: ?string} [preview, communitySlug, postId] */
    private static function commentPreview(ObjectId $id): array
    {
        $comment = Database::comments()->findOne(['_id' => $id]);
        if ($comment === null) {
            return [null, null, null];
        }

        $post = Database::posts()->findOne(['_id' => $comment['postId']]);

        return [self::excerpt($comment['body'] ?? ''), $post['communitySlug'] ?? null, (string) $comment['postId']];
    }

    /** @return array{0: ?string, 1: ?string} [preview (name), communitySlug (its own slug)] */
    private static function communityPreview(ObjectId $id): array
    {
        $community = Communities::collection()->findOne(['_id' => $id]);
        if ($community === null) {
            return [null, null];
        }

        return [$community['name'] ?? null, $community['slug'] ?? null];
    }

    private static function excerpt(string $body): string
    {
        return mb_strlen($body) > 140 ? mb_substr($body, 0, 140) . '…' : $body;
    }
}
