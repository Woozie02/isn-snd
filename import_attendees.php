<?php
require_once __DIR__ . '/api/db.php';

$json = file_get_contents(__DIR__ . '/parsed_attendees.json');
$attendees = json_decode($json, true);

if (!$attendees || count($attendees) === 0) {
    die("No attendees found in JSON\n");
}

echo "Starting import of " . count($attendees) . " attendees...\n";

// Disable foreign key checks and clear attendees
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$pdo->exec("TRUNCATE TABLE feedback");
$pdo->exec("TRUNCATE TABLE attendees");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

$stmt = $pdo->prepare("INSERT INTO attendees (id, name, email, phone, category, institution, ticket, team_id, initials, checked_in, checked_at, registered_at, remarks) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', ?, NULL)");

$pdo->beginTransaction();
foreach ($attendees as $a) {
    $stmt->execute([
        $a['id'],
        $a['name'],
        $a['email'],
        $a['phone'],
        $a['category'],
        $a['institution'],
        $a['ticket'],
        $a['team_id'],
        $a['initials'],
        $a['registered_at']
    ]);
}
$pdo->commit();

$count = $pdo->query("SELECT count(*) FROM attendees")->fetchColumn();
echo "Import complete! Total attendees in database: $count\n";

$teamCounts = $pdo->query("SELECT t.name, count(a.id) as cnt FROM attendees a JOIN teams t ON a.team_id = t.id GROUP BY t.name")->fetchAll(PDO::FETCH_ASSOC);
echo "Teams breakdown:\n";
foreach ($teamCounts as $tc) {
    echo "- " . $tc['name'] . ": " . $tc['cnt'] . "\n";
}

$catCounts = $pdo->query("SELECT category, count(*) as cnt FROM attendees GROUP BY category")->fetchAll(PDO::FETCH_ASSOC);
echo "Category breakdown:\n";
foreach ($catCounts as $cc) {
    echo "- " . $cc['category'] . ": " . $cc['cnt'] . "\n";
}
