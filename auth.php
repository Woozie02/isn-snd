<?php
// Central Session & Admin Auth Check
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

define('ADMIN_USER', 'admin');
define('ADMIN_PASS', 'SND2026!');

function isAdminLoggedIn() {
    return isset($_SESSION['snd_admin_logged_in']) && $_SESSION['snd_admin_logged_in'] === true;
}

function requireAdminAuth() {
    if (!isAdminLoggedIn()) {
        header('Location: login.php');
        exit;
    }
}

