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
        // Keep the validator in sync with this script on every run, so schema changes
        // (new optional fields, expanded enums, ...) reach databases that already exist.
        $db->command(['collMod' => $name, 'validator' => ['$jsonSchema' => $validator]]);
        echo "~ synced {$name} validator\n";
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
        'topic' => ['bsonType' => 'string'],
        'visibility' => ['enum' => ['public', 'private']],
        'creatorId' => ['bsonType' => 'objectId'],
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
        'mediaType' => ['enum' => ['none', 'photos', 'video']],
        'mediaUrls' => ['bsonType' => 'array', 'items' => ['bsonType' => 'string']],
        'videoUrl' => ['bsonType' => ['string', 'null']],
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
        'parentId' => ['bsonType' => ['objectId', 'null']],
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
        'targetType' => ['enum' => ['Post', 'Comment', 'Community', 'User']],
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

ensureCollection($db, 'saved_posts', [
    'bsonType' => 'object',
    'required' => ['userId', 'postId', 'createdAt'],
    'properties' => [
        'userId' => ['bsonType' => 'objectId'],
        'postId' => ['bsonType' => 'objectId'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'blocked_users', [
    'bsonType' => 'object',
    'required' => ['blockerId', 'blockedId', 'createdAt'],
    'properties' => [
        'blockerId' => ['bsonType' => 'objectId'],
        'blockedId' => ['bsonType' => 'objectId'],
        'createdAt' => ['bsonType' => 'date'],
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
$db->selectCollection('comments')->createIndex(['parentId' => 1], ['name' => 'parent_idx']);
echo "- comments: postId idx, parentId idx\n";

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

$db->selectCollection('saved_posts')->createIndex(
    ['userId' => 1, 'postId' => 1],
    ['unique' => true, 'name' => 'uniq_user_post']
);
echo "- saved_posts: unique (userId, postId)\n";

$db->selectCollection('blocked_users')->createIndex(
    ['blockerId' => 1, 'blockedId' => 1],
    ['unique' => true, 'name' => 'uniq_blocker_blocked']
);
echo "- blocked_users: unique (blockerId, blockedId)\n";

echo "\nSeeding communities...\n";

$communities = $db->selectCollection('communities');
// Only "public" is seeded — it's the default posting destination the submit page falls
// back to. Do not add more placeholder communities here: this block runs every time this
// script does (including for unrelated schema syncs), and upsert-by-slug means anything
// listed here comes back even after being deliberately deleted.
$seed = [
    ['slug' => 'public', 'name' => 'Public', 'topic' => 'General discussion for everyone', 'visibility' => 'public', 'memberCount' => 12000000, 'color' => 'bg-slate-500'],
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
