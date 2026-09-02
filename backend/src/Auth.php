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
        // 'role' rides along as a routing hint for the frontend proxy only - it can go
        // stale if a role changes mid-session (e.g. an admin gets revoked), but that's
        // harmless: every protected backend action re-checks the live role from the
        // database on every request, never trusting this claim for real authorization.
        $token = Jwt::encode(
            ['sub' => (string) $user['_id'], 'role' => $user['role'] ?? 'user'],
            Env::get('JWT_SECRET', ''),
            (int) Env::get('JWT_TTL', '604800')
        );

        $options = [
            'expires' => time() + (int) Env::get('JWT_TTL', '604800'),
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (Env::get('APP_ENV', 'development') === 'production'),
        ];
        self::addCookieDomain($options);

        setcookie(self::COOKIE_NAME, $token, $options);

        return $token;
    }

    public static function clearSession(): void
    {
        $options = [
            'expires' => time() - 3600,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => (Env::get('APP_ENV', 'development') === 'production'),
        ];
        self::addCookieDomain($options);

        setcookie(self::COOKIE_NAME, '', $options);
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
        if ($user === null) {
            return null;
        }

        // A banned account loses its session the instant this is checked, on every
        // request, everywhere - no need to hunt down each endpoint individually.
        if (($user['status'] ?? 'active') === 'banned') {
            return null;
        }

        return (array) $user;
    }

    /** Strips sensitive fields and normalizes a user document for API responses. */
    public static function publicUser(array $user): array
    {
        return [
            'id' => (string) $user['_id'],
            'email' => $user['email'],
            'handle' => $user['handle'],
            'fullName' => $user['fullName'] ?? null,
            'role' => $user['role'] ?? 'user',
            'createdAt' => isset($user['createdAt']) ? $user['createdAt']->toDateTime()->format(DATE_ATOM) : null,
            'handleChangedAt' => isset($user['handleChangedAt'])
                ? $user['handleChangedAt']->toDateTime()->format(DATE_ATOM)
                : null,
            'mutedNotificationTypes' => array_values((array) ($user['mutedNotificationTypes'] ?? [])),
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

    /** Admin panel access - both admins and superadmins get this. */
    public static function requireAdmin(): array
    {
        $user = self::requireUser();
        $role = $user['role'] ?? 'user';
        if ($role !== 'admin' && $role !== 'superadmin') {
            Response::error('Admin access required', 403);
        }

        return $user;
    }

    /** Managing admin accounts themselves - superadmin only. */
    public static function requireSuperAdmin(): array
    {
        $user = self::requireUser();
        if (($user['role'] ?? 'user') !== 'superadmin') {
            Response::error('Superadmin access required', 403);
        }

        return $user;
    }

    /**
     * Admins and superadmins moderate; they don't participate. Blocks voting,
     * commenting, and messaging so a moderator's account can't be used to engage.
     */
    public static function assertNotModerator(array $user, string $action): void
    {
        if (($user['role'] ?? 'user') !== 'user') {
            Response::error("Admins can't {$action}.", 403);
        }
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

    /**
     * Makes the session available to the Vercel frontend and API only when both use
     * subdomains of the same custom domain, e.g. app.example.com + api.example.com.
     * Leave COOKIE_DOMAIN empty for local development and provider preview URLs.
     */
    private static function addCookieDomain(array &$options): void
    {
        $domain = trim(Env::get('COOKIE_DOMAIN', '') ?? '');
        if ($domain !== '') {
            $options['domain'] = $domain;
        }
    }
}
