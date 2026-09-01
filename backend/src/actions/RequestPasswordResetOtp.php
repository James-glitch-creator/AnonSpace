<?php

namespace App\Actions;

use App\Database;
use App\Mailer;
use App\Otp;
use App\Response;
use App\Validator;

/** Step 1 of the forgot-password flow - mirrors RequestSignupOtp, but checks the opposite
 *  thing: an account must already exist at this email, not be absent. */
final class RequestPasswordResetOtp
{
    public static function handle(array $body): never
    {
        $email = strtolower(trim((string) ($body['email'] ?? '')));

        if (!Validator::isEmail($email)) {
            Response::error('A valid email address is required', 422);
        }

        if (Database::users()->findOne(['email' => $email]) === null) {
            Response::error('No account found with that email', 404);
        }

        $code = Otp::issue($email);

        if (!Mailer::sendOtp($email, $code)) {
            Response::error('Could not send the verification email. Please try again.', 502);
        }

        Response::ok(['message' => 'Verification code sent']);
    }
}
