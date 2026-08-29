<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Env;
use App\Jwt;
use App\Otp;
use App\Response;
use App\Validator;

/** Step 2 of the admin registration flow - superadmin only, mirrors VerifySignupOtp. */
final class VerifyAdminSignupOtp
{
    /** How long the frontend has to submit the new admin's details after OTP verification. */
    private const TICKET_TTL_SECONDS = 600;

    public static function handle(array $body): never
    {
        Auth::requireSuperAdmin();

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

        // Distinct purpose from the regular signup ticket, so this can only ever complete
        // through CompleteAdminSignup (role: admin), never the public CompleteSignup.
        $ticket = Jwt::encode(
            ['email' => $email, 'purpose' => 'admin-signup'],
            Env::get('JWT_SECRET', ''),
            self::TICKET_TTL_SECONDS
        );

        Response::ok(['ticket' => $ticket]);
    }
}
