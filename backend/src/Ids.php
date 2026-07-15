<?php

namespace App;

use MongoDB\BSON\ObjectId;
use Throwable;

final class Ids
{
    public static function parse(string $id): ?ObjectId
    {
        try {
            return new ObjectId($id);
        } catch (Throwable) {
            return null;
        }
    }
}
