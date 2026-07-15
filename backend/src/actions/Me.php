<?php

namespace App\Actions;

use App\Auth;
use App\Response;

final class Me
{
    public static function handle(): never
    {
        $user = Auth::requireUser();
        Response::ok(['user' => Auth::publicUser($user)]);
    }
}
