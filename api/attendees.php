<?php
require_once __DIR__ . '/db.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($method === 'GET') {
    $team = isset($_GET['team']) ? trim($_GET['team']) : '';
    $status = isset($_GET['status']) ? trim($_GET['status']) : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    $query = "SELECT a.*, t.name as team_name, t.color_code as team_color, t.bg_tint as team_bg 
              FROM attendees a 
              LEFT JOIN teams t ON a.team_id = t.id 
              WHERE 1=1";
    $params = array();

    if ($team && $team !== 'all') {
        $query .= " AND a.team_id = ?";
        $params[] = $team;
    }
    if ($status === 'checked') {
        $query .= " AND a.checked_in = 1";
    } elseif ($status === 'pending') {
        $query .= " AND a.checked_in = 0";
    }
    if ($search) {
        $cleanPhoneSearch = preg_replace('/[^0-9]/', '', $search);
        
        if (!empty($cleanPhoneSearch) && strlen($cleanPhoneSearch) >= 3) {
            $query .= " AND (a.name LIKE ? OR a.email LIKE ? OR a.id LIKE ? OR a.category LIKE ? OR a.institution LIKE ? OR REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(a.phone, ''), '-', ''), ' ', ''), '+', ''), '(', '') LIKE ?)";
            $wildcard = "%{$search}%";
            $phoneWildcard = "%{$cleanPhoneSearch}%";
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $phoneWildcard;
        } else {
            $query .= " AND (a.name LIKE ? OR a.email LIKE ? OR a.id LIKE ? OR a.category LIKE ? OR a.institution LIKE ? OR a.phone LIKE ?)";
            $wildcard = "%{$search}%";
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
            $params[] = $wildcard;
        }
    }

    $query .= " ORDER BY a.id ASC";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['checkedIn'] = (bool)$row['checked_in'];
        $row['checkedAt'] = $row['checked_at'];
        $row['team'] = $row['team_id'];
        $row['teamName'] = $row['team_name'];
        $row['teamColor'] = $row['team_color'];
        $row['teamBg'] = $row['team_bg'];
        $row['registered'] = $row['registered_at'];
        $row['phone'] = !empty($row['phone']) ? $row['phone'] : '';
        $row['institution'] = !empty($row['institution']) ? $row['institution'] : '';
        $row['remarks'] = !empty($row['remarks']) ? $row['remarks'] : '';
    }

    echo json_encode(array('success' => true, 'data' => $rows));
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(array('error' => 'Invalid JSON input'));
        exit;
    }

    $name = isset($input['name']) ? trim($input['name']) : '';
    $email = isset($input['email']) ? trim($input['email']) : '';
    $phone = isset($input['phone']) ? trim($input['phone']) : '';
    $category = isset($input['category']) ? trim($input['category']) : 'Participant';
    $institution = isset($input['institution']) ? trim($input['institution']) : '';
    $remarks = isset($input['remarks']) ? trim($input['remarks']) : '';
    $ticket = isset($input['ticket']) ? trim($input['ticket']) : 'Standard';
    $team_id = isset($input['team']) ? trim($input['team']) : 'TEAM-1';

    if (!$name || !$email) {
        http_response_code(400);
        echo json_encode(array('error' => 'Name and email are required'));
        exit;
    }

    // Calculate next ID based on MAX existing number, not COUNT
    $maxStmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(id, 7) AS UNSIGNED)) FROM attendees WHERE id LIKE 'ISN-26%'");
    $maxNum = (int)$maxStmt->fetchColumn();
    $nextNum = max($maxNum + 1, 1);
    $id = 'ISN-26' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);

    $parts = explode(' ', $name);
    $initials = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));
    $registered_at = date('d M Y');

    try {
        $stmt = $pdo->prepare("INSERT INTO attendees (id, name, email, phone, category, institution, ticket, team_id, initials, checked_in, checked_at, registered_at, remarks) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?, ?)");
        $stmt->execute(array($id, $name, $email, $phone, $category, $institution, $ticket, $team_id, $initials, $registered_at, $remarks));

        echo json_encode(array(
            'success' => true,
            'data' => array(
                'id' => $id,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'category' => $category,
                'institution' => $institution,
                'ticket' => $ticket,
                'team' => $team_id,
                'initials' => $initials,
                'checkedIn' => false,
                'checkedAt' => '',
                'registered' => $registered_at,
                'remarks' => $remarks,
            )
        ));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array('error' => 'Failed to add attendee: ' . $e->getMessage()));
    }
    exit;
}

if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(array('error' => 'Invalid JSON input'));
        exit;
    }

    $id = isset($input['id']) ? trim($input['id']) : '';
    if (!$id) {
        http_response_code(400);
        echo json_encode(array('error' => 'Participant ID is required'));
        exit;
    }

    $name = isset($input['name']) ? trim($input['name']) : '';
    $email = isset($input['email']) ? trim($input['email']) : '';
    $phone = isset($input['phone']) ? trim($input['phone']) : '';
    $category = isset($input['category']) ? trim($input['category']) : '';
    $institution = isset($input['institution']) ? trim($input['institution']) : '';
    $remarks = isset($input['remarks']) ? trim($input['remarks']) : '';
    $ticket = isset($input['ticket']) ? trim($input['ticket']) : 'Standard';
    $team_id = isset($input['team']) ? trim($input['team']) : '';

    if (!$name) {
        http_response_code(400);
        echo json_encode(array('error' => 'Full name cannot be blank'));
        exit;
    }

    $parts = explode(' ', $name);
    $initials = strtoupper(substr($parts[0], 0, 1) . (isset($parts[1]) ? substr($parts[1], 0, 1) : ''));

    try {
        $stmt = $pdo->prepare("UPDATE attendees SET 
            name = ?, 
            email = ?, 
            phone = ?, 
            category = ?, 
            institution = ?, 
            remarks = ?, 
            ticket = ?, 
            team_id = IF(? = '', team_id, ?), 
            initials = ? 
            WHERE id = ?");
        $stmt->execute(array($name, $email, $phone, $category, $institution, $remarks, $ticket, $team_id, $team_id, $initials, $id));

        // Fetch updated row
        $fetchStmt = $pdo->prepare("SELECT a.*, t.name as team_name, t.color_code as team_color, t.bg_tint as team_bg 
                                    FROM attendees a 
                                    LEFT JOIN teams t ON a.team_id = t.id 
                                    WHERE a.id = ?");
        $fetchStmt->execute(array($id));
        $row = $fetchStmt->fetch();

        if ($row) {
            $row['checkedIn'] = (bool)$row['checked_in'];
            $row['checkedAt'] = $row['checked_at'];
            $row['team'] = $row['team_id'];
            $row['teamName'] = $row['team_name'];
            $row['teamColor'] = $row['team_color'];
            $row['teamBg'] = $row['team_bg'];
            $row['registered'] = $row['registered_at'];
            $row['phone'] = !empty($row['phone']) ? $row['phone'] : '';
            $row['institution'] = !empty($row['institution']) ? $row['institution'] : '';

            echo json_encode(array('success' => true, 'message' => 'Participant updated successfully', 'data' => $row));
        } else {
            http_response_code(404);
            echo json_encode(array('error' => 'Attendee not found'));
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array('error' => 'Failed to update attendee: ' . $e->getMessage()));
    }
    exit;
}

if ($method === 'DELETE') {
    $raw = file_get_contents('php://input');
    $input = !empty($raw) ? json_decode($raw, true) : null;
    $id = '';
    if (is_array($input) && isset($input['id'])) {
        $id = trim($input['id']);
    } elseif (isset($_GET['id'])) {
        $id = trim($_GET['id']);
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode(array('error' => 'Participant ID is required for deletion'));
        exit;
    }

    try {
        // Delete linked feedback first if any cascade isn't auto
        $pdo->prepare("DELETE FROM feedback WHERE attendee_id = ?")->execute(array($id));
        
        $stmt = $pdo->prepare("DELETE FROM attendees WHERE id = ?");
        $stmt->execute(array($id));

        if ($stmt->rowCount() > 0) {
            echo json_encode(array('success' => true, 'message' => "Participant {$id} deleted successfully."));
        } else {
            http_response_code(404);
            echo json_encode(array('error' => 'Participant record not found.'));
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array('error' => 'Failed to delete participant: ' . $e->getMessage()));
    }
    exit;
}
