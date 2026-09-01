<?php

namespace App\Actions;

use App\Database;
use App\Env;
use App\Jwt;
use App\Otp;
use App\Response;
use App\Validator;

/** Step 2 of the forgot-password flow - mirrors VerifySignupOtp: trades a verified code
 *  for a short-lived ticket the frontend then submits with the new password. */
final class VerifyPasswordResetOtp
{
    /** How long the frontend has to submit a new password after OTP verification. */
    private const TICKET_TTL_SECONDS = 600;

    public static function handle(array $body): never
    {
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $code = trim((string) ($body['code'] ?? ''));

        if (!Validator::isEmail($email) || $code === '') {
            Response::error('Email and verification code are required', 422);
        }

        if (Database::users()->findOne(['email' => $email]) === null) {
            Response::error('No account found with that email', 404);
        }

        if (!Otp::verify($email, $code)) {
            Response::error('That code is invalid or has expired', 401);
        }

        $ticket = Jwt::encode(
            ['email' => $email, 'purpose' => 'password-reset'],
            Env::get('JWT_SECRET', ''),
            self::TICKET_TTL_SECONDS
        );

        Response::ok(['ticket' => $ticket]);
    }
}
