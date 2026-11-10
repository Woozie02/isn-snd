<?php
// Zero-dependency pure PHP Certificate Generator
// Generates official PDF certificate from high-res background image and overlays recipient name
// Works on ANY PHP 5.6+ with standard GD extension without requiring Python/CLI

function generateParticipantCertificatePDF($name, $outputPath = '') {
    $bgPath = __DIR__ . '/assets/cert_bg.png';
    if (!file_exists($bgPath)) {
        $bgPath = __DIR__ . '/../assets/cert_bg.png';
    }
    if (!file_exists($bgPath)) {
        return false;
    }

    $im = @imagecreatefrompng($bgPath);
    if (!$im) {
        return false;
    }

    $wPx = imagesx($im);
    $hPx = imagesy($im);

    // Extract raw 24-bit RGB pixel buffer
    $rawPixels = '';
    for ($y = 0; $y < $hPx; $y++) {
        for ($x = 0; $x < $wPx; $x++) {
            $rgb = imagecolorat($im, $x, $y);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;
            $rawPixels .= chr($r) . chr($g) . chr($b);
        }
    }
    imagedestroy($im);

    $compImg = gzcompress($rawPixels, 6);
    unset($rawPixels);

    $pageW = 595.28;
    $pageH = 841.89;

    $cleanName = strtoupper(trim($name));
    $nameLen = strlen($cleanName);
    $fontSize = ($nameLen < 28) ? 22 : (($nameLen < 40) ? 18 : 14);
    $charW = $fontSize * 0.58;
    $textW = $nameLen * $charW;
    $startX = max(25.0, ($pageW - $textW) / 2.0);

    // PDF stream
    $stream = "q\n" .
              sprintf("%.2f 0 0 %.2f 0 0 cm\n", $pageW, $pageH) .
              "/Im1 Do\n" .
              "Q\n" .
              "BT\n" .
              "/F1 " . $fontSize . " Tf\n" .
              "0.067 0.075 0.247 rg\n" .
              sprintf("1 0 0 1 %.2f 422 Tm\n", $startX) .
              "(" . addcslashes($cleanName, "()\\") . ") Tj\n" .
              "ET\n";

    $compStream = gzcompress($stream, 9);

    $objs = array();
    $objs[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj";
    $objs[2] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj";
    $objs[3] = "3 0 obj\n<< /Type /Page\n   /Parent 2 0 R\n   /MediaBox [0 0 " . sprintf("%.2f %.2f", $pageW, $pageH) . "]\n   /Contents 4 0 R\n   /Resources <<\n      /Font << /F1 5 0 R >>\n      /XObject << /Im1 6 0 R >>\n   >>\n>>\nendobj";
    $objs[4] = "4 0 obj\n<< /Length " . strlen($compStream) . " /Filter /FlateDecode >>\nstream\n" . $compStream . "\nendstream\nendobj";
    $objs[5] = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj";
    $objs[6] = "6 0 obj\n<< /Type /XObject\n   /Subtype /Image\n   /Width " . $wPx . "\n   /Height " . $hPx . "\n   /ColorSpace /DeviceRGB\n   /BitsPerComponent 8\n   /Filter /FlateDecode\n   /Length " . strlen($compImg) . "\n>>\nstream\n" . $compImg . "\nendstream\nendobj";

    $body = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    $offsets = array(0 => 0);
    for ($i = 1; $i <= 6; $i++) {
        $offsets[$i] = strlen($body);
        $body .= $objs[$i] . "\n";
    }

    $xrefOffset = strlen($body);
    $body .= "xref\n0 7\n";
    $body .= "0000000000 65535 f \n";
    for ($i = 1; $i <= 6; $i++) {
        $body .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }

    $body .= "trailer\n<< /Size 7\n   /Root 1 0 R\n>>\nstartxref\n" . $xrefOffset . "\n%%EOF\n";

    if ($outputPath) {
        $dir = dirname($outputPath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        file_put_contents($outputPath, $body);
        return file_exists($outputPath);
    }

    return $body;
}
