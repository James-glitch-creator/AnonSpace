<?php

declare(strict_types=1);

namespace App;

use App\Actions\AdminAutoBanSettings;
use App\Actions\AdminOverview;
use MongoDB\BSON\ObjectId;

// Run with: php backend/tests/auto-ban-settings.php
// In-memory database and response doubles; never opens the application's database.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

final class TestResponse extends \Exception
{
    public function __construct(public array $data, public int $status) {}
}

final class Response
{
    public static function ok(array $data = [], int $status = 200): never
    {
        throw new TestResponse($data, $status);
    }

    public static function error(string $message, int $status = 400, array $extra = []): never
    {
        throw new TestResponse(['error' => $message] + $extra, $status);
    }
}

final class TestCollection
{
    public ?array $record = null;
    public int $writes = 0;
    public array $lastFilter = [];

    public function findOne(array $filter): ?array
    {
        return $this->record;
    }

    public function updateOne(array $filter, array $update, array $options = []): void
    {
        check($filter === ['_id' => 'auto_ban'], 'Settings use a singleton document');
        check($options === ['upsert' => true], 'First save creates the settings document');
        $this->record = array_merge($this->record ?? $filter, $update['$set']);
        $this->writes++;
    }

    public function countDocuments(array $filter): int
    {
        $this->lastFilter = $filter;
        return 0;
    }
}

final class Database
{
    private static array $collections = [];

    public static function __callStatic(string $name, array $args): TestCollection
    {
        return self::$collections[$name] ??= new TestCollection();
    }
}

final class ContentModeration
{
    public static array $bans = [];

    public static function ban(string $type, ObjectId $id, string $context, ?ObjectId $actor): void
    {
        self::$bans[] = [$type, $id, $context, $actor];
    }
}

foreach (['Env', 'Jwt', 'Auth', 'AutoBan', 'actions/AdminAutoBanSettings', 'actions/AdminOverview'] as $file) {
    require __DIR__ . '/../src/' . $file . '.php';
}

function check(bool $condition, string $message): void
{
    if (!$condition) throw new \RuntimeException($message);
}

function response(callable $action, int $status): array
{
    try {
        $action();
    } catch (TestResponse $result) {
        check($result->status === $status, "Expected HTTP {$status}, got {$result->status}");
        return $result->data;
    }
    throw new \RuntimeException('Action did not return a response');
}

$actorId = new ObjectId();
putenv('JWT_SECRET=auto-ban-tests-only');
$_COOKIE['anonspace_token'] = Jwt::encode(['sub' => (string) $actorId, 'role' => 'superadmin'], 'auto-ban-tests-only', 3600);
$valid = ['thresholdPercent' => 75, 'minVotes' => 8];

check(AutoBan::settings() === ['thresholdPercent' => 50, 'minVotes' => 4], 'Existing defaults are retained');
unset($_COOKIE['anonspace_token']);
response(fn() => AdminAutoBanSettings::get(), 401);
response(fn() => AdminAutoBanSettings::update($valid), 401);
$_COOKIE['anonspace_token'] = Jwt::encode(['sub' => (string) $actorId, 'role' => 'superadmin'], 'auto-ban-tests-only', 3600);

foreach (['user', 'admin'] as $role) {
    Database::users()->record = ['_id' => $actorId, 'role' => $role];
    // Even a token claiming superadmin cannot override the live role.
    response(fn() => AdminAutoBanSettings::update($valid), 403);
    response(fn() => AdminAutoBanSettings::get(), $role === 'admin' ? 200 : 403);
}
check(Database::settings()->writes === 0, 'Unauthorised attempts do not write');
Database::users()->record = ['_id' => $actorId, 'role' => 'superadmin'];

foreach ([0, 101, -1, 50.5, '75', true, null, []] as $value) {
    response(fn() => AdminAutoBanSettings::update(['thresholdPercent' => $value, 'minVotes' => 8]), 422);
}
foreach ([0, -1, 1000001, 2.5, '8', true, null, []] as $value) {
    response(fn() => AdminAutoBanSettings::update(['thresholdPercent' => 75, 'minVotes' => $value]), 422);
}
response(fn() => AdminAutoBanSettings::update([]), 422);
check(Database::settings()->writes === 0, 'Invalid values do not write');

response(fn() => AdminAutoBanSettings::update($valid), 200);
check(response(fn() => AdminAutoBanSettings::get(), 200)['settings'] === $valid, 'Saved settings are returned on a later read');
check(Database::settings()->record['updatedBy'] === $actorId, 'The modifying superadmin is recorded');
check(isset(Database::settings()->record['updatedAt']), 'Modification time is recorded');
check(ContentModeration::$bans === [], 'Saving does not retroactively ban content');

$postId = new ObjectId();
foreach (['post' => 'posts', 'comment' => 'comments'] as $type => $collection) {
    foreach ([[0, 0, false], [0, 7, false], [3, 5, false], [2, 6, true], [1, 7, true]] as [$up, $down, $ban]) {
        Database::$collection()->record = ['upvotes' => $up, 'downvotes' => $down, 'status' => 'visible'];
        ContentModeration::$bans = [];
        AutoBan::evaluate($type, $postId);
        check((count(ContentModeration::$bans) === 1) === $ban, "{$type}: {$up} up / {$down} down");
    }
    Database::$collection()->record['status'] = 'banned';
    ContentModeration::$bans = [];
    AutoBan::evaluate($type, $postId);
    check(ContentModeration::$bans === [], 'Already-banned content is skipped');
}

// Changing the rule is effective for the next evaluation, with no process cache.
response(fn() => AdminAutoBanSettings::update(['thresholdPercent' => 100, 'minVotes' => 1]), 200);
Database::posts()->record = ['upvotes' => 1, 'downvotes' => 7, 'status' => 'visible'];
AutoBan::evaluate('post', $postId);
check(ContentModeration::$bans === [], 'Raising the threshold takes effect immediately');
Database::posts()->record['upvotes'] = 0;
AutoBan::evaluate('post', $postId);
check(count(ContentModeration::$bans) === 1, 'One hundred percent boundary is inclusive');
response(fn() => AdminAutoBanSettings::update(['thresholdPercent' => 1, 'minVotes' => 1000000]), 200);

$near = new \ReflectionMethod(AdminOverview::class, 'nearThresholdCount');
$near->invoke(null, 'post', $valid);
$filter = Database::posts()->lastFilter['$expr']['$and'];
check($filter[0]['$gte'][1] === 8, 'Dashboard uses saved minimum votes');
check($filter[1]['$gte'][1] === 0.65 && $filter[2]['$lt'][1] === 0.75, 'Dashboard uses saved threshold');
check(isset($filter[1]['$gte'][0]['$divide'][1]['$max']), 'Dashboard protects zero-vote division');

Database::users()->record['status'] = 'banned';
response(fn() => AdminAutoBanSettings::update($valid), 401);
echo "PASS: defaults, live-role permissions, validation, persistence calls, post/comment boundaries, rule changes, and dashboard query.\n";
