<?php

namespace App\Actions;

use App\Auth;
use App\Communities;
use App\CommunityView;
use App\Response;
use App\Uploads;

/** Owner-only editing of a community's about text, rules, icon, and banner. */
final class UpdateCommunity
{
    private const MAX_DESCRIPTION = 500;
    private const MAX_RULES = 10;
    private const MAX_RULE_TITLE = 80;
    private const MAX_RULE_BODY = 300;

    public static function handle(string $slug, array $body, array $files = []): never
    {
        $user = Auth::requireUser();
        $community = Communities::collection()->findOne(['slug' => $slug]);

        if ($community === null) {
            Response::error('Community not found', 404);
        }

        if (!Communities::isCreator($user['_id'], (array) $community)) {
            Response::error('Only the community creator can edit this community', 403);
        }

        $set = [];

        if (array_key_exists('description', $body)) {
            $description = trim((string) $body['description']);
            if (mb_strlen($description) > self::MAX_DESCRIPTION) {
                Response::error('About text must be ' . self::MAX_DESCRIPTION . ' characters or fewer', 422);
            }
            $set['description'] = $description;
        }

        if (array_key_exists('rules', $body)) {
            $set['rules'] = self::parseRules((string) $body['rules']);
        }

        self::applyImage($body, $files, 'icon', 'iconUrl', (array) $community, $set);
        self::applyImage($body, $files, 'banner', 'bannerUrl', (array) $community, $set);

        if ($set !== []) {
            Communities::collection()->updateOne(['_id' => $community['_id']], ['$set' => $set]);
        }

        $updated = Communities::collection()->findOne(['_id' => $community['_id']]);
        Response::ok(['community' => CommunityView::render((array) $updated, true, true)]);
    }

    /** @return array<int, array{title: string, body: string}> */
    private static function parseRules(string $raw): array
    {
        $rules = json_decode($raw, true);
        if (!is_array($rules)) {
            Response::error('Invalid rules payload', 422);
        }

        if (count($rules) > self::MAX_RULES) {
            Response::error('A community can have at most ' . self::MAX_RULES . ' rules', 422);
        }

        $clean = [];
        foreach ($rules as $rule) {
            $title = trim((string) ($rule['title'] ?? ''));
            $ruleBody = trim((string) ($rule['body'] ?? ''));
            if ($title === '') {
                continue;
            }
            if (mb_strlen($title) > self::MAX_RULE_TITLE || mb_strlen($ruleBody) > self::MAX_RULE_BODY) {
                Response::error('Rule text is too long', 422);
            }
            $clean[] = ['title' => $title, 'body' => $ruleBody];
        }

        return $clean;
    }

    /** Handles one of icon/banner: a fresh upload replaces it, a "remove*" flag clears it. */
    private static function applyImage(
        array $body,
        array $files,
        string $fileField,
        string $urlField,
        array $community,
        array &$set
    ): void {
        if (isset($files[$fileField]) && Uploads::hasUpload($files[$fileField])) {
            $urls = Uploads::savePhotos($files[$fileField]);
            if ($urls !== []) {
                if (!empty($community[$urlField])) {
                    Uploads::delete($community[$urlField]);
                }
                $set[$urlField] = $urls[0];
            }
            return;
        }

        $removeFlag = 'remove' . ucfirst($fileField);
        if (!empty($body[$removeFlag])) {
            if (!empty($community[$urlField])) {
                Uploads::delete($community[$urlField]);
            }
            $set[$urlField] = null;
        }
    }
}
