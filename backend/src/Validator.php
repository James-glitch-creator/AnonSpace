<?php

namespace App;

final class Validator
{
    public static function isEmail(mixed $value): bool
    {
        return is_string($value) && filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function isStrongPassword(mixed $value): bool
    {
        return is_string($value) && strlen($value) >= 8;
    }

    public static function isHandle(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[a-zA-Z0-9_]{3,20}$/', $value) === 1;
    }
}
