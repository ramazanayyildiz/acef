# Değişiklik günlüğü

## v0.1.1 — 2026-10-19

METHOD-01 bağımsız incelemesinin (REVISE, F1–F6) onarımı.

- **F1 Live Learning gerçek depodan.** `docs/adoption.md` ve `docs/open-questions.md` "depo bulunamadı" yerine `~/CODE/Ram/live-learning` (`4a5ec811`) üzerinden yazıldı: kökteki `scripts/gate.sh`, `scripts/standards-check.sh`, `docs/standards/*`, dilimler `docs/<ID>.md` (bu dalda `docs/slices/` yok), inceleme sonucu dilim içinde, merge sonrası push farkı. `SOURCES.md`'ye LL satırı.
- **F2 Eksik araç artık FAIL.** `standards-check.sh` komut sayaçlarında `ok_exit` varsayılanı `[0]`; yeni `requires` alanı (ağaca göreli yol yoksa FAIL); çıkış 126/127 ve "command not found" / "Could not open input file" / "No such file or directory" çıktısı araç hatasıdır. Örnek `rules.example.json` GATE-STAN `requires: ["vendor/bin/phpstan"]`. `scripts/tests/test-standards.sh`: phpstan yok → rc=1 (requires ile ve onsuz), komut yok → rc=1, varsayılan ok_exit'te exit 1 → rc=1, araç var → sayaç ölçülür (12 vaka).
- **F3 Lisans.** Cloudflare MIT metni aynen `LICENSES/security-audit-MIT.txt`; `review-brief.md` TAM eki ve `SOURCES.md` onu türev olarak anar.
- **F4 Kayan iki kural geri.** `review-brief.md` ve README: yeni/değişen kural başına 3–5 mutasyon; farklı model ailesi (Codex) para ve göç dilimlerinde zorunlu, diğer TAM'da önerilir.
- **F5 Yeniden üretilebilir demo.** `metrics-demo.sh` ortam değişkeni olmadan koşar: rebuild `056662ba2` ve platform `9acdde3` backlog'larını `git show` ile sabit commit'ten okur, dilim dizini sabitten farklıysa uyarır, oturum dizini varsayılan yolda (git dışı anlık görüntü, belgede yazılı).
- **F6** README: `gate.sh` izlenmeyen dosyaları kirli saymaz; SOURCES platform commit'i (`9acdde3` sabit, v0.1.0 belgesi `72ba952`'de üretilmişti) hizalandı.
- `docs/open-questions.md`: v0.2 planlı işleri (kapanış notu kapısı, REVISE neden kümesi, süre/token başlığı).

## v0.1.0 — 2026-10-19

İlk paketleme. Taban: b2press-rebuild `AGENTS.md` "ACEF'siz geliştirme düzeni" (2026-10-07) ve sonraki hızlandırma/hat/inceleme sınıfı kararları (2026-10-08 … 2026-10-15), US-CRM handoff "Working method" (2026-10-19). Aşağıdakiler 2026-10-19 platform oturumunun rebuild akışına göre değiştirdikleri ya da açıkça yazıya geçirdikleridir.

### Oturumun getirdikleri (rebuild akışına göre fark)

- **Host include taraması (B28).** PLAT-MERGE-01D incelemesi paket markdown şablonunun bir host view'ını (`password-reset-confirmation.blade.php`) kırdığını kaçırdı; pilot tur yakaladı (B27). Kural: paket view/lang/config anahtarı değişince inceleyici tüketici depolarda `<paket-öneki>::` include ve atıflarını, ayrıca yayınlanmış kopyaları tarar. → `review-checklist.md` B1–B3, `review-brief.md` adım 6.
- **Hedefli yeniden inceleme ayrı oturumda.** REVISE sonrası r2 ilk inceleyicinin oturumunda değil, yeni bir oturumda ve yalnız önceki bulgular + düzeltme diff'i üzerinde (PLAT-PILOT-01 r2, BOOT-FIX-02 r2). → `templates/review-r2.md`.
- **İzinli liste ekleri dilimde tarihle.** Koordinatör kapsamı genişlettiğinde eki dilim dosyasının "Ekler" bölümüne tarih ve gerekçeyle yazar (BOOT-FIX-02 "Ek (koordinatör, 2026-10-19)"); inceleyici A2'de bu eki geçerli sayar. → `templates/slice.md` "Ekler".
- **Açık "etiket adayı" yargısı.** Paket/sürüm dilimlerinde inceleyici ve kapanış notu "etiket adayı: evet/hayır + neden" yazar (PLAT-PILOT-01 → `v0.1.0`). → `review-brief.md` adım 9, `closing-note.md`.
- **Durum belgesi.** Koordinatör günlük tek bir durum belgesi tutar (`docs/STATUS-<tarih>.md`: haftanın kabulü, dilim tablosu, sahibin bekleyen kararları, süreç notları). → `docs/adoption.md`.
- **Backlog kimlikleri.** Her ertelenen bulgu `B<n>` kimliği, kaynak dilim/inceleme, önem ve durumla tek tabloya girer; kapanış notu ve sonraki dilimler kimlikle atıf verir (platform B1–B41). → `closing-note.md` "Ertelenen", `slice.md` "Backlog".
- **Hat DB adlandırması.** PHPUnit hatları veritabanı paylaşmaz: hat N `<app>_testing_l<N>` (adı `testing` içerir), hatta özgü `phpunit.l<N>.xml` (bootstrap l7/l8). → `slice-method.json` `lanes.db_pattern`, `slice.md` başlığı.
- **Modül sınırı bekçisinin benimsenmesi (B35).** Jakomeet PR #94'ün `check-module-boundaries.php` + kilitli grafiği pakete alındı; `--namespace` ile genelleştirildi, davranışı Jakomeet üzerinde birebir aynı (çıktı farkı yok, 1380 dosya, 34 kenar). → `scripts/check-module-boundaries.php`.
- **Mutasyon kanıt dosyaları.** Her mutasyon (geliştiricininki ve inceleyicinin yeniden uyguladığı) ayrı kanıt dosyası bırakır; inceleyici en az bir kendi mutasyonunu ekler. → `review-checklist.md` A4, `dev-report.md`.

### Sahibin 2026-10-19 eki (inceleme kontrol listesi)

- `templates/review-checklist.md`: A her dilim (temiz ağaç, izinli liste diff'i, yalnız-test commit'inde kırmızı-önce, mutasyonların yeniden uygulanması + bir kendi mutasyon, kanıt dosyaları); B paket anahtarı (host include ve yayınlanmış kopya taraması); C şablon/host hijyeni (`route('…')` kayıtlı, config rota adları kayıtlı, rol başına bağlantı taraması, 390 px `scrollWidth`, bayat phpstan-baseline, env adı kayması `CACHE_DRIVER`/`CACHE_STORE`, rota haritası ↔ policy (B40), migration `down()` (B7), rotaların view'ları var); D TAM (fail-open izi, uzun ömürlü süreç, kiracılar arası matris, ikinci bağlantı yarışı); E host etkisi (diğer uygulamalarda salt okunur grep, dosya:satır).
- Jakomeet `security-audit` (MIT, Cloudflare) bulgu disiplini TAM eki olarak `review-brief.md`'ye; Jakomeet `pre-review-selfcheck` dev raporunun öz-denetim bölümü olarak `dev-report.md`'ye.

### Rebuild'den aynen gelenler

Dilim dosyası diyeti (≤150 satır, `_invariants.md` atfı), kullanım taramalı izinli liste, temiz ağaçta yeniden koşu, alan bazlı TAM/HAFİF sınıfları, 5 hat / 2 ağır slot, sıcak dosya kilitleri ve tek birleştirme kuyruğu, dilim başına kayıt dosyaları (TOOL-06), standart ratchet'i ve "yazılmamış istisna = REVISE", keşif turu, 90 dakika kuralı ve `interventions.json`, risk bazlı postmerge (her üçüncü merge'de otomatik tam takım kaldırıldı).

### Betik farkları

- `gate.sh`: rebuild'in PHPUnit/ui-reuse/duman adımları yerine `slice-method.json` → `gate.commands`; çıkış kodları ve tek özet satırı korundu; ana ağaçta argümansız koşma artık hiç yok (rebuild'de `GATE_ALLOW_MAIN=1` ile vardı).
- `standards-check.sh`: US-CRM PR #44 motoru; kurallar `rules.json`'a taşındı; Pint/PHPStan gibi araçlar `command_counters`.
- `codex-review.sh`: rebuild'in şema doğrulamalı sürümünün yalın hali; model zorunlu, salt okunur, kararsız çıktı = ARAÇ HATASI.
- `metrics.py`: yeni.

## İnceleme kaydı — 2026-10-19
- METHOD-01 bağımsız inceleme: v0.1.0 REVISE (F1 Live Learning yanlış "yok", F2 araç yokken yanlış PASS, F3 lisans), v0.1.1 hedefli yeniden inceleme PASS. Raporlar: `docs/METHOD-01-review.md`, `docs/METHOD-01-review-r2.md`.
- v0.1.2 için açık (düşük): R1 Live Learning dosya başına son commit; R2 push iddiasına dosya:satır (`COORDINATOR-STATE-2026-10-19.md:29`, `OVERNIGHT-2026-10-17.md:81`); R3 "No such file or directory" içeren gerçek bulgu araç hatası sayılıyor; R4 lisans dosyası başlık eklenmiş, "aynen" ifadesi düzeltilsin.
