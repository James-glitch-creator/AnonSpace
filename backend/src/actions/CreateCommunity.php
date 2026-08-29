<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Response;
use MongoDB\BSON\UTCDateTime;

final class CreateCommunity
{
    private const COLORS = [
        'bg-cyan-500', 'bg-fuchsia-500', 'bg-emerald-500', 'bg-amber-500',
        'bg-purple-500', 'bg-lime-500', 'bg-rose-500', 'bg-sky-500',
    ];

    public static function handle(array $body): never
    {
        $user = Auth::requireUser();

        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 50) {
            Response::error('Community name must be between 1 and 50 characters', 422);
        }

        $topic = trim((string) ($body['topic'] ?? ''));
        if (mb_strlen($topic) > 200) {
            Response::error('Topic must be 200 characters or fewer', 422);
        }

        $visibility = (string) ($body['visibility'] ?? 'public');
        if (!in_array($visibility, ['public', 'private'], true)) {
            Response::error('Visibility must be "public" or "private"', 422);
        }

        $slug = self::slugify($name);
        if ($slug === '') {
            Response::error('Community name must contain at least one letter or number', 422);
        }

        if (Communities::collection()->findOne(['slug' => $slug]) !== null) {
            Response::error('A community with that name already exists', 409);
        }

        $result = Communities::collection()->insertOne([
            'slug' => $slug,
            'name' => $name,
            'topic' => $topic,
            'description' => '',
            'visibility' => $visibility,
            'creatorId' => $user['_id'],
            'creatorHandle' => $user['handle'],
            'memberCount' => 1,
            'color' => self::COLORS[array_rand(self::COLORS)],
            'iconUrl' => null,
            'bannerUrl' => null,
            'rules' => [],
            'createdAt' => new UTCDateTime(),
        ]);

        Communities::members()->insertOne([
            'communityId' => $result->getInsertedId(),
            'userId' => $user['_id'],
            'joinedAt' => new UTCDateTime(),
        ]);

        $community = Communities::collection()->findOne(['_id' => $result->getInsertedId()]);
        Response::ok(['community' => CommunityView::render((array) $community, true, true)], 201);
    }

    private static function slugify(string $name): string
    {
        return preg_replace('/[^a-z0-9]+/', '', strtolower(trim($name))) ?? '';
    }
}
