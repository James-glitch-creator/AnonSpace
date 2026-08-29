<?php

namespace App;

/** The reason vocabulary shared by user-submitted reports and admin-initiated direct
 *  bans - same list either way, so a ban log always reads in the same terms a report
 *  would have used. */
final class ModerationReasons
{
    public const LIST = [
        'Spam or scam',
        'Harassment or hate speech',
        'Misinformation',
        'Illegal content',
        'Off-topic',
        'Other',
    ];

    /**
     * Validates a {reason, details} request body - same rules SubmitReport enforces - and
     * folds them into the single string ban logs and notifications show. Errors out (never
     * returns) on anything invalid.
     */
    public static function resolve(array $body): string
    {
        $reason = (string) ($body['reason'] ?? '');
        if (!in_array($reason, self::LIST, true)) {
            Response::error('Invalid reason', 422);
        }

        $details = trim((string) ($body['details'] ?? ''));
        if (mb_strlen($details) > 1000) {
            Response::error('Details must be under 1000 characters', 422);
        }
        if ($reason === 'Other' && $details === '') {
            Response::error('Details are required when reason is "Other"', 422);
        }

        return $details !== '' ? "{$reason} — {$details}" : $reason;
    }
}
