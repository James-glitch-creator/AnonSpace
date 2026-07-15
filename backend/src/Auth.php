<?php

namespace App;

use MongoDB\BSON\ObjectId;
use RuntimeException;

final class Auth
{
    private const COOKIE_NAME = 'anonspace_token';

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function issueSession(array $user): string
    {
        $token = Jwt::encode(
            ['sub' => (string) $user['_id']],
            Env::get('JWT_SECRET', ''),
            (int) Env::get('JWT_TTL', '604800')
        );

        setcookie(self::COOKIE_NAME, $token, [
            'expires' => time() + (int) Env::get('JWT_TTL', '604800'),
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (Env::get('APP_ENV', 'development') === 'production'),
        ]);

        return $token;
    }

    public static function clearSession(): void
    {
        setcookie(self::COOKIE_NAME, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /** Returns the authenticated user document, or null if there is no valid session. */
    public static function currentUser(): ?array
    {
        $token = self::tokenFromRequest();
        if ($token === null) {
            return null;
        }

        try {
            $payload = Jwt::decode($token, Env::get('JWT_SECRET', ''));
        } catch (RuntimeException) {
            return null;
        }

        if (!isset($payload['sub'])) {
            return null;
        }

        $user = Database::users()->findOne(['_id' => new ObjectId($payload['sub'])]);
        return $user === null ? null : (array) $user;
    }

    /** Strips sensitive fields and normalizes a user document for API responses. */
    public static function publicUser(array $user): array
    {
        return [
            'id' => (string) $user['_id'],
            'email' => $user['email'],
            'handle' => $user['handle'],
            'role' => $user['role'] ?? 'user',
            'createdAt' => isset($user['createdAt']) ? $user['createdAt']->toDateTime()->format(DATE_ATOM) : null,
        ];
    }

    public static function requireUser(): array
    {
        $user = self::currentUser();
        if ($user === null) {
            Response::error('Not authenticated', 401);
        }

        return $user;
    }

    private static function tokenFromRequest(): ?string
    {
        if (isset($_COOKIE[self::COOKIE_NAME])) {
            return $_COOKIE[self::COOKIE_NAME];
        }

        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return null;
    }
}
