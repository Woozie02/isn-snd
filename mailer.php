<?php
require_once __DIR__ . '/config.php';

/**
 * Lightweight, zero-dependency SMTP Mailer for PHP 5.6+ with TLS (STARTTLS) and AUTH LOGIN
 */
class SimpleSMTPMailer {
    private $host;
    private $port;
    private $user;
    private $pass;
    private $timeout = 20;

    public function __construct($host = MAIL_HOST, $port = MAIL_PORT, $user = MAIL_USERNAME, $pass = MAIL_PASSWORD) {
        $this->host = $host;
        $this->port = $port;
        $this->user = $user;
        $this->pass = $pass;
    }

    private function readResponse($socket) {
        $data = '';
        while (!feof($socket)) {
            $str = fgets($socket, 515);
            $data .= $str;
            if (substr($str, 3, 1) === ' ') {
                break;
            }
        }
        return $data;
    }

    private function sendCommand($socket, $cmd) {
        fputs($socket, $cmd . "\r\n");
        return $this->readResponse($socket);
    }

    public function sendEmail($to, $toName, $subject, $htmlBody, $textBody = '', $attachments = array()) {
        $from = MAIL_FROM_ADDRESS;
        $fromName = MAIL_FROM_NAME;

        $socket = @fsockopen($this->host, $this->port, $errno, $errstr, $this->timeout);
        if (!$socket) {
            return array('success' => false, 'error' => "Cannot connect to SMTP server: $errstr ($errno)");
        }

        stream_set_timeout($socket, $this->timeout);
        $res = $this->readResponse($socket);
        if (substr($res, 0, 3) !== '220') {
            fclose($socket);
            return array('success' => false, 'error' => "SMTP greeting error: $res");
        }

        // EHLO
        $res = $this->sendCommand($socket, 'EHLO ' . gethostname());
        if (substr($res, 0, 3) !== '250') {
            fclose($socket);
            return array('success' => false, 'error' => "EHLO failed: $res");
        }

        // STARTTLS
        $res = $this->sendCommand($socket, 'STARTTLS');
        if (substr($res, 0, 3) !== '220') {
            fclose($socket);
            return array('success' => false, 'error' => "STARTTLS failed: $res");
        }

        // Enable crypto on connection
        $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
            $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
        }
        if (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT')) {
            $cryptoMethod |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
        }

        $cryptoOk = stream_socket_enable_crypto($socket, true, $cryptoMethod);
        if (!$cryptoOk) {
            fclose($socket);
            return array('success' => false, 'error' => 'STARTTLS crypto negotiation failed.');
        }

        // EHLO after TLS
        $res = $this->sendCommand($socket, 'EHLO ' . gethostname());

        // AUTH LOGIN
        $res = $this->sendCommand($socket, 'AUTH LOGIN');
        if (substr($res, 0, 3) !== '334') {
            fclose($socket);
            return array('success' => false, 'error' => "AUTH LOGIN not accepted: $res");
        }

        $res = $this->sendCommand($socket, base64_encode($this->user));
        if (substr($res, 0, 3) !== '334') {
            fclose($socket);
            return array('success' => false, 'error' => "Username rejected: $res");
        }

        $res = $this->sendCommand($socket, base64_encode($this->pass));
        if (substr($res, 0, 3) !== '235') {
            fclose($socket);
            return array('success' => false, 'error' => "Authentication failed: $res");
        }

        // MAIL FROM
        $res = $this->sendCommand($socket, "MAIL FROM:<$from>");
        if (substr($res, 0, 3) !== '250') {
            fclose($socket);
            return array('success' => false, 'error' => "MAIL FROM failed: $res");
        }

        // RCPT TO
        $res = $this->sendCommand($socket, "RCPT TO:<$to>");
        if (substr($res, 0, 3) !== '250' && substr($res, 0, 3) !== '251') {
            fclose($socket);
            return array('success' => false, 'error' => "RCPT TO failed: $res");
        }

        // DATA
        $res = $this->sendCommand($socket, 'DATA');
        if (substr($res, 0, 3) !== '354') {
            fclose($socket);
            return array('success' => false, 'error' => "DATA failed: $res");
        }

        // Message Boundaries
        $mixedBoundary = "----=_MixedPart_" . md5(time() . rand());
        $altBoundary = "----=_AltPart_" . md5(time() . rand());

        $hasAttachments = is_array($attachments) && count($attachments) > 0;

        $headers = array();
        $headers[] = "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$from>";
        $headers[] = "To: =?UTF-8?B?" . base64_encode($toName) . "?= <$to>";
        $headers[] = "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=";
        $headers[] = "Date: " . date('r');
        $headers[] = "MIME-Version: 1.0";
        if ($hasAttachments) {
            $headers[] = "Content-Type: multipart/mixed; boundary=\"$mixedBoundary\"";
        } else {
            $headers[] = "Content-Type: multipart/alternative; boundary=\"$altBoundary\"";
        }
        $headers[] = "X-Mailer: ISN SND2026 Mailer";

        $body = implode("\r\n", $headers) . "\r\n\r\n";

        if ($hasAttachments) {
            $body .= "--$mixedBoundary\r\n";
            $body .= "Content-Type: multipart/alternative; boundary=\"$altBoundary\"\r\n\r\n";
        }

        // Plaintext Part
        if (!empty($textBody)) {
            $body .= "--$altBoundary\r\n";
            $body .= "Content-Type: text/plain; charset=utf-8\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $body .= chunk_split(base64_encode($textBody)) . "\r\n";
        }

        // HTML Part
        $body .= "--$altBoundary\r\n";
        $body .= "Content-Type: text/html; charset=utf-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";
        $body .= "--$altBoundary--\r\n";

        // Attachments
        if ($hasAttachments) {
            foreach ($attachments as $att) {
                if (isset($att['path']) && file_exists($att['path'])) {
                    $fileName = isset($att['name']) ? $att['name'] : basename($att['path']);
                    $mimeType = isset($att['type']) ? $att['type'] : 'application/pdf';
                    $fileContent = file_get_contents($att['path']);

                    $body .= "\r\n--$mixedBoundary\r\n";
                    $body .= "Content-Type: $mimeType; name=\"" . addslashes($fileName) . "\"\r\n";
                    $body .= "Content-Disposition: attachment; filename=\"" . addslashes($fileName) . "\"\r\n";
                    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
                    $body .= chunk_split(base64_encode($fileContent)) . "\r\n";
                }
            }
            $body .= "--$mixedBoundary--\r\n";
        }

        // End of DATA: CRLF . CRLF
        $body .= ".\r\n";

        fputs($socket, $body);
        $res = $this->readResponse($socket);

        $this->sendCommand($socket, 'QUIT');
        fclose($socket);

        if (substr($res, 0, 3) === '250') {
            return array('success' => true, 'message' => 'Email dispatched successfully via SMTP.');
        } else {
            return array('success' => false, 'error' => "Message rejected: $res");
        }
    }
}

