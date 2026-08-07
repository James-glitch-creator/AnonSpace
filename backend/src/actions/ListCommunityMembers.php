<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\Database;
use App\Response;

final class ListCommunityMembers
{
    public static function handle(string $slug): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null) {
            Response::error('Community not found', 404);
        }

        if (!Communities::isCreator($user['_id'], (array) $community)) {
            Response::error('Only the community creator can manage members', 403);
        }

        $memberships = Communities::members()->find(['communityId' => $community['_id']])->toArray();
        $userIds = array_map(fn($m) => $m['userId'], $memberships);

        $usersById = [];
        if ($userIds !== []) {
            foreach (Database::users()->find(['_id' => ['$in' => $userIds]]) as $u) {
                $usersById[(string) $u['_id']] = $u;
            }
        }

        $creatorId = (string) $community['creatorId'];

        $members = [];
        foreach ($memberships as $m) {
            $uid = (string) $m['userId'];
            $memberUser = $usersById[$uid] ?? null;
            if ($memberUser === null) {
                continue;
            }

            $members[] = [
                'id' => $uid,
                'handle' => $memberUser['handle'],
                'isOwner' => $uid === $creatorId,
                'joinedAt' => isset($m['joinedAt']) ? $m['joinedAt']->toDateTime()->format(DATE_ATOM) : null,
            ];
        }

        usort($members, fn($a, $b) => ($b['isOwner'] <=> $a['isOwner']));

        Response::ok(['members' => $members]);
    }
}
