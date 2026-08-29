<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Response;

final class ListCommunities
{
    public static function handle(): never
    {
        $user = Auth::requireUser();
        $joinedIds = Communities::joinedIds($user['_id']);

        $communities = Communities::collection()->find(
            ['visibility' => ['$ne' => 'private'], 'status' => ['$ne' => 'banned']],
            ['sort' => ['memberCount' => -1]]
        )->toArray();

        Response::ok([
            'communities' => array_map(
                fn($c) => CommunityView::render(
                    (array) $c,
                    in_array((string) $c['_id'], $joinedIds, true),
                    Communities::isCreator($user['_id'], (array) $c)
                ),
                $communities
            ),
        ]);
    }
}
