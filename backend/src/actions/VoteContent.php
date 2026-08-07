<?php

namespace App\Actions;

use App\Auth;
use App\AutoBan;
use App\Communities;
use App\Database;
use App\Ids;
use App\Response;
use App\Votes;

final class VoteContent
{
    /** @param 'post'|'comment' $targetType */
    public static function handle(string $targetType, string $id, array $body): never
    {
        $user = Auth::requireUser();
        $targetId = Ids::parse($id);

        if ($targetId === null) {
            Response::error('Invalid id', 422);
        }

        $direction = $body['direction'] ?? null;
        if (!in_array($direction, ['up', 'down', null], true)) {
            Response::error('direction must be "up", "down", or null', 422);
        }

        $collection = $targetType === 'post' ? Database::posts() : Database::comments();
        $target = $collection->findOne(['_id' => $targetId, 'status' => 'visible']);

        if ($target === null) {
            Response::error('Not found', 404);
        }

        if ($targetType === 'post') {
            Communities::ensurePostVisible((array) $target, $user['_id']);
        }

        if ((string) $target['authorId'] === (string) $user['_id']) {
            Response::error("You can't vote on your own {$targetType}.", 403);
        }

        Votes::cast($user['_id'], $targetType, $targetId, $direction);
        AutoBan::evaluate($targetType, $targetId);

        $updated = $collection->findOne(['_id' => $targetId]);

        Response::ok([
            'upvotes' => (int) $updated['upvotes'],
            'downvotes' => (int) $updated['downvotes'],
            'myVote' => $direction,
            'banned' => ($updated['status'] ?? 'visible') === 'banned',
        ]);
    }
}
