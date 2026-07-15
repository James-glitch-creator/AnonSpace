<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Response;

final class GetCommunity
{
    public static function handle(string $slug): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null) {
            Response::error('Community not found', 404);
        }

        $isJoined = Communities::isJoined($user['_id'], $community['_id']);

        Response::ok(['community' => CommunityView::render((array) $community, $isJoined)]);
    }
}
