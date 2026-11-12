<?php
require_once __DIR__ . '/db.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || empty($input['id'])) {
        http_response_code(400);
        echo json_encode(array('error' => 'Attendee ID is required'));
        exit;
    }

    $id = trim($input['id']);
    $action = isset($input['action']) ? $input['action'] : 'checkin';

    $checked_in = ($action === 'checkin') ? 1 : 0;
    $checked_at = ($action === 'checkin') ? date('d M Y, g:i A') : '';

    $stmt = $pdo->prepare("UPDATE attendees SET checked_in = ?, checked_at = ? WHERE id = ?");
    $stmt->execute(array($checked_in, $checked_at, $id));

    $getStmt = $pdo->prepare("SELECT a.*, t.name as team_name, t.color_code as team_color, t.bg_tint as team_bg 
                              FROM attendees a 
                              LEFT JOIN teams t ON a.team_id = t.id 
                              WHERE a.id = ?");
    $getStmt->execute(array($id));
    $attendee = $getStmt->fetch();

    if ($attendee) {
        $attendee['checkedIn'] = (bool)$attendee['checked_in'];
        $attendee['checkedAt'] = $attendee['checked_at'];
        $attendee['team'] = $attendee['team_id'];
        $attendee['teamName'] = $attendee['team_name'];
        $attendee['teamColor'] = $attendee['team_color'];
        $attendee['teamBg'] = $attendee['team_bg'];
        $attendee['registered'] = $attendee['registered_at'];
        $attendee['phone'] = !empty($attendee['phone']) ? $attendee['phone'] : '';

        echo json_encode(array('success' => true, 'data' => $attendee));
    } else {
        http_response_code(404);
        echo json_encode(array('error' => 'Attendee not found'));
    }
    exit;
}
