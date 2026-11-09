<?php
declare(strict_types=1);

/**
 * Unzip API 伺服器端代理。金鑰只存在 unzip-secret.php，不要寫進前端。
 * 請把 unzip-secret.php 放在與此檔同一目錄（勿提交 git）。
 */

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
  http_response_code(405);
  echo json_encode(['success' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
  exit;
}

$secretFile = __DIR__ . '/unzip-secret.php';
if (!is_readable($secretFile)) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Proxy is not configured'], JSON_UNESCAPED_UNICODE);
  exit;
}

$apiKey = require $secretFile;
if (!is_string($apiKey) || trim($apiKey) === '') {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Proxy is not configured'], JSON_UNESCAPED_UNICODE);
  exit;
}
$apiKey = trim($apiKey);

$path = isset($_GET['path']) && is_string($_GET['path']) ? $_GET['path'] : '';
$path = '/' . ltrim($path, '/');

if (!unzip_path_allowed($path)) {
  http_response_code(403);
  echo json_encode(['success' => false, 'error' => 'Path is not allowed'], JSON_UNESCAPED_UNICODE);
  exit;
}

$query = [];
foreach (['limit', 'offset'] as $key) {
  if (!isset($_GET[$key])) {
    continue;
  }
  $value = $_GET[$key];
  if (!is_string($value) && !is_numeric($value)) {
    continue;
  }
  if (!preg_match('/^\d+$/', (string) $value)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid query'], JSON_UNESCAPED_UNICODE);
    exit;
  }
  $query[$key] = (string) $value;
}

$upstream = 'https://unzip.clab.org.tw/api/v1' . $path;
if ($query) {
  $upstream .= '?' . http_build_query($query);
}

[$status, $body] = unzip_http_get($upstream, $apiKey);
http_response_code($status);
echo $body !== '' ? $body : json_encode(['success' => false, 'error' => 'Empty upstream response'], JSON_UNESCAPED_UNICODE);

function unzip_path_allowed(string $path): bool
{
  if (str_contains($path, '..') || str_contains($path, '://')) {
    return false;
  }
  return $path === '/projects/119/works'
    || (bool) preg_match('#^/works/\d+$#', $path)
    || (bool) preg_match('#^/collectives/\d+$#', $path)
    || (bool) preg_match('#^/contributors/\d+$#', $path);
}

/**
 * @return array{0: int, 1: string}
 */
function unzip_http_get(string $url, string $apiKey): array
{
  $headers = [
    'Authorization: Api-Key ' . $apiKey,
    'Accept: application/json',
  ];

  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    if ($ch === false) {
      return [502, json_encode(['success' => false, 'error' => 'Proxy request failed'])];
    }
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => false,
      CURLOPT_TIMEOUT => 30,
      CURLOPT_HTTPHEADER => $headers,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) {
      return [502, json_encode(['success' => false, 'error' => 'Proxy request failed'])];
    }
    return [$status > 0 ? $status : 502, (string) $body];
  }

  return unzip_http_get_streams($url, $headers);
}

/**
 * @param list<string> $headers
 * @return array{0: int, 1: string}
 */
function unzip_http_get_streams(string $url, array $headers): array
{
  $context = stream_context_create([
    'http' => [
      'method' => 'GET',
      'header' => implode("\r\n", $headers),
      'timeout' => 30,
      'ignore_errors' => true,
      'follow_location' => 0,
    ],
  ]);
  $body = @file_get_contents($url, false, $context);
  $status = 502;
  $responseHeaders = function_exists('http_get_last_response_headers')
    ? (http_get_last_response_headers() ?? [])
    : [];
  $first = $responseHeaders[0] ?? '';
  if ($first !== '' && preg_match('/\s(\d{3})\s/', $first, $match)) {
    $status = (int) $match[1];
  }
  if ($body === false) {
    return [502, json_encode(['success' => false, 'error' => 'Proxy request failed'])];
  }
  return [$status, $body];
}
