<?php

namespace App;

final class CommunityView
{
    public static function render(array $community, bool $isJoined, bool $isOwner = false): array
    {
        return [
            'id' => (string) $community['_id'],
            'slug' => $community['slug'],
            'name' => $community['name'],
            'topic' => $community['topic'] ?? '',
            'visibility' => $community['visibility'] ?? 'public',
            'memberCount' => (int) $community['memberCount'],
            'color' => $community['color'],
            'isJoined' => $isJoined,
            'isOwner' => $isOwner,
        ];
    }
}
