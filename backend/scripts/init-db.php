<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Database;
use App\Env;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Database as MongoDatabase;

Env::load(__DIR__ . '/../.env');

$db = Database::connection();

function ensureCollection(MongoDatabase $db, string $name, array $validator): void
{
    $existing = iterator_to_array($db->listCollectionNames(['filter' => ['name' => $name]]));

    if (in_array($name, $existing, true)) {
        echo "- {$name} already exists\n";
        return;
    }

    $db->createCollection($name, ['validator' => ['$jsonSchema' => $validator]]);
    echo "+ created {$name}\n";
}

ensureCollection($db, 'users', [
    'bsonType' => 'object',
    'required' => ['email', 'passwordHash', 'handle', 'role', 'createdAt'],
    'properties' => [
        'email' => ['bsonType' => 'string'],
        'passwordHash' => ['bsonType' => 'string'],
        'handle' => ['bsonType' => 'string'],
        'role' => ['enum' => ['user', 'admin']],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'otp_codes', [
    'bsonType' => 'object',
    'required' => ['email', 'codeHash', 'attempts', 'expiresAt', 'createdAt'],
    'properties' => [
        'email' => ['bsonType' => 'string'],
        'codeHash' => ['bsonType' => 'string'],
        'attempts' => ['bsonType' => 'int'],
        'expiresAt' => ['bsonType' => 'date'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'communities', [
    'bsonType' => 'object',
    'required' => ['slug', 'name', 'memberCount', 'color', 'createdAt'],
    'properties' => [
        'slug' => ['bsonType' => 'string'],
        'name' => ['bsonType' => 'string'],
        'memberCount' => ['bsonType' => 'int'],
        'color' => ['bsonType' => 'string'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'posts', [
    'bsonType' => 'object',
    'required' => [
        'communitySlug', 'authorId', 'authorHandle', 'body',
        'upvotes', 'downvotes', 'commentCount', 'createdAt',
    ],
    'properties' => [
        'communitySlug' => ['bsonType' => 'string'],
        'authorId' => ['bsonType' => 'objectId'],
        'authorHandle' => ['bsonType' => 'string'],
        'body' => ['bsonType' => 'string'],
        'upvotes' => ['bsonType' => 'int'],
        'downvotes' => ['bsonType' => 'int'],
        'commentCount' => ['bsonType' => 'int'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'comments', [
    'bsonType' => 'object',
    'required' => ['postId', 'authorId', 'authorHandle', 'body', 'upvotes', 'downvotes', 'createdAt'],
    'properties' => [
        'postId' => ['bsonType' => 'objectId'],
        'authorId' => ['bsonType' => 'objectId'],
        'authorHandle' => ['bsonType' => 'string'],
        'body' => ['bsonType' => 'string'],
        'upvotes' => ['bsonType' => 'int'],
        'downvotes' => ['bsonType' => 'int'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'chat_threads', [
    'bsonType' => 'object',
    'required' => ['participantIds', 'createdAt', 'lastMessageAt'],
    'properties' => [
        'participantIds' => ['bsonType' => 'array', 'items' => ['bsonType' => 'objectId']],
        'createdAt' => ['bsonType' => 'date'],
        'lastMessageAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'chat_messages', [
    'bsonType' => 'object',
    'required' => ['threadId', 'senderId', 'body', 'createdAt'],
    'properties' => [
        'threadId' => ['bsonType' => 'objectId'],
        'senderId' => ['bsonType' => 'objectId'],
        'body' => ['bsonType' => 'string'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'reports', [
    'bsonType' => 'object',
    'required' => ['targetType', 'targetId', 'reason', 'reporterId', 'status', 'createdAt'],
    'properties' => [
        'targetType' => ['enum' => ['Post', 'Comment']],
        'targetId' => ['bsonType' => 'objectId'],
        'reason' => ['bsonType' => 'string'],
        'reporterId' => ['bsonType' => 'objectId'],
        'status' => ['enum' => ['pending', 'reviewed', 'dismissed']],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'ban_logs', [
    'bsonType' => 'object',
    'required' => ['targetType', 'targetId', 'communitySlug', 'finalRatio', 'reason', 'createdAt'],
    'properties' => [
        'targetType' => ['enum' => ['Post', 'Comment']],
        'targetId' => ['bsonType' => 'objectId'],
        'communitySlug' => ['bsonType' => 'string'],
        'finalRatio' => ['bsonType' => 'double'],
        'reason' => ['bsonType' => 'string'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'votes', [
    'bsonType' => 'object',
    'required' => ['userId', 'targetType', 'targetId', 'direction', 'createdAt'],
    'properties' => [
        'userId' => ['bsonType' => 'objectId'],
        'targetType' => ['enum' => ['post', 'comment']],
        'targetId' => ['bsonType' => 'objectId'],
        'direction' => ['enum' => ['up', 'down']],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'community_members', [
    'bsonType' => 'object',
    'required' => ['communityId', 'userId', 'joinedAt'],
    'properties' => [
        'communityId' => ['bsonType' => 'objectId'],
        'userId' => ['bsonType' => 'objectId'],
        'joinedAt' => ['bsonType' => 'date'],
    ],
]);

echo "\nIndexes:\n";

Database::users()->createIndex(['email' => 1], ['unique' => true, 'name' => 'uniq_email']);
Database::users()->createIndex(['handle' => 1], ['unique' => true, 'name' => 'uniq_handle']);
echo "- users: unique email, unique handle\n";

$db->selectCollection('otp_codes')->createIndex(['email' => 1], ['name' => 'email_idx']);
$db->selectCollection('otp_codes')->createIndex(
    ['expiresAt' => 1],
    ['expireAfterSeconds' => 0, 'name' => 'ttl_expiresAt']
);
echo "- otp_codes: email idx, TTL on expiresAt\n";

$db->selectCollection('communities')->createIndex(['slug' => 1], ['unique' => true, 'name' => 'uniq_slug']);
echo "- communities: unique slug\n";

$db->selectCollection('posts')->createIndex(['communitySlug' => 1], ['name' => 'community_idx']);
$db->selectCollection('posts')->createIndex(['authorId' => 1], ['name' => 'author_idx']);
echo "- posts: communitySlug idx, authorId idx\n";

$db->selectCollection('comments')->createIndex(['postId' => 1], ['name' => 'post_idx']);
echo "- comments: postId idx\n";

$db->selectCollection('chat_threads')->createIndex(['participantIds' => 1], ['name' => 'participants_idx']);
echo "- chat_threads: participantIds idx\n";

$db->selectCollection('chat_messages')->createIndex(['threadId' => 1], ['name' => 'thread_idx']);
echo "- chat_messages: threadId idx\n";

$db->selectCollection('reports')->createIndex(['status' => 1], ['name' => 'status_idx']);
echo "- reports: status idx\n";

$db->selectCollection('ban_logs')->createIndex(['createdAt' => -1], ['name' => 'created_idx']);
echo "- ban_logs: createdAt idx\n";

$db->selectCollection('votes')->createIndex(
    ['userId' => 1, 'targetType' => 1, 'targetId' => 1],
    ['unique' => true, 'name' => 'uniq_user_target']
);
echo "- votes: unique (userId, targetType, targetId)\n";

$db->selectCollection('community_members')->createIndex(
    ['communityId' => 1, 'userId' => 1],
    ['unique' => true, 'name' => 'uniq_community_user']
);
$db->selectCollection('community_members')->createIndex(['userId' => 1], ['name' => 'user_idx']);
echo "- community_members: unique (communityId, userId), userId idx\n";

echo "\nSeeding communities...\n";

$communities = $db->selectCollection('communities');
$seed = [
    ['slug' => 'anondev', 'name' => 'AnonDev', 'memberCount' => 6340000, 'color' => 'bg-cyan-500'],
    ['slug' => 'cyberprivacy', 'name' => 'CyberPrivacy', 'memberCount' => 2100000, 'color' => 'bg-fuchsia-500'],
    ['slug' => 'design', 'name' => 'Design', 'memberCount' => 1800000, 'color' => 'bg-emerald-500'],
    ['slug' => 'colortone', 'name' => 'ColorTone', 'memberCount' => 845000, 'color' => 'bg-amber-500'],
];

foreach ($seed as $c) {
    $communities->updateOne(
        ['slug' => $c['slug']],
        ['$setOnInsert' => $c + ['createdAt' => new UTCDateTime()]],
        ['upsert' => true]
    );
    echo "  - {$c['slug']}\n";
}

echo "\nDone.\n";
