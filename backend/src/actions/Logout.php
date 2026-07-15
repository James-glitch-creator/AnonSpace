<?php

namespace App\Actions;

use App\Auth;
use App\Response;

final class Logout
{
    public static function handle(): never
    {
        Auth::clearSession();
        Response::ok();
    }
}
