# İnceleme kontrol listesi

`review-brief.md` bu dosyayı zorunlu kılar. Her madde ya kanıtıyla işaretlenir ya da "uygulanmaz: <neden>" yazılır; boş madde = eksik inceleme. Kanıt dosyaları `<evidence>/<SLICE-ID>/review/` altına. Komutlar yığından bağımsızdır: yığına özgü komutlar `{{…}}` yer tutucularıdır ve `slice-method.json` → `stack_profile` doldurur; projeye özgü yollar `<…>`. Bir yığının hazır karşılıkları adaptördedir (`stacks/<yığın>/checklist-commands.md`). Kaynak: 2026-10-19 incelemelerinin gerçekten yakaladıkları (bkz. `SOURCES.md`).

Hangi katman: **A** her dilimde · **B** paket view/lang/config anahtarı değişince · **C** şablon/host hijyeni (UI, rota, config, migration dokunuşunda) · **D** TAM sınıfı (yetki/kiracı/para/durum/göç/güvenlik) · **E** paylaşılan sözleşme değişince.

Uygulanabilirlik (açık kural):
- **Tarayıcı / gerçek UI** (C4, D6 ve senaryo yürüyüşü) yalnız dilim UI'a dokunuyorsa: rota, görünüm/şablon ya da UI bileşeni. Dokunmuyorsa "uygulanmaz: rota/görünüm/bileşen yok".
- **Mutasyon** (A4): kural başına 3–5 mutasyon yalnız TAM'da. HAFİF'te davranış değişikliği başına bir mutasyon; yeni/değişen davranış yoksa "uygulanmaz: <neden>".
- **Hedefli yeniden inceleme** (REVISE sonrası, `review-r2.md`) AYNI inceleyici oturumunda yapılır, yeni oturumda değil; o oturum kaybolduysa nedeni r2 başlığına yazılır.

İnceleyici dilim ve dev raporundaki gerekçeyi doğrular; uygulanabilir kontrol atlanmaz. TAM şartları değişmez.

Kanıt atıfları `method/SLICE_LANE.md` "Evidence validity and reuse" kuralına tabidir: her koşunun tek kaydı, komut/sonuç/exit/test sayısı/log ve aday/main/merge-base/test/standart/ilgili ortam bağları vardır. A1'deki ilk bağımsız temiz koşu geliştirici raporuyla ikame edilmez. Geçerli geniş koşuyu A5 veya başka bir özet için yeniden üretme; kendi zorunlu hedefli kontrollerini yap. Değişim etkilenen kanıtı geçersizleştirir; etki sınırlanamıyorsa geniş koşu gerekir. TAM/yüksek risk tekrarları korunur.

## A — Her dilim

| # | Madde | Kanıt (komut / dosya) |
|---|---|---|
| A1 | İlk bağımsız temiz koşu: aday commit'in AYRI worktree'si, `git status --short` boş, dev raporundaki her komut; koordinatör veya inceleyici koşar | `git worktree add --detach <yol> <aday>`; komut → beklenen → gerçek → `A1-rerun.txt` veya doğrulanan kanonik kayıt; çalıştıran, bağlar, kapsam, güncel geçerlilik gerekçesi |
| A2 | İzinli liste dışında değişiklik yok | `git diff --name-only <taban>..<aday>` ile dilimin izinli listesi karşılaştırması → `A2-allowed.txt` |
| A3 | Kırmızı-önce kanıtı: yalnız-test commit'i ürün kodsuz kırmızı | `git checkout <test-sha> && <dilim testi>` → kırmızı sayısı → `A3-red-first.txt` |
| A4 | Geliştiricinin her mutasyonu inceleyici tarafından YENİDEN uygulandı + inceleyicinin kendi en az bir mutasyonu (TAM: kural başına 3–5; HAFİF: davranış değişikliği başına bir); HAFİF'te yeni/değişen davranış yoksa gerekçeli uygulanmaz | her biri için `<evidence>/…/review/mutations/M<n>.txt` (diff + kırmızı test çıktısı); sonda `git status --short` boş; ya da inceleyicinin doğruladığı uygulanmaz gerekçesi |
| A5 | Kapı, standart, statik analiz, sınır; geçerli bağımsız A1 kaydını aynı sonuç için tekrar üretme | `scripts/gate.sh <worktree>`, `{{standards_check}}`, `{{static_analysis}}`, `{{boundary_check}}` kanonik kayıtlarına atıf; geçersiz/eksik olan veya açıkça yeniden istenen kontrol yeniden koşulur |
| A6 | İddiaları doğrula, raporu değil: her "yapıldı/geçti" iddiasını bağımsız değerlendir; zorunlu hedefli kontroller kendi komutunla | iddia → kendi kanıtın veya geçerliliğini doğruladığın bağımsız geniş koşu kaydı; bağlantı tek başına doğrulama değildir |
| A7 | Güvenlik ön elemesi (HAFİF dahil her dilim): (a) diff bir rota, politika, kapı, middleware, sorgu kapsamı ya da dışa aktarım ekliyor/değiştiriyor mu? (b) kişisel veri, para, token ya da kimlik bilgisi içeren bir alanı okuyor/yazıyor mu? (c) başka bir kiracı ya da rol yeni yola ulaşabilir mi? D satırı cevabı olmadan bir "evet" → dilim TAM'a yeniden sınıflanır, inceleme durur | üç cevap, her biri `dosya:satır` ya da "hayır: <neden>" → `A7-triage.txt` |

## B — Paket anahtarı değişti (görünüm, çeviri, config, rota adı)

| # | Madde | Kanıt |
|---|---|---|
| B1 | Tüketici depolarda include ve atıflar (kaynak kaçak: paket görünüm adı değişti, hosttaki bir şablon kırıldı) | her host için `git -C <host> grep -n "<paket-öneki>"` → `B1-hosts.txt` (dosya:satır) |
| B2 | Hostlara yayınlanmış (kopyalanmış) paket dosyaları | `git -C <host> ls-files '<yayınlanmış görünüm yolu>/*' '<yayınlanmış çeviri yolu>/*' '<yayınlanmış config yolu>'` → `B2-published.txt` |
| B3 | Eski anahtar/ad geriye uyumlu duruyor ya da kırılma kayda geçti | dilimdeki K maddesi + host testi adı |

## C — Şablon ve host hijyeni

| # | Madde | Kanıt |
|---|---|---|
| C1 | Şablonlardaki her sabit rota adı kayıtlı | `git grep -ohE '<rota yardımcısı kalıbı>' -- <görünüm dizinleri> \| sort -u` ↔ `{{route_list}}` → `C1-route-literals.txt` (fark 0) |
| C2 | İzin ve gezinme config'indeki her rota adı kayıtlı | rota kaydı sorgusu döngüsü (mimari test ya da `{{app_shell}}`) → `C2-config-routes.txt` |
| C3 | Rol başına bağlantı taraması: render edilen sayfalardaki her aynı-site `<a href>` o kullanıcıyla GET → 200 (302 de kırmızı) | feature test adı (ör. `DashboardLinksTest`) + boş tarama yakalayan `assertNotEmpty` |
| C4 | 390 px'te yatay taşma yok, rol başına | tarayıcı: `document.documentElement.scrollWidth <= 390` → `C4-390-<rol>.png` + değer |
| C5 | Silinen kodun statik analiz baseline girdileri temizlendi; yeni yok sayma yok | `git diff <taban>..<aday> -- <statik analiz baseline dosyası>` yalnız silme; `{{static_analysis}}` eşleşmeyen yok sayma uyarısı vermiyor |
| C6 | Env/config adı kayması (ör. `<ESKİ_ENV_ADI>` ↔ `<YENİ_ENV_ADI>`) | `git grep -n '<env okuma kalıbı>' -- <config dizini>` ↔ `.env.example`, test ortamı config'i → `C6-env.txt` |
| C7 | Rota izin haritası ile yetki politikası aynı izinleri istiyor | değişen her rota için izin haritası değeri ↔ politika satırı (`<politika>::<yetenek>`) tablosu |
| C8 | Rotaların işaret ettiği görünümler var | görünüm varlık döngüsü ya da `{{route_list}}` + `git grep '<görünüm çağrısı kalıbı>'` → `C8-views.txt` |
| C9 | Göçün geri alma adımı host tablosunu silmez/bozmaz | `{{migrate_roundtrip}}` (no-op göç → geri alma) → tablo + index yerinde; test adı |

## D — TAM sınıfı: yetki, kiracı, para, durum, güvenlik

Bulgu disiplini `review-brief.md` "TAM eki"ndedir (sınır + ilke + sonuç; `confirmed` / `needs_validation` / `rejected`). D3, D7, D8 için her uygulanabilir maddede doğrulanmış `dosya:satır`, önem, somut etki, güven ve kanıt yazılır; doğrulanmış bulgu ile hipotez ayrılır, uygulanamazlık gerekçesiyle yazılır. Süre dolduğunda çözülmemiş kritik soru otomatik geçiş olmaz, kapanışı durdurur.

| # | Madde | Kanıt |
|---|---|---|
| D1 | Açık kalma (fail-open) izi: her dal, istisna, eksik/bozuk dosya, büyük-küçük harf, boş değer → reddediyor mu | dal başına test adı ya da `D1-trace.md` (dosya:satır → sonuç) |
| D2 | Uzun ömürlü süreç (kalıcı uygulama sunucusu işçisi, kuyruk işçisi): istek içi cache, statik durum, nesil/geçersizleme | test ya da `needs_validation` + eksik bilgi |
| D3 | Kiracılar arası istek matrisi: aktör × kaynak × eylem; başka kiracı 404/403, veri sızmaz (HTML + JSON + sunucu bileşeni yükü). Kiracı kimliği okuma, yazma, ilişki, önbellek, kuyruk, dışa aktarım ve dosyalar boyunca izlenir; çağıranın verdiği kimlik başka kiracının kaynağını seçemez. Türetilmiş kopyalar (önbellek, arama indeksi, dışa aktarım, kuyruk yükü, log, mail) aynı kiracı/rol bağını taşır ve silme/iptalde temizlenir | matris testi adı + hücre sayısı; kopya başına bağın `dosya:satır`'ı ya da test adı → `D3-copies.txt` |
| D4 | İkinci bağlantı / transaction yarışı: iki süreç, zorlanmış sıra yok | yarış testi adı; hangi DB'de koştu (SQLite / MySQL) |
| D5 | Para: tutar, para birimi, idempotentlik, çift ödeme, geri ödeme yolu | ilgili test adları; kritik postmerge setinde mi |
| D6 | Gerçek tarayıcı 1280 ve 390, hata yolları (403, 419, 422, 503, çevrimdışı) | ekran görüntüleri + eylem günlüğü |
| D7 | Yetki izi: değişen her giriş noktası için aktör → eylem → kaynak → sunucu tarafı politika; doğrudan istek ve asenkron yürütme (iş, komut, kuyruk) dahil. Aynı hassas etkiye ulaşan her yol (rota, komut, iş, Livewire eylemi, API) aynı kontrolü yapıyor; kimliksiz, yetkisiz ve yetkisi geri alınmış aktör reddediliyor | yol × kontrol tablosu, yollar arası fark 0 → `D7-paths.txt`; ret testleri |
| D8 | Veri açığa çıkması: yanıtlar, loglar, hata mesajları, dışa aktarımlar, depolama ve dış çağrılar boyunca hassas alanlar; alıcı yetkisi, alan en aza indirme, saklama/silme kuralları | alan × çıkış noktası tablosu → `D8-exposure.txt` |

## E — Host etkisi (paylaşılan sözleşme değişince)

| # | Madde | Kanıt |
|---|---|---|
| E1 | Diğer uygulamalarda değişen sözleşmenin (sınıf, arayüz, config anahtarı, rota adı, event) kullanımı — SALT OKUNUR | `git -C <app> grep -n "<sembol>"` her uygulama için → `E1-hosts.txt` (dosya:satır) |
| E2 | Kırılacak host yerleri için backlog satırı ya da geçiş dilimi | B-kimlikleri |
