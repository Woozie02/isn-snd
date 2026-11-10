<?php
// Central Configuration for Database and SMTP
// Automatically detects environment (Local XAMPP vs Production Webmin/Linux)

$isProduction = (isset($_SERVER['SERVER_ADDR']) && $_SERVER['SERVER_ADDR'] === '124.13.212.211')
    || (isset($_SERVER['HTTP_HOST']) && strpos($_SERVER['HTTP_HOST'], '124.13.212.211') !== false)
    || (file_exists('/etc/webmin'));

if ($isProduction) {
    // Production Database Settings
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', '3306');
    define('DB_NAME', 'snd');
    define('DB_USER', 'snd');
    define('DB_PASS', 'kHWGCU8Tv3g3yBr');
} else {
    // Local XAMPP Settings
    define('DB_HOST', '127.0.0.1');
    define('DB_PORT', '3306');
    define('DB_NAME', 'snd26');
    define('DB_USER', 'root');
    define('DB_PASS', 'ICTasset123!');
}

// SMTP Mail Configuration
define('MAIL_MAILER', 'smtp');
define('MAIL_HOST', 'postmaster2.mygovuc.gov.my');
define('MAIL_PORT', 587);
define('MAIL_USERNAME', 'isn-news@isn.gov.my');
define('MAIL_PASSWORD', 'mnLxsu{fe5h8VkNg)#f}5&');
define('MAIL_ENCRYPTION', 'tls');
define('MAIL_FROM_ADDRESS', 'snd26@isn.gov.my');
define('MAIL_FROM_NAME', 'SND 2026 - Institut Sukan Negara');

