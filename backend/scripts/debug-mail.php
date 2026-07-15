<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Env;
use PHPMailer\PHPMailer\PHPMailer;

Env::load(__DIR__ . '/../.env');

$to = $argv[1] ?? null;
if ($to === null) {
    fwrite(STDERR, "Usage: php debug-mail.php <recipient-email>\n");
    exit(1);
}

$mail = new PHPMailer(true);
$mail->SMTPDebug = 2;
$mail->Debugoutput = 'echo';
$mail->isSMTP();
$mail->Host = Env::get('SMTP_HOST', 'smtp.gmail.com');
$mail->SMTPAuth = true;
$mail->Username = Env::get('SMTP_USERNAME', '');
$mail->Password = Env::get('SMTP_PASSWORD', '');
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$mail->Port = (int) Env::get('SMTP_PORT', '587');
$mail->Timeout = 15;

$mail->setFrom(Env::get('SMTP_FROM_EMAIL', ''), Env::get('SMTP_FROM_NAME', 'AnonSpace'));
$mail->addAddress($to);
$mail->Subject = 'AnonSpace debug test';
$mail->Body = 'This is a plain debug test email.';

try {
    $mail->send();
    echo "\nRESULT: sent successfully\n";
} catch (\Throwable $e) {
    echo "\nRESULT: FAILED - {$e->getMessage()}\n";
}
