<?php

declare(strict_types=1);

use App\Actions\AdminAccountActions;
use App\Actions\AdminGetCommunity;
use App\Actions\AdminListCommunityPosts;
use App\Actions\AdminListPosts;
use App\Actions\AdminOverview;
use App\Actions\AdminSearchCommunities;
use App\Actions\AdminSearchUsers;
use App\Actions\BanTarget;
use App\Actions\BlockUser;
use App\Actions\ChangePassword;
use App\Actions\ChatUnreadStatus;
use App\Actions\CompleteAdminSignup;
use App\Actions\CompleteSignup;
use App\Actions\CreateComment;
use App\Actions\CreateCommunity;
use App\Actions\CreatePost;
use App\Actions\DeletePost;
use App\Actions\GetCommunity;
use App\Actions\GetPost;
use App\Actions\GetUserProfile;
use App\Actions\JoinCommunity;
use App\Actions\KickMember;
use App\Actions\LeaveCommunity;
use App\Actions\ListAdminAccountLog;
use App\Actions\ListAdminAccounts;
use App\Actions\ListAdminReports;
use App\Actions\ListBanLogs;
use App\Actions\ListBlockedUsers;
use App\Actions\ListChatMessages;
use App\Actions\ListChatThreads;
use App\Actions\ListComments;
use App\Actions\ListCommunities;
use App\Actions\ListCommunityMembers;
use App\Actions\ListCommunityPosts;
use App\Actions\ListFeed;
use App\Actions\ListMyCommunities;
use App\Actions\ListMyPosts;
use App\Actions\ListNotifications;
use App\Actions\ListPosts;
use App\Actions\ListSavedPosts;
use App\Actions\ListUserComments;
use App\Actions\ListUserPosts;
use App\Actions\Login;
use App\Actions\Logout;
use App\Actions\MarkAllNotificationsRead;
use App\Actions\MarkChatThreadRead;
use App\Actions\MarkNotificationRead;
use App\Actions\Me;
use App\Actions\PinPost;
use App\Actions\RefreshHandle;
use App\Actions\RequestAdminSignupOtp;
use App\Actions\RequestPasswordResetOtp;
use App\Actions\RequestSignupOtp;
use App\Actions\ResetPassword;
use App\Actions\RevokeAdmin;
use App\Actions\ReviewReport;
use App\Actions\Search;
use App\Actions\SearchUsers;
use App\Actions\SendChatMessage;
use App\Actions\StartChatThread;
use App\Actions\SubmitReport;
use App\Actions\ToggleSavePost;
use App\Actions\UnblockUser;
use App\Actions\UpdateCommunity;
use App\Actions\UpdateNotificationPreferences;
use App\Actions\VerifyAdminSignupOtp;
use App\Actions\VerifyPasswordResetOtp;
use App\Actions\VerifySignupOtp;
use App\Actions\VoteContent;
use App\Cors;
use App\Env;
use App\Router;
use App\Uploads;

require __DIR__ . '/vendor/autoload.php';

Env::load(__DIR__ . '/.env');
Cors::apply();

function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function requestBody(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    return str_contains($contentType, 'multipart/form-data') ? $_POST : jsonBody();
}

$requestPath = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/', '/');

if (str_starts_with($requestPath, '/uploads/')) {
    $uploadsDir = realpath(__DIR__ . '/uploads');
    $requestedFile = realpath(__DIR__ . $requestPath);

    if (
        $uploadsDir !== false
        && $requestedFile !== false
        && str_starts_with($requestedFile, $uploadsDir . DIRECTORY_SEPARATOR)
        && is_file($requestedFile)
    ) {
        Uploads::stream($requestedFile);
        exit;
    }

    http_response_code(404);
    exit;
}

$router = new Router();

// Auth
$router->add('POST', '/api/auth/register/request-otp', fn() => RequestSignupOtp::handle(jsonBody()));
$router->add('POST', '/api/auth/register/verify-otp', fn() => VerifySignupOtp::handle(jsonBody()));
$router->add('POST', '/api/auth/register/complete', fn() => CompleteSignup::handle(jsonBody()));
$router->add('POST', '/api/auth/login', fn() => Login::handle(jsonBody()));
$router->add('POST', '/api/auth/logout', fn() => Logout::handle());
$router->add('GET', '/api/auth/me', fn() => Me::handle());
$router->add('POST', '/api/auth/password', fn() => ChangePassword::handle(jsonBody()));
$router->add('POST', '/api/auth/handle/refresh', fn() => RefreshHandle::handle());
$router->add(
    'POST',
    '/api/auth/password-reset/request-otp',
    fn() => RequestPasswordResetOtp::handle(jsonBody())
);
$router->add(
    'POST',
    '/api/auth/password-reset/verify-otp',
    fn() => VerifyPasswordResetOtp::handle(jsonBody())
);
$router->add('POST', '/api/auth/password-reset/complete', fn() => ResetPassword::handle(jsonBody()));

// Posts
$router->add('GET', '/api/feed', fn() => ListFeed::handle($_GET));
$router->add('GET', '/api/posts', fn() => ListPosts::handle($_GET));
$router->add('POST', '/api/posts', fn() => CreatePost::handle(requestBody(), $_FILES));
$router->add('GET', '/api/posts/mine', fn() => ListMyPosts::handle($_GET));
$router->add('GET', '/api/posts/saved', fn() => ListSavedPosts::handle($_GET));
$router->add('GET', '/api/posts/{id}', fn($p) => GetPost::handle($p['id']));
$router->add('DELETE', '/api/posts/{id}', fn($p) => DeletePost::handle($p['id']));
$router->add('POST', '/api/posts/{id}/save', fn($p) => ToggleSavePost::handle($p['id']));
$router->add('POST', '/api/posts/{id}/vote', fn($p) => VoteContent::handle('post', $p['id'], jsonBody()));
$router->add('GET', '/api/posts/{id}/comments', fn($p) => ListComments::handle($p['id'], $_GET));
$router->add('POST', '/api/posts/{id}/comments', fn($p) => CreateComment::handle($p['id'], jsonBody()));

// Comments
$router->add('POST', '/api/comments/{id}/vote', fn($p) => VoteContent::handle('comment', $p['id'], jsonBody()));

// Communities
$router->add('GET', '/api/communities', fn() => ListCommunities::handle());
$router->add('POST', '/api/communities', fn() => CreateCommunity::handle(jsonBody()));
$router->add('GET', '/api/communities/mine', fn() => ListMyCommunities::handle());
$router->add('GET', '/api/communities/{slug}', fn($p) => GetCommunity::handle($p['slug']));
$router->add(
    'POST',
    '/api/communities/{slug}',
    fn($p) => UpdateCommunity::handle($p['slug'], requestBody(), $_FILES)
);
$router->add('GET', '/api/communities/{slug}/posts', fn($p) => ListCommunityPosts::handle($p['slug'], $_GET));
$router->add('POST', '/api/communities/{slug}/join', fn($p) => JoinCommunity::handle($p['slug']));
$router->add('POST', '/api/communities/{slug}/leave', fn($p) => LeaveCommunity::handle($p['slug']));
$router->add('GET', '/api/communities/{slug}/members', fn($p) => ListCommunityMembers::handle($p['slug']));
$router->add(
    'POST',
    '/api/communities/{slug}/members/{userId}/kick',
    fn($p) => KickMember::handle($p['slug'], $p['userId'])
);
$router->add(
    'POST',
    '/api/communities/{slug}/posts/{id}/pin',
    fn($p) => PinPost::handle($p['slug'], $p['id'])
);

// Search
$router->add('GET', '/api/search', fn() => Search::handle($_GET));

// Users
// Note: these literal routes must stay registered before the dynamic {handle} routes
// below - the router dispatches on first match, and {handle} would otherwise swallow
// "search"/"blocked"/etc. as if they were someone's handle.
$router->add('GET', '/api/users/search', fn() => SearchUsers::handle($_GET));
$router->add('GET', '/api/users/blocked', fn() => ListBlockedUsers::handle());
$router->add('POST', '/api/users/block', fn() => BlockUser::handle(jsonBody()));
$router->add('POST', '/api/users/unblock', fn() => UnblockUser::handle(jsonBody()));
// Admin-only account lookup (see AdminSearchUsers for the matching search endpoint) -
// regular users can't browse each other's accounts/post history.
$router->add('GET', '/api/users/{handle}', fn($p) => GetUserProfile::handle($p['handle']));
$router->add('GET', '/api/users/{handle}/posts', fn($p) => ListUserPosts::handle($p['handle'], $_GET));
$router->add('GET', '/api/users/{handle}/comments', fn($p) => ListUserComments::handle($p['handle'], $_GET));

// Chat
$router->add('GET', '/api/chat/unread', fn() => ChatUnreadStatus::handle());
$router->add('GET', '/api/chat/threads', fn() => ListChatThreads::handle());
$router->add('POST', '/api/chat/threads', fn() => StartChatThread::handle(jsonBody()));
$router->add('GET', '/api/chat/threads/{id}/messages', fn($p) => ListChatMessages::handle($p['id'], $_GET));
$router->add(
    'POST',
    '/api/chat/threads/{id}/messages',
    fn($p) => SendChatMessage::handle($p['id'], requestBody(), $_FILES)
);
$router->add('POST', '/api/chat/threads/{id}/read', fn($p) => MarkChatThreadRead::handle($p['id']));

// Reports
$router->add('POST', '/api/reports', fn() => SubmitReport::handle(jsonBody()));

// Notifications
$router->add('GET', '/api/notifications', fn() => ListNotifications::handle());
$router->add('POST', '/api/notifications/{id}/read', fn($p) => MarkNotificationRead::handle($p['id']));
$router->add('POST', '/api/notifications/read-all', fn() => MarkAllNotificationsRead::handle());
$router->add('POST', '/api/notifications/preferences', fn() => UpdateNotificationPreferences::handle(jsonBody()));

// Admin
$router->add('GET', '/api/admin/overview', fn() => AdminOverview::handle($_GET));
$router->add('GET', '/api/admin/posts', fn() => AdminListPosts::handle($_GET));
$router->add('POST', '/api/admin/posts/{id}/ban', fn($p) => BanTarget::handle('post', $p['id'], jsonBody()));
$router->add('POST', '/api/admin/comments/{id}/ban', fn($p) => BanTarget::handle('comment', $p['id'], jsonBody()));
$router->add('GET', '/api/admin/users/search', fn() => AdminSearchUsers::handle($_GET));
$router->add('POST', '/api/admin/users/{id}/ban', fn($p) => BanTarget::handle('user', $p['id'], jsonBody()));
$router->add('GET', '/api/admin/reports', fn() => ListAdminReports::handle());
$router->add('POST', '/api/admin/reports/{id}/review', fn($p) => ReviewReport::handle($p['id'], jsonBody()));
$router->add('GET', '/api/admin/ban-logs', fn() => ListBanLogs::handle());
// Registered before the {slug} route below - the router matches in registration order,
// so "search" would otherwise be swallowed as a slug value by that broader pattern.
$router->add('GET', '/api/admin/communities/search', fn() => AdminSearchCommunities::handle($_GET));
$router->add('GET', '/api/admin/communities/{slug}', fn($p) => AdminGetCommunity::handle($p['slug']));
$router->add(
    'GET',
    '/api/admin/communities/{slug}/posts',
    fn($p) => AdminListCommunityPosts::handle($p['slug'], $_GET)
);
$router->add(
    'POST',
    '/api/admin/communities/{slug}/ban',
    fn($p) => BanTarget::handle('community', $p['slug'], jsonBody())
);

// Admin accounts - superadmin only
$router->add('GET', '/api/admin/accounts', fn() => ListAdminAccounts::handle());
$router->add('GET', '/api/admin/accounts/log', fn() => ListAdminAccountLog::handle());
$router->add('POST', '/api/admin/accounts/request-otp', fn() => RequestAdminSignupOtp::handle(jsonBody()));
$router->add('POST', '/api/admin/accounts/verify-otp', fn() => VerifyAdminSignupOtp::handle(jsonBody()));
$router->add('POST', '/api/admin/accounts/complete', fn() => CompleteAdminSignup::handle(jsonBody()));
$router->add('POST', '/api/admin/accounts/{id}/revoke', fn($p) => RevokeAdmin::handle($p['id']));
$router->add('GET', '/api/admin/accounts/{id}/actions', fn($p) => AdminAccountActions::handle($p['id']));

$router->dispatch($_SERVER['REQUEST_METHOD'], $requestPath);
