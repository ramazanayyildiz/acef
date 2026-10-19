# İnceleme kontrol listesi

`review-brief.md` bu dosyayı zorunlu kılar. Her madde ya kanıtıyla işaretlenir ya da "uygulanmaz: <neden>" yazılır; boş madde = eksik inceleme. Kanıt dosyaları `<evidence>/<SLICE-ID>/review/` altına. Komutlar Laravel varsayar; proje farkı `slice-method.json`'dadır. Kaynak: 2026-10-19 incelemelerinin gerçekten yakaladıkları (bkz. `SOURCES.md`).

Hangi katman: **A** her dilimde · **B** paket view/lang/config anahtarı değişince · **C** şablon/host hijyeni (UI, rota, config, migration dokunuşunda) · **D** TAM sınıfı (yetki/kiracı/para/durum/göç/güvenlik) · **E** paylaşılan sözleşme değişince.

## A — Her dilim

| # | Madde | Kanıt (komut / dosya) |
|---|---|---|
| A1 | Temiz ağaçta yeniden koşu: aday commit'in AYRI worktree'si, `git status --short` boş, dev raporundaki her komut | `git worktree add --detach <yol> <aday>`; tablo komut → beklenen → gerçek → `A1-rerun.txt` |
| A2 | İzinli liste dışında değişiklik yok | `git diff --name-only <taban>..<aday>` ile dilimin izinli listesi karşılaştırması → `A2-allowed.txt` |
| A3 | Kırmızı-önce kanıtı: yalnız-test commit'i ürün kodsuz kırmızı | `git checkout <test-sha> && <dilim testi>` → kırmızı sayısı → `A3-red-first.txt` |
| A4 | Geliştiricinin her mutasyonu inceleyici tarafından YENİDEN uygulandı + inceleyicinin kendi en az bir mutasyonu | her biri için `<evidence>/…/review/mutations/M<n>.txt` (diff + kırmızı test çıktısı); sonda `git status --short` boş |
| A5 | Kapı ve standart | `scripts/gate.sh <worktree>` son satır; `scripts/standards-check.sh <worktree>` son satır |
| A6 | İddiaları doğrula, raporu değil: dev raporundaki her "yapıldı/geçti" cümlesi kendi komutunla | rapor içinde iddia → kendi kanıtın tablosu |

## B — Paket anahtarı değişti (view, lang, config, rota adı)

| # | Madde | Kanıt |
|---|---|---|
| B1 | Tüketici depolarda include ve atıflar (B28; 01D kaçağı: host `password-reset-confirmation.blade.php` kırıldı) | her host için `git -C <host> grep -n "<paket-öneki>::"` → `B1-hosts.txt` (dosya:satır) |
| B2 | Hostlarda yayınlanmış (vendor:publish) kopyalar | `git -C <host> ls-files 'resources/views/vendor/<paket>/*' 'lang/vendor/<paket>/*' 'config/<paket>*.php'` → `B2-published.txt` |
| B3 | Eski anahtar/ad geriye uyumlu duruyor ya da kırılma kayda geçti | dilimdeki K maddesi + host testi adı |

## C — Şablon ve host hijyeni

| # | Madde | Kanıt |
|---|---|---|
| C1 | Blade'deki her `route('literal')` kayıtlı | `git grep -ohE "route\('[^']+'" -- resources app/Modules \| sort -u` ↔ `php artisan route:list --json` → `C1-route-literals.txt` (fark 0) |
| C2 | `route_permissions` ve `navigation` config'indeki her rota adı kayıtlı | `Route::has` döngüsü (mimari test ya da `php artisan tinker --execute`) → `C2-config-routes.txt` |
| C3 | Rol başına bağlantı taraması: render edilen sayfalardaki her aynı-site `<a href>` o kullanıcıyla GET → 200 (302 de kırmızı) | feature test adı (ör. `DashboardLinksTest`) + boş tarama yakalayan `assertNotEmpty` |
| C4 | 390 px'te yatay taşma yok, rol başına | tarayıcı: `document.documentElement.scrollWidth <= 390` → `C4-390-<rol>.png` + değer |
| C5 | Silinen kodun phpstan-baseline girdileri temizlendi; yeni ignore yok | `git diff <taban>..<aday> -- phpstan-baseline.neon` yalnız silme; `phpstan` "Ignored error pattern … was not matched" yok |
| C6 | Env/config adı kayması (ör. `CACHE_DRIVER` ↔ `CACHE_STORE`) | `git grep -n "env('" -- config` ↔ `.env.example`, `phpunit*.xml` → `C6-env.txt` |
| C7 | Rota haritası ile policy aynı izinleri istiyor (B40) | değişen her rota için route_permissions değeri ↔ `Policy::<yetenek>` satırı tablosu |
| C8 | Rotaların işaret ettiği view'lar var | `View::exists` döngüsü ya da `route:list` + `git grep "view('"` → `C8-views.txt` |
| C9 | Migration `down()` host tablosunu silmez/bozmaz (B7) | no-op `migrate` → `migrate:rollback` → tablo + index yerinde; test adı |

## D — TAM sınıfı: yetki, kiracı, para, durum, güvenlik

Bulgu disiplini `review-brief.md` "TAM eki"ndedir (sınır + ilke + sonuç; `confirmed` / `needs_validation` / `rejected`).

| # | Madde | Kanıt |
|---|---|---|
| D1 | Açık kalma (fail-open) izi: her dal, istisna, eksik/bozuk dosya, büyük-küçük harf, boş değer → reddediyor mu | dal başına test adı ya da `D1-trace.md` (dosya:satır → sonuç) |
| D2 | Uzun ömürlü süreç (Octane, kuyruk işçisi): istek içi cache, statik durum, nesil/geçersizleme | test ya da `needs_validation` + eksik bilgi |
| D3 | Kiracılar arası istek matrisi: aktör × kaynak × eylem; başka kiracı 404/403, veri sızmaz (HTML + JSON + Livewire yükü) | matris testi adı + hücre sayısı |
| D4 | İkinci bağlantı / transaction yarışı: iki süreç, zorlanmış sıra yok | yarış testi adı; hangi DB'de koştu (SQLite / MySQL) |
| D5 | Para: tutar, para birimi, idempotentlik, çift ödeme, geri ödeme yolu | ilgili test adları; kritik postmerge setinde mi |
| D6 | Gerçek tarayıcı 1280 ve 390, hata yolları (403, 419, 422, 503, çevrimdışı) | ekran görüntüleri + eylem günlüğü |

## E — Host etkisi (paylaşılan sözleşme değişince)

| # | Madde | Kanıt |
|---|---|---|
| E1 | Diğer uygulamalarda değişen sözleşmenin (sınıf, arayüz, config anahtarı, rota adı, event) kullanımı — SALT OKUNUR | `git -C <app> grep -n "<sembol>"` her uygulama için → `E1-hosts.txt` (dosya:satır) |
| E2 | Kırılacak host yerleri için backlog satırı ya da geçiş dilimi | B-kimlikleri |
