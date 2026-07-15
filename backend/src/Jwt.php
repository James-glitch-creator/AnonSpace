<?php

namespace App;

use RuntimeException;

final class Jwt
{
    public static function encode(array $payload, string $secret, int $ttlSeconds): string
    {
        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $now = time();
        $payload += ['iat' => $now, 'exp' => $now + $ttlSeconds];

        $segments = [
            self::base64UrlEncode(json_encode($header)),
            self::base64UrlEncode(json_encode($payload)),
        ];

        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * @return array<string, mixed>
     * @throws RuntimeException when the token is malformed, expired, or has a bad signature.
     */
    public static function decode(string $token, string $secret): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new RuntimeException('Malformed token');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $expectedSignature = hash_hmac(
            'sha256',
            "{$encodedHeader}.{$encodedPayload}",
            $secret,
            true
        );

        if (!hash_equals($expectedSignature, self::base64UrlDecode($encodedSignature))) {
            throw new RuntimeException('Invalid signature');
        }

        $payload = json_decode(self::base64UrlDecode($encodedPayload), true);
        if (!is_array($payload)) {
            throw new RuntimeException('Invalid payload');
        }

        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            throw new RuntimeException('Token expired');
        }

        return $payload;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $padded = str_pad($data, strlen($data) + (4 - strlen($data) % 4) % 4, '=');
        return base64_decode(strtr($padded, '-_', '+/'));
    }
}
