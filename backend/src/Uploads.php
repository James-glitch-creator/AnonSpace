<?php

namespace App;

final class Uploads
{
    private const PHOTO_MIME_EXT = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    private const VIDEO_MIME_EXT = [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov',
    ];

    private const MAX_PHOTOS = 10;
    private const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
    private const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

    /** @return string[] relative URLs */
    public static function savePhotos(array $filesField): array
    {
        $items = self::normalize($filesField);

        if ($items === []) {
            return [];
        }

        if (count($items) > self::MAX_PHOTOS) {
            Response::error('You can attach at most ' . self::MAX_PHOTOS . ' photos.', 422);
        }

        $urls = [];
        foreach ($items as $item) {
            $urls[] = self::saveOne($item, self::PHOTO_MIME_EXT, self::MAX_PHOTO_BYTES, 'photo');
        }

        return $urls;
    }

    public static function saveVideo(array $filesField): ?string
    {
        $items = self::normalize($filesField);

        if ($items === []) {
            return null;
        }

        return self::saveOne($items[0], self::VIDEO_MIME_EXT, self::MAX_VIDEO_BYTES, 'video');
    }

    public static function hasUpload(array $filesField): bool
    {
        return self::normalize($filesField) !== [];
    }

    public static function mimeFor(string $path): ?string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $extToMime = array_flip(self::PHOTO_MIME_EXT + self::VIDEO_MIME_EXT);

        return $extToMime[$ext] ?? null;
    }

    /**
     * Serves a saved upload, honoring HTTP Range requests. A plain full-body response
     * works fine for images (the browser decodes the whole thing regardless), but a
     * <video>/<audio> element always opens with a Range request and most browsers refuse
     * to play anything at all if the server doesn't answer with a 206 partial response -
     * without this, an uploaded video shows a player that never starts.
     */
    public static function stream(string $path): void
    {
        $size = filesize($path);
        if ($size === false) {
            http_response_code(404);
            return;
        }

        header('Content-Type: ' . (self::mimeFor($path) ?? 'application/octet-stream'));
        header('Cache-Control: public, max-age=31536000, immutable');
        header('Accept-Ranges: bytes');

        $start = 0;
        $end = $size - 1;
        $status = 200;

        $range = $_SERVER['HTTP_RANGE'] ?? null;
        if ($range !== null && preg_match('/^bytes=(\d*)-(\d*)$/', trim($range), $m) === 1) {
            [$rawStart, $rawEnd] = [$m[1], $m[2]];

            if ($rawStart === '' && $rawEnd !== '') {
                // Suffix range - "give me the last N bytes".
                $start = max(0, $size - (int) $rawEnd);
            } elseif ($rawStart !== '') {
                $start = (int) $rawStart;
                if ($rawEnd !== '') {
                    $end = min((int) $rawEnd, $size - 1);
                }
            }

            if ($start > $end || $start >= $size) {
                header("Content-Range: bytes */{$size}");
                http_response_code(416);
                return;
            }

            $status = 206;
        }

        $length = $end - $start + 1;
        http_response_code($status);
        header("Content-Length: {$length}");
        if ($status === 206) {
            header("Content-Range: bytes {$start}-{$end}/{$size}");
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            http_response_code(500);
            return;
        }

        fseek($handle, $start);
        $remaining = $length;
        while ($remaining > 0 && !feof($handle)) {
            $chunk = fread($handle, min(8192, $remaining));
            if ($chunk === false) {
                break;
            }
            echo $chunk;
            $remaining -= strlen($chunk);
        }
        fclose($handle);
    }

    /** Deletes a previously saved upload given its "/uploads/xxx" relative URL. */
    public static function delete(string $relativeUrl): void
    {
        if (!str_starts_with($relativeUrl, '/uploads/')) {
            return;
        }

        $uploadsDir = realpath(self::dir());
        $target = realpath(self::dir() . '/' . basename($relativeUrl));

        if (
            $uploadsDir !== false
            && $target !== false
            && str_starts_with($target, $uploadsDir . DIRECTORY_SEPARATOR)
            && is_file($target)
        ) {
            unlink($target);
        }
    }

    private static function saveOne(array $file, array $mimeExt, int $maxBytes, string $label): string
    {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            Response::error(ucfirst($label) . ' upload failed.', 422);
        }

        if ($file['size'] > $maxBytes) {
            $maxMb = (int) ($maxBytes / (1024 * 1024));
            Response::error(ucfirst($label) . " must be under {$maxMb}MB.", 422);
        }

        $mime = strtolower((string) $file['type']);

        if (!isset($mimeExt[$mime])) {
            Response::error("Unsupported {$label} format.", 422);
        }

        $dir = self::dir();
        $filename = bin2hex(random_bytes(16)) . '.' . $mimeExt[$mime];

        if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $filename)) {
            Response::error("Could not save {$label}.", 500);
        }

        return '/uploads/' . $filename;
    }

    private static function dir(): string
    {
        $dir = __DIR__ . '/../uploads';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        return $dir;
    }

    /** @return array<int, array{name:string,type:string,tmp_name:string,error:int,size:int}> */
    private static function normalize(array $filesField): array
    {
        if (!isset($filesField['name'])) {
            return [];
        }

        if (!is_array($filesField['name'])) {
            return $filesField['error'] === UPLOAD_ERR_NO_FILE ? [] : [$filesField];
        }

        $items = [];
        foreach ($filesField['name'] as $i => $name) {
            if ($name === '' || $filesField['error'][$i] === UPLOAD_ERR_NO_FILE) {
                continue;
            }

            $items[] = [
                'name' => $name,
                'type' => $filesField['type'][$i],
                'tmp_name' => $filesField['tmp_name'][$i],
                'error' => $filesField['error'][$i],
                'size' => $filesField['size'][$i],
            ];
        }

        return $items;
    }
}
