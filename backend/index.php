<?php

declare(strict_types=1);

use App\Actions\BlockUser;
use App\Actions\CompleteSignup;
use App\Actions\CreateComment;
use App\Actions\CreateCommunity;
use App\Actions\CreatePost;
use App\Actions\DeletePost;
use App\Actions\GetCommunity;
use App\Actions\GetPost;
use App\Actions\JoinCommunity;
use App\Actions\KickMember;
use App\Actions\LeaveCommunity;
use App\Actions\ListChatMessages;
use App\Actions\ListChatThreads;
use App\Actions\ListComments;
use App\Actions\ListCommunities;
use App\Actions\ListCommunityMembers;
use App\Actions\ListCommunityPosts;
use App\Actions\ListMyCommunities;
use App\Actions\ListMyPosts;
use App\Actions\ListPosts;
use App\Actions\ListSavedPosts;
use App\Actions\Login;
use App\Actions\Logout;
use App\Actions\Me;
use App\Actions\RequestSignupOtp;
use App\Actions\Search;
use App\Actions\SearchUsers;
use App\Actions\SendChatMessage;
use App\Actions\StartChatThread;
use App\Actions\SubmitReport;
use App\Actions\ToggleSavePost;
use App\Actions\UnblockUser;
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
        header('Content-Type: ' . (Uploads::mimeFor($requestedFile) ?? 'application/octet-stream'));
        header('Cache-Control: public, max-age=31536000, immutable');
        readfile($requestedFile);
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

// Posts
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
$router->add('GET', '/api/communities/{slug}/posts', fn($p) => ListCommunityPosts::handle($p['slug'], $_GET));
$router->add('POST', '/api/communities/{slug}/join', fn($p) => JoinCommunity::handle($p['slug']));
$router->add('POST', '/api/communities/{slug}/leave', fn($p) => LeaveCommunity::handle($p['slug']));
$router->add('GET', '/api/communities/{slug}/members', fn($p) => ListCommunityMembers::handle($p['slug']));
$router->add(
    'POST',
    '/api/communities/{slug}/members/{userId}/kick',
    fn($p) => KickMember::handle($p['slug'], $p['userId'])
);

// Search
$router->add('GET', '/api/search', fn() => Search::handle($_GET));

// Users
$router->add('GET', '/api/users/search', fn() => SearchUsers::handle($_GET));
$router->add('POST', '/api/users/block', fn() => BlockUser::handle(jsonBody()));
$router->add('POST', '/api/users/unblock', fn() => UnblockUser::handle(jsonBody()));

// Chat
$router->add('GET', '/api/chat/threads', fn() => ListChatThreads::handle());
$router->add('POST', '/api/chat/threads', fn() => StartChatThread::handle(jsonBody()));
$router->add('GET', '/api/chat/threads/{id}/messages', fn($p) => ListChatMessages::handle($p['id'], $_GET));
$router->add('POST', '/api/chat/threads/{id}/messages', fn($p) => SendChatMessage::handle($p['id'], jsonBody()));

// Reports
$router->add('POST', '/api/reports', fn() => SubmitReport::handle(jsonBody()));

$router->dispatch($_SERVER['REQUEST_METHOD'], $requestPath);
