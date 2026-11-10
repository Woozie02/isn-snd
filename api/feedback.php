<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../mailer.php';

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';

if ($method === 'GET') {
    $query = "SELECT f.*, a.name as attendee_name, a.email as attendee_email, a.phone as attendee_phone, a.category, a.institution,
                     t.id as team_id, t.name as team_name, t.color_code as team_color, t.bg_tint as team_bg
              FROM feedback f
              LEFT JOIN attendees a ON f.attendee_id = a.id
              LEFT JOIN teams t ON a.team_id = t.id
              ORDER BY f.created_at DESC";
    $stmt = $pdo->query($query);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['attendeeId'] = $row['attendee_id'];
        $row['q1_overall'] = (int)$row['q1_overall'];
        $row['q2_hydration'] = (int)$row['q2_hydration'];
        $row['q3_stations'] = (int)$row['q3_stations'];
        $row['q4_valuable'] = !empty($row['q4_valuable']) ? $row['q4_valuable'] : '';
        $row['q5_suggestions'] = !empty($row['q5_suggestions']) ? $row['q5_suggestions'] : '';
        $row['rating'] = (int)$row['rating'];
        $row['sessionRating'] = (int)$row['session_rating'];
        $row['date'] = $row['submitted_at'];
        $row['label'] = $row['attendee_name'];
        $row['email'] = $row['attendee_email'];
        $row['phone'] = $row['attendee_phone'];
        $row['teamName'] = $row['team_name'];
        $row['teamColor'] = $row['team_color'];
        $row['teamBg'] = $row['team_bg'];
        $row['institution'] = $row['institution'];
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

    $attendee_id = isset($input['attendeeId']) ? trim($input['attendeeId']) : '';
    
    // The 5 Workshop Questions
    $q1_overall = isset($input['q1_overall']) ? (int)$input['q1_overall'] : (isset($input['rating']) ? (int)$input['rating'] : 5);
    $q2_hydration = isset($input['q2_hydration']) ? (int)$input['q2_hydration'] : (isset($input['sessionRating']) ? (int)$input['sessionRating'] : 5);
    $q3_stations = isset($input['q3_stations']) ? (int)$input['q3_stations'] : 5;
    $q4_valuable = isset($input['q4_valuable']) ? trim($input['q4_valuable']) : (isset($input['comment']) ? trim($input['comment']) : '');
    $q5_suggestions = isset($input['q5_suggestions']) ? trim($input['q5_suggestions']) : '';

    // Legacy fields for backward compatibility
    $rating = $q1_overall;
    $session_rating = $q2_hydration;
    $recommend = isset($input['recommend']) ? trim($input['recommend']) : 'Yes';
    $comment = !empty($q4_valuable) ? $q4_valuable : (!empty($q5_suggestions) ? $q5_suggestions : 'Excellent workshop.');

    if (!$attendee_id) {
        http_response_code(400);
        echo json_encode(array('error' => 'Attendee selection is required'));
        exit;
    }

    // Check if feedback already submitted
    $checkStmt = $pdo->prepare("SELECT id FROM feedback WHERE attendee_id = ?");
    $checkStmt->execute(array($attendee_id));
    if ($checkStmt->fetch()) {
        http_response_code(400);
        echo json_encode(array('error' => 'Feedback has already been submitted for this participant.'));
        exit;
    }

    $countStmt = $pdo->query("SELECT COUNT(*) FROM feedback");
    $nextNum = $countStmt->fetchColumn() + 1;
    $id = 'FB-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
    $submitted_at = date('d M Y');

    try {
        $stmt = $pdo->prepare("INSERT INTO feedback 
            (id, attendee_id, q1_overall, q2_hydration, q3_stations, q4_valuable, q5_suggestions, rating, session_rating, recommend, comment, submitted_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute(array(
            $id, 
            $attendee_id, 
            $q1_overall, 
            $q2_hydration, 
            $q3_stations, 
            $q4_valuable, 
            $q5_suggestions, 
            $rating, 
            $session_rating, 
            $recommend, 
            $comment, 
            $submitted_at
        ));

        // Mark attendee as checked-in automatically
        $pdo->prepare("UPDATE attendees SET checked_in = 1, checked_at = IF(checked_at = '', ?, checked_at) WHERE id = ?")
            ->execute(array(date('g:i A'), $attendee_id));

        $attStmt = $pdo->prepare("SELECT a.*, t.name as team_name, t.color_code as team_color, t.bg_tint as team_bg 
                                  FROM attendees a 
                                  LEFT JOIN teams t ON a.team_id = t.id 
                                  WHERE a.id = ?");
        $attStmt->execute(array($attendee_id));
        $attendee = $attStmt->fetch();

        // Generate PDF Certificate from Template
        $certDir = __DIR__ . '/../assets/certificates';
        if (!is_dir($certDir)) {
            @mkdir($certDir, 0777, true);
        }
        $certFileName = 'Certificate_' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $attendee['id']) . '.pdf';
        $certPdfPath = $certDir . '/' . $certFileName;
        $certUrl = 'assets/certificates/' . $certFileName;

        $pyScript = __DIR__ . '/../generate_cert.py';
        $pyCmd = sprintf('python %s %s %s %s %s %s 2>&1',
            escapeshellarg($pyScript),
            escapeshellarg($attendee['name']),
            escapeshellarg($attendee['id']),
            escapeshellarg(!empty($attendee['institution']) ? $attendee['institution'] : ''),
            escapeshellarg(!empty($attendee['team_name']) ? $attendee['team_name'] : ''),
            escapeshellarg($certPdfPath)
        );
        @exec($pyCmd, $pyOutput, $pyReturn);

        // Dispatch email via MyGovUC SMTP Mailer
        $emailSent = false;
        $emailError = '';
        if ($attendee && !empty($attendee['email'])) {
            $mailer = new SimpleSMTPMailer();
            $subject = "Sijil Penyertaan / Certificate of Participation - ISN Sports Nutrition Day 2026";
            
            // Embed official ISN logo
            $logoPath = __DIR__ . '/../assets/logo_isn.png';
            $logoBase64 = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : '';
            $logoSrc = $logoBase64 ? 'data:image/png;base64,' . $logoBase64 : '';

            $attName = htmlspecialchars(strtoupper(trim($attendee['name'])));
            $attId = htmlspecialchars(trim($attendee['id']));
            $attInst = !empty($attendee['institution']) ? htmlspecialchars(trim($attendee['institution'])) : '';
            $attTeam = !empty($attendee['team_name']) ? htmlspecialchars(trim($attendee['team_name'])) : '';

            $metaLines = array();
            $metaLines[] = "Nombor Siri / Reg ID: <strong>{$attId}</strong>";
            if ($attInst) $metaLines[] = "Institusi: <strong>{$attInst}</strong>";
            if ($attTeam) $metaLines[] = "Kumpulan: <strong>{$attTeam}</strong>";
            $metaDisplay = implode(' &nbsp;|&nbsp; ', $metaLines);

            $htmlBody = '
            <!DOCTYPE html>
            <html lang="ms">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Sijil Penyertaan ISN SND 2026</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background-color: #f4f6fa; margin: 0; padding: 24px 12px; color: #1e293b; line-height: 1.55; }
                .email-card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                .email-header { background-color: #11133f; padding: 26px 24px; text-align: center; }
                .email-header img { height: 58px; width: auto; margin-bottom: 12px; }
                .email-header h1 { color: #ffffff; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: .02em; }
                .email-header p { color: #94a3b8; font-size: 12px; margin: 4px 0 0; }
                .email-body { padding: 28px 24px 20px; }
                .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
                .lead-text { font-size: 13.5px; color: #334155; margin-bottom: 18px; }
                .cert-panel { background: #f8fafc; border: 1.5px solid #cbd5e1; border-left: 4px solid #11133f; border-radius: 6px; padding: 14px 16px; margin: 18px 0; }
                .cert-panel-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
                .cert-panel-name { font-size: 17px; font-weight: 800; color: #11133f; margin-bottom: 6px; }
                .cert-panel-meta { font-size: 12px; color: #475569; }
                .attachment-notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin: 20px 0; font-size: 12.5px; color: #1e40af; display: flex; align-items: center; gap: 8px; }
                .email-footer { background-color: #f8fafc; padding: 18px 24px; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b; text-align: center; }
              </style>
            </head>
            <body>
              <div class="email-card">
                <div class="email-header">
                  ' . ($logoSrc ? '<img src="' . $logoSrc . '" alt="Institut Sukan Negara (ISN)" style="display:inline-block;" />' : '') . '
                  <h1>ISN SPORTS NUTRITION DAY 2026</h1>
                  <p>Institut Sukan Negara (ISN) Malaysia &bull; Cawangan Pemakanan Sukan</p>
                </div>
                <div class="email-body">
                  <div class="greeting">Salam sejahtera ' . htmlspecialchars($attendee['name']) . ',</div>
                  <div class="lead-text">
                    Terima kasih atas penyertaan aktif dan maklum balas anda bagi program <strong>ISN Sports Nutrition Day 2026</strong>:
                  </div>

                  <div class="cert-panel">
                    <div class="cert-panel-title">Sijil Penyertaan Rasmi / Certificate of Participation</div>
                    <div class="cert-panel-name">' . $attName . '</div>
                    <div class="cert-panel-meta">' . $metaDisplay . '</div>
                    <div style="margin-top:10px;font-size:12px;color:#334155;border-top:1px dashed #cbd5e1;padding-top:8px;">
                      Sesi: <em>"Hydration and Performance Nutrition: Strategies and Practices"</em><br>
                      Tarikh: <strong>11 November 2026</strong>
                    </div>
                  </div>

                  <div class="attachment-notice">
                    <span>📎</span>
                    <span><strong>Sijil PDF Rasmi Dilampirkan:</strong> Sila muat turun fail <code>' . htmlspecialchars($certFileName) . '</code> yang dilampirkan bersama emel ini untuk simpanan dan rekod anda.</span>
                  </div>

                  <p style="font-size:12.5px;color:#475569;margin:16px 0 0;">
                    Sekian, terima kasih atas sokongan anda dalam memperkasakan pemakanan sukan negara.
                  </p>
                </div>
                <div class="email-footer">
                  <strong>Institut Sukan Negara (ISN) Malaysia</strong><br>
                  Kompleks Sukan Negara, Bukit Jalil, 57000 Kuala Lumpur<br>
                  Emel ini dijana secara automatik oleh Sistem Kehadiran &amp; Persijilan SND 2026.
                </div>
              </div>
            </body>
            </html>
            ';

            $textBody = "Salam sejahtera {$attendee['name']},\n\nTerima kasih atas penyertaan anda dalam program ISN Sports Nutrition Day 2026 bagi sesi \"Hydration and Performance Nutrition: Strategies and Practices\" pada 11 November 2026.\n\nNama Peserta: " . strtoupper($attendee['name']) . "\nNombor Siri / Reg ID: {$attendee['id']}\n" . ($attendee['institution'] ? "Institusi: {$attendee['institution']}\n" : "") . "\nSijil penyertaan rasmi berformat PDF ({$certFileName}) telah dilampirkan bersama emel ini untuk simpanan dan rekod anda.\n\nSekian, terima kasih.\n\nInstitut Sukan Negara (ISN) Malaysia\nKompleks Sukan Negara, Bukit Jalil, 57000 Kuala Lumpur";

            $attachments = array();
            if (file_exists($certPdfPath)) {
                $attachments[] = array(
                    'path' => $certPdfPath,
                    'name' => $certFileName,
                    'type' => 'application/pdf'
                );
            }

            $sendResult = $mailer->sendEmail($attendee['email'], $attendee['name'], $subject, $htmlBody, $textBody, $attachments);
            if ($sendResult['success']) {
                $emailSent = true;
            } else {
                $emailError = $sendResult['error'];
                error_log("SMTP Error sending to {$attendee['email']}: " . $emailError);
            }
        }

        echo json_encode(array(
            'success' => true,
            'emailSent' => $emailSent,
            'emailError' => $emailError,
            'data' => array(
                'id' => $id,
                'attendeeId' => $attendee_id,
                'q1_overall' => $q1_overall,
                'q2_hydration' => $q2_hydration,
                'q3_stations' => $q3_stations,
                'q4_valuable' => $q4_valuable,
                'q5_suggestions' => $q5_suggestions,
                'rating' => $rating,
                'sessionRating' => $session_rating,
                'date' => $submitted_at,
                'label' => $attendee ? $attendee['name'] : 'Participant',
                'email' => $attendee ? $attendee['email'] : '',
                'institution' => $attendee ? $attendee['institution'] : '',
                'certUrl' => !empty($certUrl) ? $certUrl : '',
                'certFileName' => !empty($certFileName) ? $certFileName : '',
                'attendee' => $attendee
            )
        ));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array('error' => 'Failed to record feedback: ' . $e->getMessage()));
    }
    exit;
}
