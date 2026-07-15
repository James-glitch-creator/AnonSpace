<?php

namespace App;

final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function ok(array $data = [], int $status = 200): never
    {
        self::json(['success' => true, ...$data], $status);
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        self::json(['success' => false, 'error' => $message, ...$extra], $status);
    }
}
