<?php
require_once __DIR__ . '/db.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($method === 'GET') {
    $teamsStmt = $pdo->query("SELECT * FROM teams ORDER BY id ASC");
    $teams = $teamsStmt->fetchAll();

    foreach ($teams as &$team) {
        $statStmt = $pdo->prepare("SELECT 
            COUNT(*) as total_members,
            SUM(CASE WHEN checked_in = 1 THEN 1 ELSE 0 END) as checked_in_count
            FROM attendees WHERE team_id = ?");
        $statStmt->execute(array($team['id']));
        $stats = $statStmt->fetch();
        $team['totalMembers'] = isset($stats['total_members']) ? (int)$stats['total_members'] : 0;
        $team['checkedInCount'] = isset($stats['checked_in_count']) ? (int)$stats['checked_in_count'] : 0;
    }

    echo json_encode(array('success' => true, 'data' => $teams));
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = isset($input['action']) ? $input['action'] : '';

    if ($action === 'reassign') {
        $attendee_id = isset($input['attendeeId']) ? trim($input['attendeeId']) : '';
        $team_id = isset($input['teamId']) ? trim($input['teamId']) : '';

        if (!$attendee_id || !$team_id) {
            http_response_code(400);
            echo json_encode(array('error' => 'Attendee ID and Team ID are required'));
            exit;
        }

        $stmt = $pdo->prepare("UPDATE attendees SET team_id = ? WHERE id = ?");
        $stmt->execute(array($team_id, $attendee_id));
        echo json_encode(array('success' => true, 'message' => "Participant reassigned to {$team_id}"));
        exit;
    }

    if ($action === 'autobalance') {
        $attStmt = $pdo->query("SELECT id FROM attendees ORDER BY id ASC");
        $all = $attStmt->fetchAll(PDO::FETCH_COLUMN);
        $teamList = array('TEAM-1', 'TEAM-2', 'TEAM-3', 'TEAM-4');

        $updateStmt = $pdo->prepare("UPDATE attendees SET team_id = ? WHERE id = ?");
        foreach ($all as $index => $attId) {
            $assignedTeam = $teamList[$index % count($teamList)];
            $updateStmt->execute(array($assignedTeam, $attId));
        }

        echo json_encode(array('success' => true, 'message' => 'Teams balanced evenly across 4 teams'));
        exit;
    }

    http_response_code(400);
    echo json_encode(array('error' => 'Invalid action'));
    exit;
}
