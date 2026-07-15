<?php

namespace App;

use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;

final class Otp
{
    private const TTL_SECONDS = 600;
    private const MAX_ATTEMPTS = 5;

    public static function collection(): Collection
    {
        return Database::connection()->selectCollection('otp_codes');
    }

    /** Issues a fresh 6-digit code for the email, invalidating any previous one. */
    public static function issue(string $email): string
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        self::collection()->deleteMany(['email' => $email]);
        self::collection()->insertOne([
            'email' => $email,
            'codeHash' => password_hash($code, PASSWORD_BCRYPT),
            'attempts' => 0,
            'expiresAt' => new UTCDateTime((time() + self::TTL_SECONDS) * 1000),
            'createdAt' => new UTCDateTime(),
        ]);

        return $code;
    }

    /** Verifies the code and consumes it on success (or once attempts are exhausted). */
    public static function verify(string $email, string $code): bool
    {
        $record = self::collection()->findOne(['email' => $email]);

        if ($record === null) {
            return false;
        }

        if ($record['expiresAt']->toDateTime()->getTimestamp() < time()) {
            self::collection()->deleteOne(['_id' => $record['_id']]);
            return false;
        }

        if ((int) $record['attempts'] >= self::MAX_ATTEMPTS) {
            self::collection()->deleteOne(['_id' => $record['_id']]);
            return false;
        }

        if (!password_verify($code, $record['codeHash'])) {
            self::collection()->updateOne(['_id' => $record['_id']], ['$inc' => ['attempts' => 1]]);
            return false;
        }

        self::collection()->deleteOne(['_id' => $record['_id']]);
        return true;
    }
}
