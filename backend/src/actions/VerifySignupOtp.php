<?php

namespace App\Actions;

use App\Database;
use App\Env;
use App\Jwt;
use App\Otp;
use App\Response;
use App\Validator;

final class VerifySignupOtp
{
    /** How long the frontend has to submit a password after OTP verification. */
    private const TICKET_TTL_SECONDS = 600;

    public static function handle(array $body): never
    {
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $code = trim((string) ($body['code'] ?? ''));

        if (!Validator::isEmail($email) || $code === '') {
            Response::error('Email and verification code are required', 422);
        }

        if (Database::users()->findOne(['email' => $email]) !== null) {
            Response::error('An account with that email already exists', 409);
        }

        if (!Otp::verify($email, $code)) {
            Response::error('That code is invalid or has expired', 401);
        }

        $ticket = Jwt::encode(
            ['email' => $email, 'purpose' => 'signup'],
            Env::get('JWT_SECRET', ''),
            self::TICKET_TTL_SECONDS
        );

        Response::ok(['ticket' => $ticket]);
    }
}
