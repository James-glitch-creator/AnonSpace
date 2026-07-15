<?php

namespace App;

final class Pagination
{
    /** @return array{page:int, limit:int, skip:int} */
    public static function fromQuery(array $query, int $defaultLimit = 20, int $maxLimit = 50): array
    {
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min($maxLimit, max(1, (int) ($query['limit'] ?? $defaultLimit)));

        return ['page' => $page, 'limit' => $limit, 'skip' => ($page - 1) * $limit];
    }
}
