<?php

namespace App;

final class Cors
{
    public static function apply(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;

        if ($origin !== null && self::isAllowedOrigin($origin)) {
            header("Access-Control-Allow-Origin: {$origin}");
            // Tells caches/CDNs the response varies per Origin, so one device's allowed
            // response never gets served back to a different, disallowed origin.
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private static function isAllowedOrigin(string $origin): bool
    {
        $configured = array_filter(array_map(
            'trim',
            explode(',', Env::get('CORS_ORIGIN', 'http://localhost:3000') ?? '')
        ));

        if (in_array($origin, $configured, true)) {
            return true;
        }

        // Outside production, also accept any origin on a private LAN address so the
        // frontend works from phones/tablets on the same network without having to
        // hardcode every device's IP into CORS_ORIGIN (it can change on every DHCP lease).
        if (Env::get('APP_ENV', 'development') === 'production') {
            return false;
        }

        $host = parse_url($origin, PHP_URL_HOST);
        return $host !== null && self::isPrivateLanHost($host);
    }

    private static function isPrivateLanHost(string $host): bool
    {
        if ($host === 'localhost' || $host === '127.0.0.1') {
            return true;
        }

        // RFC 1918 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).
        return (bool) preg_match('/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/', $host);
    }
}
