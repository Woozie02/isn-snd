<?php
require_once __DIR__ . '/auth.php';
requireAdminAuth();
?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#11133f" />
    <meta name="description" content="ISN Sports Nutrition Day 2026 event management portal" />
    <title>ISN Sports Nutrition Day 2026 | Event Portal</title>
    <link rel="icon" type="image/svg+xml" href="isn-symbol.svg" />
    <link rel="stylesheet" href="styles.css?v=4" />
    <script src="qrcode.js" defer></script>
    <script src="app.js?v=8" defer></script>
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar" aria-label="Main navigation">
        <a class="brand-lockup" href="#overview" aria-label="ISN event portal overview" data-nav="overview">
          <img class="brand-mark" src="isn-symbol.svg" alt="" />
          <span class="brand-copy"><strong>ISN <span>PERFORM</span></strong><small>EVENT CONTROL</small></span>
        </a>

        <div class="workspace-label">EVENT WORKSPACE</div>
        <div class="event-switcher">
          <span class="event-switcher-mark">S</span>
          <span class="event-switcher-copy"><strong>Sports Nutrition Day</strong><small>2026 · ISN Malaysia</small></span>
          <span class="switcher-chevron" aria-hidden="true">⌄</span>
        </div>

        <div class="nav-label">MANAGE EVENT</div>
        <nav class="primary-nav">
          <button class="nav-item active" type="button" data-nav="overview" aria-current="page">
            <span class="nav-icon" data-icon="grid"></span><span>Overview</span>
          </button>
          <button class="nav-item" type="button" data-nav="attendance">
            <span class="nav-icon" data-icon="users"></span><span>Attendance</span><span class="nav-count" id="nav-attendee-count">10</span>
          </button>
          <button class="nav-item" type="button" data-nav="teams">
            <span class="nav-icon" data-icon="spark"></span><span>Teams (4)</span>
          </button>
          <button class="nav-item" type="button" data-nav="feedback">
            <span class="nav-icon" data-icon="chat"></span><span>Feedback</span><span class="nav-dot"></span>
          </button>
        </nav>

        <div class="sidebar-spacer"></div>
        <div class="sidebar-event-card">
          <div class="sidebar-event-top"><span class="pulse-dot"></span><span>REGISTRATION OPEN</span></div>
          <p>9 days until event day</p>
          <div class="mini-progress"><span></span></div>
          <small>ISN SPORTS NUTRITION DAY ’26</small>
        </div>
        <button class="sidebar-help" type="button" data-action="help"><span data-icon="help"></span><span>Help &amp; support</span></button>
        <div class="sidebar-user">
          <div class="user-avatar">AD</div>
          <div class="user-copy"><strong>Admin User</strong><small>Event Administrator</small></div>
          <a href="login.php?logout=1" class="more-button" title="Sign out" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;color:#fff;">⎋</a>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <div class="topbar-context"><span class="breadcrumb-muted">ISN EVENTS</span><span class="breadcrumb-divider">/</span><span id="topbar-section">Overview</span></div>
          <div class="topbar-actions">
            <span class="environment-pill"><span class="pulse-dot"></span> XAMPP MYSQL · LIVE</span>
            <button class="button button-primary" type="button" data-action="show-qr" style="min-height:34px;padding:0 12px;font-size:11px;">
              <span data-icon="spark"></span> Event QR Codes
            </button>
            <a href="checkin.html" target="_blank" class="button button-outline" style="min-height:34px;padding:0 12px;font-size:11px;text-decoration:none;">
              Self Check-In ↗
            </a>
            <a href="feedback.html" target="_blank" class="button button-outline" style="min-height:34px;padding:0 12px;font-size:11px;text-decoration:none;">
              Feedback Portal ↗
            </a>
            <button class="icon-button notification-button" type="button" aria-label="Notifications" data-action="notifications"><span data-icon="bell"></span><i></i></button>
            <span class="topbar-separator"></span>
            <div class="topbar-user">
              <div class="user-avatar small">AD</div>
              <span>admin</span>
              <a href="login.php?logout=1" style="color:#ef4444;font-size:11px;margin-left:8px;text-decoration:none;font-weight:700;">Logout</a>
            </div>
          </div>
        </header>
        <div id="page-content" class="page-content" tabindex="-1"></div>
      </main>
    </div>

    <div id="dialog-root"></div>
    <div id="toast-region" class="toast-region" role="status" aria-live="polite"></div>
  </body>
</html>

