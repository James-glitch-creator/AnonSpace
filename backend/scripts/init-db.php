<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use App\Auth;
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
        // Only collected for admin accounts, via the superadmin-only registration flow -
        // regular users stay anonymous and never provide this.
        'fullName' => ['bsonType' => ['string', 'null']],
        'role' => ['enum' => ['user', 'admin', 'superadmin']],
        // Absent/'active' = normal. A banned account can no longer authenticate at all -
        // enforced centrally in Auth::currentUser(), not per-endpoint.
        'status' => ['enum' => ['active', 'banned']],
        'createdAt' => ['bsonType' => 'date'],
        // Set the first time this account rolls a new anonymous name; gates the
        // once-every-6-months cooldown in RefreshHandle. Absent = never refreshed yet.
        'handleChangedAt' => ['bsonType' => 'date'],
        'mutedNotificationTypes' => [
            'bsonType' => 'array',
            'items' => [
                'enum' => [
                    'reported', 'content_banned', 'account_banned', 'report_approved', 'report_dismissed',
                ],
            ],
        ],
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
        // Longer-form "About Community" text, distinct from the one-line topic.
        'description' => ['bsonType' => 'string'],
        'visibility' => ['enum' => ['public', 'private']],
        'creatorId' => ['bsonType' => 'objectId'],
        // Denormalized like posts.authorHandle - can go stale if the creator later rolls
        // their handle, which mirrors how post/comment authorship already behaves.
        'creatorHandle' => ['bsonType' => 'string'],
        'memberCount' => ['bsonType' => 'int'],
        'color' => ['bsonType' => 'string'],
        'iconUrl' => ['bsonType' => ['string', 'null']],
        'bannerUrl' => ['bsonType' => ['string', 'null']],
        'rules' => [
            'bsonType' => 'array',
            'items' => [
                'bsonType' => 'object',
                'properties' => [
                    'title' => ['bsonType' => 'string'],
                    'body' => ['bsonType' => 'string'],
                ],
            ],
        ],
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
        // Set by the community's creator to feature a post in its "highlights" strip.
        'isPinned' => ['bsonType' => 'bool'],
        // Set when this post is a repost - the original post's _id. The repost carries
        // its own body/community/etc. independently; this is only a pointer, resolved
        // live at render time so an edit/removal of the original is reflected everywhere
        // it's been reposted rather than baked into a stale copy.
        'repostOfId' => ['bsonType' => ['objectId', 'null']],
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
        'lastMessageBody' => ['bsonType' => 'string'],
        'lastMessageSenderId' => ['bsonType' => 'objectId'],
        // Keyed by participant userId (string) -> the date they last read this thread.
        // Dynamic keys, so left unstructured here rather than listed per-property.
        'lastReadAt' => ['bsonType' => 'object'],
    ],
]);

ensureCollection($db, 'chat_messages', [
    'bsonType' => 'object',
    'required' => ['threadId', 'senderId', 'body', 'createdAt'],
    'properties' => [
        'threadId' => ['bsonType' => 'objectId'],
        'senderId' => ['bsonType' => 'objectId'],
        'body' => ['bsonType' => 'string'],
        'mediaType' => ['enum' => ['none', 'photo', 'video']],
        'mediaUrl' => ['bsonType' => ['string', 'null']],
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
        // Set together the moment a pending report is approved or dismissed - who
        // reviewed it and when. Absent while status is still 'pending'.
        'reviewedBy' => ['bsonType' => ['objectId', 'null']],
        'reviewedAt' => ['bsonType' => ['date', 'null']],
    ],
]);

ensureCollection($db, 'ban_logs', [
    'bsonType' => 'object',
    'required' => ['targetType', 'targetId', 'communitySlug', 'finalRatio', 'reason', 'createdAt'],
    'properties' => [
        'targetType' => ['enum' => ['Post', 'Comment', 'User']],
        'targetId' => ['bsonType' => 'objectId'],
        // Null for account bans, which aren't scoped to a community.
        'communitySlug' => ['bsonType' => ['string', 'null']],
        // Null for account bans - there's no vote ratio behind those.
        'finalRatio' => ['bsonType' => ['double', 'null']],
        'reason' => ['bsonType' => 'string'],
        // The admin who approved this ban; null means the automatic downvote-ratio system
        // did it (AutoBan), not a person.
        'bannedBy' => ['bsonType' => ['objectId', 'null']],
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

ensureCollection($db, 'notifications', [
    'bsonType' => 'object',
    'required' => ['userId', 'type', 'message', 'isRead', 'createdAt'],
    'properties' => [
        'userId' => ['bsonType' => 'objectId'],
        'type' => [
            'enum' => ['reported', 'content_banned', 'account_banned', 'report_approved', 'report_dismissed'],
        ],
        'message' => ['bsonType' => 'string'],
        'targetType' => ['bsonType' => ['string', 'null']],
        'targetId' => ['bsonType' => ['objectId', 'null']],
        'isRead' => ['bsonType' => 'bool'],
        'createdAt' => ['bsonType' => 'date'],
    ],
]);

ensureCollection($db, 'admin_logs', [
    'bsonType' => 'object',
    'required' => ['action', 'targetId', 'targetHandle', 'performedBy', 'performedByHandle', 'createdAt'],
    'properties' => [
        'action' => ['enum' => ['granted', 'revoked']],
        // The admin account being granted or revoked.
        'targetId' => ['bsonType' => 'objectId'],
        'targetHandle' => ['bsonType' => 'string'],
        // The superadmin who did it.
        'performedBy' => ['bsonType' => 'objectId'],
        'performedByHandle' => ['bsonType' => 'string'],
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

$db->selectCollection('notifications')->createIndex(
    ['userId' => 1, 'createdAt' => -1],
    ['name' => 'user_created_idx']
);
echo "- notifications: (userId, createdAt) idx\n";

$db->selectCollection('admin_logs')->createIndex(['createdAt' => -1], ['name' => 'created_idx']);
echo "- admin_logs: createdAt idx\n";

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

echo "\nEnsuring superadmin account...\n";

// The one designated superadmin, created once here rather than through signup — admin
// accounts can only ever be registered by a superadmin (via /api/admin/accounts), and
// there has to be a first superadmin to do that. Password is only set on first insert:
// if they've since changed it via Settings, re-running this script must not clobber it.
$users = Database::users();
$superadminEmail = 'anonspace99@gmail.com';
$superadmin = $users->findOne(['email' => $superadminEmail]);

// The superadmin isn't anonymous like everyone else - there's only ever one, and it's
// always labeled plainly as "Superadmin" rather than getting a random handle.
$superadminHandle = 'Superadmin';

if ($superadmin === null) {
    // No account under this email yet - if an older superadmin exists under a different
    // email (e.g. this constant changed since it was first seeded), rename it in place
    // so we keep one superadmin with its existing password, not a second account.
    $existingSuperadmin = $users->findOne(['role' => 'superadmin']);
    if ($existingSuperadmin !== null) {
        $users->updateOne(
            ['_id' => $existingSuperadmin['_id']],
            ['$set' => ['email' => $superadminEmail, 'handle' => $superadminHandle]]
        );
        echo "  ~ renamed superadmin ({$existingSuperadmin['email']} -> {$superadminEmail})\n";
    } else {
        $users->insertOne([
            'email' => $superadminEmail,
            'passwordHash' => Auth::hashPassword('12345678'),
            'handle' => $superadminHandle,
            'role' => 'superadmin',
            'createdAt' => new UTCDateTime(),
        ]);
        echo "  + created superadmin ({$superadminEmail})\n";
    }
} elseif (($superadmin['role'] ?? 'user') !== 'superadmin') {
    $users->updateOne(['_id' => $superadmin['_id']], ['$set' => ['role' => 'superadmin', 'handle' => $superadminHandle]]);
    echo "  ~ promoted existing account to superadmin ({$superadminEmail})\n";
} elseif (($superadmin['handle'] ?? null) !== $superadminHandle) {
    $users->updateOne(['_id' => $superadmin['_id']], ['$set' => ['handle' => $superadminHandle]]);
    echo "  ~ fixed superadmin handle -> {$superadminHandle}\n";
} else {
    echo "  = superadmin already exists ({$superadminEmail})\n";
}

echo "\nDone.\n";
