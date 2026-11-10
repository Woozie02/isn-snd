<?php
require_once __DIR__ . '/../config.php';

// Database configuration connecting using config.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

$reqMethod = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';
if ($reqMethod === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ));
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array('error' => 'Database connection failed: ' . $e->getMessage()));
    exit;
}
