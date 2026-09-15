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

        $safeCode = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = <<<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AnonSpace verification code</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Use {$safeCode} to continue on AnonSpace. This code expires in 10 minutes.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px;background:#0891b2;text-align:center;">
              <div style="display:inline-block;padding:9px 14px;border-radius:999px;background:rgba(255,255,255,0.16);color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.4px;">AnonSpace</div>
              <p style="margin:12px 0 0;color:#cffafe;font-size:13px;line-height:20px;">A place to speak freely, safely, and anonymously.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 32px 18px;">
              <h1 style="margin:0 0 12px;color:#0f172a;font-size:25px;line-height:32px;text-align:center;">Confirm it&rsquo;s really you</h1>
              <p style="margin:0;color:#64748b;font-size:15px;line-height:24px;text-align:center;">Enter this verification code in AnonSpace to continue:</p>
            </td>
          </tr>
          <tr>
            <td style="padding:4px 32px 24px;">
              <div style="border:1px solid #a5f3fc;border-radius:16px;background:#ecfeff;padding:22px 16px;text-align:center;">
                <p style="margin:0 0 8px;color:#0e7490;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;">Your verification code</p>
                <p style="margin:0;color:#0f172a;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:9px;line-height:44px;">{$safeCode}</p>
                <p style="margin:10px 0 0;color:#0891b2;font-size:12px;line-height:18px;">Expires in 10 minutes</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <div style="border-radius:12px;background:#f8fafc;padding:16px;">
                <p style="margin:0 0 6px;color:#334155;font-size:13px;font-weight:700;">Keep your account secure</p>
                <p style="margin:0;color:#64748b;font-size:13px;line-height:20px;">Never share this code with anyone. AnonSpace staff will never ask you for it. If you did not request this email, you can safely ignore it.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;line-height:18px;">This is an automated security message from AnonSpace.<br>Please do not reply to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;

        $payload = json_encode([
            'from' => sprintf('%s <%s>', $fromName, $fromEmail),
            'to' => [$toEmail],
            'subject' => 'Your AnonSpace verification code',
            'html' => $html,
            'text' => "AnonSpace verification code\n\n"
                . "Your verification code is: {$code}\n\n"
                . "This code expires in 10 minutes. Never share it with anyone. "
                . "AnonSpace staff will never ask you for this code.\n\n"
                . "If you did not request this email, you can safely ignore it.",
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
