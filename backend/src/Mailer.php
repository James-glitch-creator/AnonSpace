<?php

namespace App;

final class Mailer
{
    public static function sendOtp(string $toEmail, string $code): bool
    {
        $apiKey = Env::get('RESEND_API_KEY', '');
        $fromEmail = Env::get('SMTP_FROM_EMAIL', '');
        $fromName = Env::get('SMTP_FROM_NAME', 'AnonSpace');

        if ($apiKey === '' || $fromEmail === '') {
            error_log('Resend email configuration is missing.');
            return false;
        }

        $payload = json_encode([
            'from' => sprintf('%s <%s>', $fromName, $fromEmail),
            'to' => [$toEmail],
            'subject' => 'Your AnonSpace verification code',
            'html' => '<p>Your verification code is:</p>'
                . '<p style="font-size:24px;font-weight:bold;letter-spacing:4px;">'
                . htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                . '</p><p>This code expires in 10 minutes.</p>',
            'text' => "Your verification code is {$code}. It expires in 10 minutes.",
        ], JSON_THROW_ON_ERROR);

        $handle = curl_init('https://api.resend.com/emails');
        if ($handle === false) {
            error_log('Could not initialize the Resend HTTP request.');
            return false;
        }

        try {
            curl_setopt_array($handle, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $apiKey,
                    'Content-Type: application/json',
                    'User-Agent: AnonSpace/1.0',
                ],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 10,
                CURLOPT_TIMEOUT => 20,
            ]);

            $response = curl_exec($handle);
            $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);

            if ($response === false) {
                error_log('Resend request failed: ' . curl_error($handle));
                return false;
            }

            if ($status < 200 || $status >= 300) {
                error_log("Resend returned HTTP {$status}: {$response}");
                return false;
            }

            return true;
        } catch (\Throwable $exception) {
            error_log('Resend email error: ' . $exception->getMessage());
            return false;
        } finally {
            curl_close($handle);
        }
    }
}
