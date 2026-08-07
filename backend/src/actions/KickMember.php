<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Response;
use Exception;
use MongoDB\BSON\ObjectId;

final class KickMember
{
    public static function handle(string $slug, string $userId): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null) {
            Response::error('Community not found', 404);
        }

        if (!Communities::isCreator($user['_id'], (array) $community)) {
            Response::error('Only the community creator can manage members', 403);
        }

        if ($userId === (string) $user['_id']) {
            Response::error("You can't kick yourself from your own community", 422);
        }

        try {
            $targetId = new ObjectId($userId);
        } catch (Exception) {
            Response::error('Invalid member id', 422);
        }

        $existing = Communities::members()->findOne([
            'communityId' => $community['_id'],
            'userId' => $targetId,
        ]);

        if ($existing === null) {
            Response::error('That user is not a member of this community', 404);
        }

        Communities::members()->deleteOne(['_id' => $existing['_id']]);
        Communities::collection()->updateOne(['_id' => $community['_id']], ['$inc' => ['memberCount' => -1]]);

        Response::ok(['kicked' => true]);
    }
}
