<?php

namespace App;

use MongoDB\Client;
use MongoDB\Database as MongoDatabase;

final class Database
{
    private static ?MongoDatabase $database = null;

    public static function connection(): MongoDatabase
    {
        if (self::$database === null) {
            $client = new Client(Env::get('MONGODB_URI', 'mongodb://127.0.0.1:27017'));
            self::$database = $client->selectDatabase(Env::get('MONGODB_DB', 'anonspace'));
        }

        return self::$database;
    }

    public static function users(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('users');
    }

    public static function posts(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('posts');
    }

    public static function comments(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('comments');
    }

    public static function votes(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('votes');
    }

    public static function communities(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('communities');
    }

    public static function communityMembers(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('community_members');
    }

    public static function chatThreads(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('chat_threads');
    }

    public static function chatMessages(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('chat_messages');
    }

    public static function reports(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('reports');
    }

    public static function banLogs(): \MongoDB\Collection
    {
        return self::connection()->selectCollection('ban_logs');
    }
}
