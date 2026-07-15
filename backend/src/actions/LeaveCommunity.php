<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Response;

final class LeaveCommunity
{
    public static function handle(string $slug): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null) {
            Response::error('Community not found', 404);
        }

        $deleted = Communities::members()->deleteOne([
            'communityId' => $community['_id'],
            'userId' => $user['_id'],
        ]);

        if ($deleted->getDeletedCount() > 0) {
            Communities::collection()->updateOne(['_id' => $community['_id']], ['$inc' => ['memberCount' => -1]]);
        }

        Response::ok(['isJoined' => false]);
    }
}
