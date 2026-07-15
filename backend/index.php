<?php

declare(strict_types=1);

use App\Actions\CompleteSignup;
use App\Actions\CreateComment;
use App\Actions\CreateCommunity;
use App\Actions\CreatePost;
use App\Actions\GetCommunity;
use App\Actions\GetPost;
use App\Actions\JoinCommunity;
use App\Actions\LeaveCommunity;
use App\Actions\ListChatMessages;
use App\Actions\ListChatThreads;
use App\Actions\ListComments;
use App\Actions\ListCommunities;
use App\Actions\ListCommunityPosts;
use App\Actions\ListMyCommunities;
use App\Actions\ListPosts;
use App\Actions\Login;
use App\Actions\Logout;
use App\Actions\Me;
use App\Actions\RequestSignupOtp;
use App\Actions\Search;
use App\Actions\SendChatMessage;
use App\Actions\StartChatThread;
use App\Actions\SubmitReport;
use App\Actions\VerifySignupOtp;
use App\Actions\VoteContent;
use App\Cors;
use App\Env;
use App\Router;

require __DIR__ . '/vendor/autoload.php';

Env::load(__DIR__ . '/.env');
Cors::apply();

function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
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
$router->add('POST', '/api/posts', fn() => CreatePost::handle(jsonBody()));
$router->add('GET', '/api/posts/{id}', fn($p) => GetPost::handle($p['id']));
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

// Search
$router->add('GET', '/api/search', fn() => Search::handle($_GET));

// Chat
$router->add('GET', '/api/chat/threads', fn() => ListChatThreads::handle());
$router->add('POST', '/api/chat/threads', fn() => StartChatThread::handle(jsonBody()));
$router->add('GET', '/api/chat/threads/{id}/messages', fn($p) => ListChatMessages::handle($p['id'], $_GET));
$router->add('POST', '/api/chat/threads/{id}/messages', fn($p) => SendChatMessage::handle($p['id'], jsonBody()));

// Reports
$router->add('POST', '/api/reports', fn() => SubmitReport::handle(jsonBody()));

$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/', '/');
$router->dispatch($_SERVER['REQUEST_METHOD'], $path);
