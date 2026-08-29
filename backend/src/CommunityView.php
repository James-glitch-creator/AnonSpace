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
            'description' => $community['description'] ?? '',
            'visibility' => $community['visibility'] ?? 'public',
            'status' => $community['status'] ?? 'active',
            'memberCount' => (int) $community['memberCount'],
            'color' => $community['color'],
            'iconUrl' => $community['iconUrl'] ?? null,
            'bannerUrl' => $community['bannerUrl'] ?? null,
            'rules' => array_values(array_map(
                fn($rule) => ['title' => $rule['title'] ?? '', 'body' => $rule['body'] ?? ''],
                (array) ($community['rules'] ?? [])
            )),
            // Null for communities created before this field existed (e.g. the seeded
            // "public" community, which has no single owner anyway).
            'creatorHandle' => $community['creatorHandle'] ?? null,
            'createdAt' => isset($community['createdAt'])
                ? $community['createdAt']->toDateTime()->format(DATE_ATOM)
                : null,
            'isJoined' => $isJoined,
            'isOwner' => $isOwner,
        ];
    }
}
