<?php
/**
 * PROMEX iletişim formu – e-posta gönderici
 * Alıcı: info@promexturkey.com
 * Site formu bu dosyaya JSON olarak POST eder, cevap JSON döner.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const ALICI  = 'info@promexturkey.com';
const GONDEREN = 'noreply@promexturkey.com'; // SMTP ayarı yoksa kullanılır (mail() yedeği)

function cevap(int $kod, bool $ok, string $mesaj = ''): void {
    http_response_code($kod);
    echo json_encode(['ok' => $ok, 'message' => $mesaj], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') cevap(405, false, 'Method not allowed');

$ham = file_get_contents('php://input');
$veri = json_decode($ham, true);
if (!is_array($veri)) $veri = $_POST;

// Spam tuzağı (görünmez alan)
if (!empty($veri['_hp'])) cevap(200, true);

function temiz($s, int $max = 2000): string {
    $s = is_string($s) ? $s : '';
    $s = str_replace(["\r", "\0"], '', $s);
    $s = trim(strip_tags($s));
    return mb_substr($s, 0, $max);
}
function tek_satir($s, int $max = 200): string {
    return str_replace("\n", ' ', temiz($s, $max));
}

$ad      = tek_satir($veri['name'] ?? '');
$sirket  = tek_satir($veri['company'] ?? '');
$eposta  = tek_satir($veri['email'] ?? '', 254);
$telefon = tek_satir($veri['phone'] ?? '', 50);
$tur     = tek_satir($veri['event_type'] ?? '');
$kisi    = tek_satir($veri['attendees'] ?? '', 50);
$mesaj   = temiz($veri['message'] ?? '');
$kvkk    = !empty($veri['kvkk']);

if ($ad === '' || $mesaj === '' || !filter_var($eposta, FILTER_VALIDATE_EMAIL) || !$kvkk) {
    cevap(422, false, 'Eksik veya hatalı alan');
}

// Basit hız sınırı: aynı IP'den 30 saniyede en fazla 1 gönderim
$ip = $_SERVER['REMOTE_ADDR'] ?? 'x';
$kilit = sys_get_temp_dir() . '/promex_form_' . md5($ip);
if (is_file($kilit) && time() - filemtime($kilit) < 30) cevap(429, false, 'Çok sık deneme');
@touch($kilit);

$konu = '=?UTF-8?B?' . base64_encode('Web sitesi teklif talebi - ' . $ad) . '?=';
$govde = "Web sitesinden yeni bir talep geldi.\n\n"
       . "Ad Soyad: $ad\n"
       . "Şirket: $sirket\n"
       . "E-posta: $eposta\n"
       . "Telefon: $telefon\n"
       . "Etkinlik türü: $tur\n"
       . "Tahmini katılımcı: $kisi\n"
       . "KVKK onayı: Evet\n\n"
       . "Mesaj:\n$mesaj\n\n"
       . "--\nGönderim zamanı: " . date('d.m.Y H:i') . "\nIP: $ip\n";

/**
 * SMTP ayarı: parolayı bu dosyaya YAZMAYIN.
 * Ayarlar public_html'in bir üst klasöründeki promex-ayar.php dosyasından okunur
 * (örnek: /home/KULLANICI/promex-ayar.php). Dosya yoksa PHP mail() yedeği denenir.
 */
$ayarDosyasi = dirname(__DIR__) . '/promex-ayar.php';
$ayar = is_file($ayarDosyasi) ? include $ayarDosyasi : null;

function smtp_gonder(array $a, string $kime, string $konu, string $govde, string $yanitla, &$hata = ''): bool {
    $son_yanit = '';
    $sifreleme = $a['sifreleme'] ?? 'ssl';
    $host = ($sifreleme === 'ssl' ? 'ssl://' : '') . $a['sunucu'];
    // Yerel (aynı sunucudaki) SMTP için sertifika adı uyuşmaz; yalnızca localhost'ta doğrulamayı kapat
    $yerel = in_array($a['sunucu'], array('localhost', '127.0.0.1'), true);
    $baglam = stream_context_create(array('ssl' => array(
        'verify_peer'      => !$yerel,
        'verify_peer_name' => !$yerel,
        'allow_self_signed' => $yerel,
    )));
    $fp = @stream_socket_client($host . ':' . (int)$a['port'], $en, $es, 15, STREAM_CLIENT_CONNECT, $baglam);
    if (!$fp) { $hata = 'baglanti kurulamadi: ' . $es . ' ' . $en; return false; }
    stream_set_timeout($fp, 15);
    $oku = function () use ($fp, &$son_yanit) {
        $s = '';
        while (($satir = fgets($fp, 515)) !== false) {
            $s .= $satir;
            if (strlen($satir) < 4 || $satir[3] === ' ') break;
        }
        $son_yanit = $s;
        return $s;
    };
    $yaz = function (string $k) use ($fp, $oku) { fwrite($fp, $k . "\r\n"); return $oku(); };
    $kod = function (string $r) { return (int)substr($r, 0, 3); };

    if ($kod($oku()) !== 220) { $hata = 'selamlama: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    $ehlo = 'promexturkey.com';
    if ($kod($yaz("EHLO $ehlo")) !== 250) { $hata = 'EHLO: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    if ($sifreleme === 'tls') {
        if ($kod($yaz('STARTTLS')) !== 220) { $hata = 'STARTTLS: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
        if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { $hata = 'TLS: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
        if ($kod($yaz("EHLO $ehlo")) !== 250) { $hata = 'EHLO2: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    }
    if ($kod($yaz('AUTH LOGIN')) !== 334) { $hata = 'AUTH: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    if ($kod($yaz(base64_encode($a['kullanici']))) !== 334) { $hata = 'kullanici: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    if ($kod($yaz(base64_encode(trim($a['parola'])))) !== 235) { $hata = 'parola (giris reddedildi): ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    if ($kod($yaz('MAIL FROM:<' . $a['kullanici'] . '>')) !== 250) { $hata = 'MAIL FROM: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    if ($kod($yaz('RCPT TO:<' . $kime . '>')) !== 250) { $hata = 'RCPT TO: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }
    if ($kod($yaz('DATA')) !== 354) { $hata = 'DATA: ' . trim(substr($son_yanit, 0, 120)); fclose($fp); return false; }

    $basliklar = "Date: " . date('r') . "\r\n"
        . "From: PROMEX Web Sitesi <" . $a['kullanici'] . ">\r\n"
        . "To: <$kime>\r\n"
        . "Reply-To: <$yanitla>\r\n"
        . "Subject: $konu\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n";
    $icerik = chunk_split(base64_encode($govde));
    fwrite($fp, $basliklar . "\r\n" . $icerik . "\r\n.\r\n");
    $son = $oku();
    $yaz('QUIT');
    fclose($fp);
    if ($kod($son) !== 250) { $hata = 'gonderim sonucu: ' . trim(substr($son, 0, 120)); return false; }
    return true;
}

$gitti = false;
if (is_array($ayar) && !empty($ayar['kullanici']) && !empty($ayar['parola'])) {
    $hata = '';
    $gitti = smtp_gonder($ayar, ALICI, $konu, $govde, $eposta, $hata);
    if (!$gitti) {
        // Hatanın nedeni (şifre yazılmaz): public_html'in üstündeki promex-mail-log.txt
        @file_put_contents(dirname(__DIR__) . '/promex-mail-log.txt', date('Y-m-d H:i:s') . ' SMTP hata -> ' . $hata . "\n", FILE_APPEND);
    }
}
if (!$gitti) {
    $basliklar = [
        'From'         => 'PROMEX Web Sitesi <' . GONDEREN . '>',
        'Reply-To'     => $eposta,
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'X-Mailer'     => 'PHP/' . PHP_VERSION,
    ];
    $gitti = @mail(ALICI, $konu, $govde, $basliklar, '-f' . GONDEREN);
    @file_put_contents(dirname(__DIR__) . '/promex-mail-log.txt', date('Y-m-d H:i:s') . ' yedek mail() sonucu -> ' . ($gitti ? 'kabul edildi' : 'basarisiz') . "\n", FILE_APPEND);
}
if (!$gitti) { @unlink($kilit); cevap(500, false, 'Gönderilemedi'); }

cevap(200, true);
