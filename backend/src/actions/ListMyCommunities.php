<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Response;

final class ListMyCommunities
{
    public static function handle(): never
    {
        $user = Auth::requireUser();
        $memberships = Communities::members()->find(['userId' => $user['_id']])->toArray();
        $communityIds = array_map(fn($m) => $m['communityId'], $memberships);

        if ($communityIds === []) {
            Response::ok(['communities' => []]);
        }

        $communities = Communities::collection()->find(['_id' => ['$in' => $communityIds]])->toArray();

        Response::ok([
            'communities' => array_map(fn($c) => CommunityView::render((array) $c, true), $communities),
        ]);
    }
}
