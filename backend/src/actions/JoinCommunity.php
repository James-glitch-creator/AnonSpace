<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class JoinCommunity
{
    public static function handle(string $slug): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null || ($community['status'] ?? 'active') === 'banned') {
            Response::error('Community not found', 404);
        }

        $existing = Communities::members()->findOne([
            'communityId' => $community['_id'],
            'userId' => $user['_id'],
        ]);

        if ($existing === null) {
            Communities::members()->insertOne([
                'communityId' => $community['_id'],
                'userId' => $user['_id'],
                'joinedAt' => new UTCDateTime(),
            ]);
            Communities::collection()->updateOne(['_id' => $community['_id']], ['$inc' => ['memberCount' => 1]]);
        }

        Response::ok(['isJoined' => true]);
    }
}
