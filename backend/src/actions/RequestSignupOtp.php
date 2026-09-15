<?php

namespace App\Actions;

use App\Database;
use App\Mailer;
use App\Otp;
use App\Response;
use App\Validator;

final class RequestSignupOtp
{
    public static function handle(array $body): never
    {
        $email = strtolower(trim((string) ($body['email'] ?? '')));

        if (!Validator::isEmail($email)) {
            Response::error('A valid email address is required', 422);
        }

        if (Database::users()->findOne(['email' => $email]) !== null) {
            Response::error('An account with that email already exists', 409);
        }

        $retryAfter = Otp::resendWaitSeconds($email);
        if ($retryAfter > 0) {
            Response::error("Please wait {$retryAfter} seconds before requesting another code.", 429, [
                'retryAfter' => $retryAfter,
            ]);
        }

        $code = Otp::issue($email);

        if (!Mailer::sendOtp($email, $code)) {
            Otp::discard($email);
            Response::error('Could not send the verification email. Please try again.', 502);
        }

        Response::ok(['message' => 'Verification code sent']);
    }
}
