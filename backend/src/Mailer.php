<?php

namespace App;

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

final class Mailer
{
    public static function sendOtp(string $toEmail, string $code): bool
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = Env::get('SMTP_HOST', 'smtp.gmail.com');
            $mail->SMTPAuth = true;
            $mail->Username = Env::get('SMTP_USERNAME', '');
            $mail->Password = Env::get('SMTP_PASSWORD', '');
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = (int) Env::get('SMTP_PORT', '587');
            $mail->Timeout = 10;
            $mail->SMTPKeepAlive = false;

            $mail->setFrom(
                Env::get('SMTP_FROM_EMAIL', Env::get('SMTP_USERNAME', '')),
                Env::get('SMTP_FROM_NAME', 'AnonSpace')
            );
            $mail->addAddress($toEmail);

            $mail->Subject = 'Your AnonSpace verification code';
            $mail->isHTML(true);
            $mail->Body = "<p>Your verification code is:</p>"
                . "<p style=\"font-size:24px;font-weight:bold;letter-spacing:4px;\">{$code}</p>"
                . "<p>This code expires in 10 minutes.</p>";
            $mail->AltBody = "Your verification code is {$code}. It expires in 10 minutes.";

            $mail->send();
            return true;
        } catch (MailException) {
            return false;
        }
    }
}
