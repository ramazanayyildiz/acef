# Ortak değişmezler (tüm dilimler) — <PROJE>

Bu belge tekrar eden kabul metinlerinin TEK yeridir. Dilim dosyaları kuralı yeniden yazmaz; yalnız `I<n>` ile atıf verir ve dilime özgü istisnayı yazar. Bir kural değişirse burada değişir.

Her değişmez dört alan taşır:
- **Kural** — tek paragraf, sınanabilir cümle. "Genellikle", "mümkünse" yok.
- **Kaynak** — ilk koyan dilim ya da karar (tarihli).
- **Nasıl sınanır** — hangi tür test (birim, feature, iki süreçli yarış, tarayıcı, statik tarama).
- **Sabitleyen testler** — `kısaltma:test_adı` listesi. Test olmayan değişmez "sabitlenmedi" diye işaretlenir ve backlog'a girer.

Kısaltmalar: `<XX>`=`<TestSınıfı>`, `<YY>`=`<TestSınıfı>`.

## Yazma yolu ve yetki

**I1 <Başlık>.** <Kural.>
- Kaynak: <DİLİM-ID / karar, YYYY-MM-DD>
- Nasıl sınanır: <…>
- Sabitleyen testler: `<XX>:test_<…>`, `<YY>:test_<…>`
- *<YYYY-MM-DD> notu (<DİLİM-ID>):* <sonradan eklenen istisna; kural metni değişmez, not eklenir>

**I2 <Başlık>.** <Kural.>
- Kaynak: <…>
- Nasıl sınanır: <…>
- Sabitleyen testler: <…>

## Veri, metin ve gizlilik

**I<n> <Başlık>.** <…>

## Arayüz

**I<n> <Başlık>.** <…>

## Test ve çalıştırma

**I<n> Port ve DB.** Her hat kendi port aralığından (`<başlangıç>–<bitiş>`) ve kendi test DB'sinden (`<app>_testing_l<N>`) çalışır; ana önizleme portu `<port>` ve paylaşılan DB'ye yazılmaz.
- Sabitleyen testler: <ör. test yardımcısı ana portta çıkış 2 verir>

İyi değişmez örüntüleri (rebuild'den): adlandırılmış eylem / genel transition yok; rol ve kiracı kapsamı her istekte sunucuda; kilit sırası ve atomiklik; idempotentlik (ilk değer kalır); bayat sekme sürüm belirteci; iki süreçli yarış testi (zorlanmış sıra yok); yazma yollarının kapanışı tek kümeden.
