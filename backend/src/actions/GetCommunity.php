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

        // The community itself (name/topic/member count) is visible to anyone who finds
        // it — including via search — even when private. Its posts stay member-only;
        // that's enforced separately by ListCommunityPosts.

        $isJoined = Communities::isJoined($user['_id'], $community['_id']);
        $isOwner = Communities::isCreator($user['_id'], (array) $community);

        Response::ok(['community' => CommunityView::render((array) $community, $isJoined, $isOwner)]);
    }
}
