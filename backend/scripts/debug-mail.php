<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Env;
use App\Mailer;

Env::load(__DIR__ . '/../.env');

$to = $argv[1] ?? null;
if ($to === null) {
    fwrite(STDERR, "Usage: php debug-mail.php <recipient-email>\n");
    exit(1);
}

if (Mailer::sendOtp($to, '123456')) {
    echo "\nRESULT: sent successfully\n";
    exit(0);
}

echo "\nRESULT: FAILED - check the application logs for the Resend response\n";
exit(1);
