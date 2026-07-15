<?php

namespace App;

final class CommunityView
{
    public static function render(array $community, bool $isJoined): array
    {
        return [
            'slug' => $community['slug'],
            'name' => $community['name'],
            'memberCount' => (int) $community['memberCount'],
            'color' => $community['color'],
            'isJoined' => $isJoined,
        ];
    }
}
