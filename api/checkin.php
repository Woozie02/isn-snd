<?php
require_once __DIR__ . '/db.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($method === 'POST') {
    http_response_code(403);
    echo json_encode(array(
        'error' => 'Check-in is now closed as the event date has passed (11 Nov 2026). Existing records are finalized.',
        'event_closed' => true
    ));
    exit;
}
