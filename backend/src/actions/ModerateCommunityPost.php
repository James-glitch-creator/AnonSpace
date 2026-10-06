<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Ids;
use App\Notifications;
use App\PostDeletion;
use App\Response;

/** Community owner warnings and removals are separate from platform-wide bans. */
final class ModerateCommunityPost
{
    public static function handle(string $slug, string $postId, array $body): never
    {
        $owner = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);
        if ($community === null) {
            Response::error('Community not found', 404);
        }
        if (!Communities::isCreator($owner['_id'], (array) $community)) {
            Response::error('Only the community creator can moderate its posts', 403);
        }

        $id = Ids::parse($postId);
        if ($id === null) {
            Response::error('Invalid post id', 422);
        }
        $post = Database::posts()->findOne(['_id' => $id, 'communitySlug' => $slug, 'status' => 'visible']);
        if ($post === null) {
            Response::error('Post not found', 404);
        }
        if ((string) $post['authorId'] === (string) $owner['_id']) {
            Response::error('You cannot warn yourself; delete your own post normally', 422);
        }

        $action = (string) ($body['action'] ?? '');
        if (!in_array($action, ['warn', 'delete'], true)) {
            Response::error('Action must be warn or delete', 422);
        }

        $reason = self::resolveReason((array) $community, $body);
        $message = $action === 'warn'
            ? "The owner of c/{$slug} warned you about your post: {$reason}. Your post is still visible."
            : "The owner of c/{$slug} deleted your post: {$reason}.";

        if ($action === 'delete') {
            PostDeletion::delete((array) $post);
        }

        // Reuse the existing moderation notification type because production databases
        // may already have a validator that rejects newly introduced type strings.
        Notifications::create(
            $post['authorId'],
            'content_banned',
            $message,
            $action === 'warn' ? 'post' : null,
            $action === 'warn' ? $id : null
        );

        Response::ok(['action' => $action]);
    }

    private static function resolveReason(array $community, array $body): string
    {
        $reason = trim((string) ($body['reason'] ?? ''));
        $details = trim((string) ($body['details'] ?? ''));
        if (mb_strlen($details) > 500) {
            Response::error('Details must be 500 characters or fewer', 422);
        }

        $label = match ($reason) {
            'off_topic' => 'Off-topic or unrelated post',
            'explicit_content' => 'Explicit content',
            'other' => 'Other',
            default => null,
        };

        if (str_starts_with($reason, 'rule:')) {
            $title = substr($reason, 5);
            foreach ((array) ($community['rules'] ?? []) as $rule) {
                if (($rule['title'] ?? null) === $title && $title !== '') {
                    $label = "Community rule: {$title}";
                    break;
                }
            }
        }

        if ($label === null) {
            Response::error('Select a valid community moderation reason', 422);
        }
        if ($reason === 'other' && $details === '') {
            Response::error('Provide details for Other', 422);
        }

        return $details === '' ? $label : "{$label} - {$details}";
    }
}
