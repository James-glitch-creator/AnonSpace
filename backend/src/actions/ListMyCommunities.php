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

        $rendered = array_map(
            fn($c) => CommunityView::render((array) $c, true, Communities::isCreator($user['_id'], (array) $c)),
            $communities
        );

        usort($rendered, fn($a, $b) => ($b['isOwner'] <=> $a['isOwner']));

        Response::ok(['communities' => $rendered]);
    }
}
