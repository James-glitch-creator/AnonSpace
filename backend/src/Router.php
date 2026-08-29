<?php

namespace App;

final class Router
{
    /** @var array<int, array{method: string, pattern: string, handler: callable}> */
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = ['method' => $method, 'pattern' => $pattern, 'handler' => $handler];
    }

    public function dispatch(string $method, string $path): never
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = self::match($route['pattern'], $path);

            if ($params !== null) {
                ($route['handler'])($params);
            }
        }

        Response::error('Not found', 404);
    }

    /** @return array<string, string>|null */
    private static function match(string $pattern, string $path): ?array
    {
        $patternParts = explode('/', trim($pattern, '/'));
        $pathParts = explode('/', trim($path, '/'));

        if (count($patternParts) !== count($pathParts)) {
            return null;
        }

        $params = [];

        foreach ($patternParts as $i => $part) {
            // Decode here, not before splitting - a literal %2F in a segment must stay
            // encoded until this point, or it would wrongly look like an extra "/".
            $pathPart = urldecode($pathParts[$i]);

            if (str_starts_with($part, '{') && str_ends_with($part, '}')) {
                $params[substr($part, 1, -1)] = $pathPart;
            } elseif ($part !== $pathPart) {
                return null;
            }
        }

        return $params;
    }
}
