<?php
require_once __DIR__ . '/auth.php';

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';

    if ($username === ADMIN_USER && $password === ADMIN_PASS) {
        $_SESSION['snd_admin_logged_in'] = true;
        $_SESSION['snd_admin_user'] = 'admin';
        $_SESSION['snd_admin_login_time'] = time();
        header('Location: index.php');
        exit;
    } else {
        $error = 'Invalid admin username or password. Please try again.';
    }
}

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: login.php');
    exit;
}

if (isAdminLoggedIn()) {
    header('Location: index.php');
    exit;
}
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#11133f" />
    <title>Admin Login | ISN Sports Nutrition Day 2026</title>
    <link rel="icon" type="image/svg+xml" href="isn-symbol.svg" />
    <link rel="stylesheet" href="styles.css?v=4" />
    <style>
      .login-shell {
        min-height: 100vh;
        background: radial-gradient(circle at 50% 20%, #1c205e 0%, #11133f 65%, #0a0c28 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
      }
      .login-box {
        background: #ffffff;
        border: 1.5px solid #d5d8e6;
        border-radius: 18px;
        box-shadow: 0 24px 70px rgba(8, 11, 44, .45);
        max-width: 440px;
        width: 100%;
        overflow: hidden;
      }
      .login-header {
        background: linear-gradient(135deg, #11133f 0%, #1b1e59 100%);
        padding: 30px 24px 24px;
        text-align: center;
        color: #ffffff;
        position: relative;
      }
      .login-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--green);
      }
      .login-body {
        padding: 28px 24px 32px;
      }
      .login-error {
        background: #fff0ef;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #b7423b;
        font-size: 12px;
        font-weight: 600;
        padding: 10px 14px;
        margin-bottom: 18px;
      }
      .login-meta-box {
        margin-top: 22px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 12px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
  </head>
  <body>
    <div class="login-shell">
      <div class="login-box">
        <div class="login-header">
          <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:12px;">
            <img src="assets/brand/perform-snd-lockup.png" alt="PERFORM SND" style="height:32px;filter:brightness(0) invert(1);" />
            <img src="assets/brand/isn-organiser-lockup.png" alt="ISN" style="height:28px;filter:brightness(0) invert(1);" />
          </div>
          <span class="hero-badge" style="background:rgba(255,255,255,.15);color:#fff;margin-bottom:8px;">ISN SPORTS NUTRITION DAY 2026</span>
          <h2 style="color:#ffffff;font-size:20px;margin:8px 0 4px;font-family:'Manrope',sans-serif;font-weight:800;">Admin Event Control</h2>
          <p style="color:#c5c8e4;font-size:11px;margin:0;">Sign in to access attendee check-in desk & operations</p>
        </div>

        <div class="login-body">
          <?php if (!empty($error)): ?>
            <div class="login-error">
              <?php echo htmlspecialchars($error); ?>
            </div>
          <?php endif; ?>

          <form method="POST" action="login.php">
            <div class="form-grid" style="grid-template-columns:1fr;gap:16px;">
              <div class="form-field full">
                <label class="form-label" for="username">Admin Username</label>
                <input class="form-input" type="text" id="username" name="username" placeholder="Enter admin username" required autofocus autocomplete="username" />
              </div>
              <div class="form-field full">
                <label class="form-label" for="password">Password</label>
                <input class="form-input" type="password" id="password" name="password" placeholder="Enter password" required autocomplete="current-password" />
              </div>
            </div>

            <button class="button button-primary" type="submit" style="width:100%;min-height:44px;font-size:13px;margin-top:20px;font-weight:700;">
              Log In to Event Portal &rarr;
            </button>
          </form>

          <div class="login-meta-box">
            <span>Are you an attendee?</span>
            <a href="feedback.html" style="color:var(--green-deep);font-weight:700;text-decoration:none;">Go to Feedback Form &rarr;</a>
          </div>
        </div>
      </div>
      <div style="margin-top:20px;color:#94a3b8;font-size:11px;">
        Institut Sukan Negara (ISN) &bull; Sports Nutrition Day 2026
      </div>
    </div>
  </body>
</html>

