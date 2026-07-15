<?php

namespace App\Actions;

use App\Auth;
use App\Chat;
use App\Response;

final class ListChatThreads
{
    public static function handle(): never
    {
        $user = Auth::requireUser();

        $threads = Chat::threads()->find(
            ['participantIds' => $user['_id']],
            ['sort' => ['lastMessageAt' => -1]]
        )->toArray();

        Response::ok([
            'threads' => array_map(fn($t) => Chat::renderThread((array) $t, $user['_id']), $threads),
        ]);
    }
}
