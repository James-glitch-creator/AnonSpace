<?php

namespace App\Actions;

use App\Auth;
use App\PersonalizedFeed;
use App\PostView;
use App\Response;
use App\SavedPosts;
use App\Votes;

final class ListFeed
{
    public static function handle(array $query): never
    {
        $user = Auth::requireUser();
        $page = PersonalizedFeed::page((array) $user, $query);
        $posts = $page['posts'];

        $ids = array_map(fn(array $post) => $post['_id'], $posts);
        $voteMap = Votes::mapFor($user['_id'], 'post', $ids);
        $savedMap = SavedPosts::mapFor($user['_id'], $ids);

        Response::ok([
            'posts' => array_map(
                fn(array $post) => PostView::render(
                    $post,
                    $voteMap[(string) $post['_id']] ?? null,
                    $savedMap[(string) $post['_id']] ?? false
                ),
                $posts
            ),
            'nextCursor' => $page['nextCursor'],
        ]);
    }
}
