<?php

namespace App;

use MongoDB\Collection;

final class RandomName
{
    private const NAMES = [
        'John', 'Alice', 'Bob', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Mia',
        'Lucas', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Amelia', 'James', 'Charlotte',
        'Benjamin', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Jackson', 'Emily',
        'Sebastian', 'Elizabeth', 'Aiden', 'Sofia', 'Matthew', 'Avery', 'Samuel', 'Ella',
        'David', 'Scarlett', 'Joseph', 'Grace', 'Carter', 'Chloe',
    ];

    /** Picks a random first name, appending a number if it's already taken. */
    public static function generate(Collection $users): string
    {
        do {
            $name = self::NAMES[array_rand(self::NAMES)] . random_int(10, 9999);
        } while ($users->findOne(['handle' => $name]) !== null);

        return $name;
    }
}
