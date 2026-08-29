<?php

namespace App\Actions;

use App\Auth;
use App\Database;
use App\Mailer;
use App\Otp;
use App\Response;
use App\Validator;

/** Step 1 of the admin registration flow - superadmin only, mirrors RequestSignupOtp. */
final class RequestAdminSignupOtp
{
    public static function handle(array $body): never
    {
        Auth::requireSuperAdmin();

        $email = strtolower(trim((string) ($body['email'] ?? '')));

        if (!Validator::isEmail($email)) {
            Response::error('A valid email address is required', 422);
        }

        if (Database::users()->findOne(['email' => $email]) !== null) {
            Response::error('An account with that email already exists', 409);
        }

        $code = Otp::issue($email);

        if (!Mailer::sendOtp($email, $code)) {
            Response::error('Could not send the verification email. Please try again.', 502);
        }

        Response::ok(['message' => 'Verification code sent']);
    }
}
