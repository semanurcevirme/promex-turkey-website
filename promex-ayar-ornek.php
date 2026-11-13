<?php
// ÖRNEK DOSYA. Gerçek parola içermez.
// Sunucuda, web'den erişilemeyen bir klasöre (public_html'in bir üstüne)
// "promex-ayar.php" adıyla kopyalanır ve gerçek değerler orada doldurulur.
return [
    'sunucu'    => 'smtp.example.com',
    'port'      => 465,
    'sifreleme' => 'ssl',            // 'ssl' veya 'tls'
    'kullanici' => 'noreply@example.com',
    'parola'    => 'BURAYA_PAROLA',
];
