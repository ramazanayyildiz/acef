# METHOD-01 bağımsız inceleme
Karar: **REVISE**
Tarih: 2026-10-19 · Aday `de4b75e` (tag `v0.1.0`) · Model: Claude Opus 5.5 (ayrı oturum) · Ortam: temiz klon `scratchpad/review-method-01`, atılabilir depolar `scratchpad/m01work/`

## Özet (5 satır)
1. Paketin kendi kapısı ve öz testleri temiz klonda yeşil; metrics demosu `SESSION_SLICES` verilince birebir yeniden üretiliyor.
2. Üç betik kasıtlı bozulmada yüksek sesle kırmızı (boundaries rc=1, gate rc=1/2, standards rc=1); Jakomeet'te 34 kenar tutuyor.
3. Metrics'ten kontrol edilen üç sayı (149 dilim, 175 REVISE rapor, 3 dolu kapanış notu) bağımsız sayımla tutuyor.
4. REVISE gerekçesi: Live Learning "yok" deniyor ama depo var; örnek PHPStan sayacı araç yokken 0 sayıp PASS veriyor; security-audit MIT metni pakette yok.
5. Kaynağa sadakat iyi; iki küçük kayma var (kural başına 3–5 mutasyon tabanı, TAM'da para/göç için Codex zorunluluğu yumuşamış).

## 1. Temiz ağaçta yeniden koşu (`git status --short` boş, HEAD `de4b75e`)
| Komut | Beklenen | Gerçek |
|---|---|---|
| `scripts/selfcheck.sh` | PASS | `SELFCHECK PASS ok=74 fail=0`, rc=0 |
| `scripts/tests/test-boundaries.sh` | rc=0 | ok=4 fail=0, rc=0 |
| `scripts/tests/test-gate.sh` | rc=0 | ok=7 fail=0, rc=0 |
| `scripts/tests/test-standards.sh` | rc=0 | ok=5 fail=0, rc=0 |
| `scripts/metrics-demo.sh` (env yok) | belge aynen | rc=0 ama "oturum" bölümü düşüyor (−33 satır); belge yalnız `scripts/metrics-demo.sh` diyor |
| `SESSION_SLICES=<scratchpad>/slices scripts/metrics-demo.sh` | belge aynen | fark 0 |
Koşu sonrası `git checkout` ile geri alındı; ağaç temiz.

## 2. Kaynağa sadakat (README akışı, review-brief, review-checklist)
Karşılaştırılanlar: REB `AGENTS.md` (056662ba2) "ACEF'siz düzen", "Hızlandırma", "Sade düzen", "Port ve süre", "Paralel hatlar/sınıflar", "Hat sınırı 5", "Keşif turu", "v1.2"; CRM handoff "Working method" (8c67ac70); SES `REVIEW-TEMPLATE.md`; koordinatörün A–E katmanları.
- Korunan: dilim ≤150 satır, taranmış izinli liste, tarihli liste eki, dev raporu kanıt değil, temiz ağaç tablosu, ayrı oturum, REVISE → yeni oturum r2, 5 hat / 2 ağır slot, hat başına DB (`testing` içerir), 90 dk müdahalesi, dilim başına kayıt dosyaları, `--no-ff`, CRM iş dalı merge politikası, keşif turu biçimi (`FINDINGS: <n>`, 1280×800/390×844), üretim verisi yasağı.
- A–E katmanları: A her dilim; B paket view/lang/config → host `<önek>::` include taraması (B1) + yayınlanmış kopyalar; C şablon hijyeni (C1–C9); D TAM yetki/kiracı + TAM eki; E host etkisi salt okunur. Beşi de var, uydurma katman yok.
- Düşen: (a) "yeni/değişen kural başına 3–5 mutasyon" (REB Hızlandırma #1, SES şablonu adım 4) brief adım 5'te yok; yalnız "her dev mutasyonu + en az bir kendi". (b) CRM/REB "para ve göç dilimlerinde ek olarak Codex" zorunluluğu README'de "mümkünse farklı model ailesi"ne yumuşamış. (c) Küçük: "teslim edilen dosya hemen commit'lenir", "bir hat engellenirse diğerleri durmaz" (proje özgü sayılabilir).
- Uydurma bulunmadı: "etiket adayı" PLT STATUS ve PLAT-* incelemelerinde, merge politikası CRM kararı 3'te, B28/B40/B7 PLT backlog'da var.

## 3. Betikler ve mutasyonlar
| Betik | Koşu | Mutasyon | Sonuç |
|---|---|---|---|
| `check-module-boundaries.php` | Jakomeet `development` 1fc60009, `--namespace='App\Modules'`, kendi baseline'ı ve `examples/` | — | `OK (1380 PHP files, 34 edges)` üç biçimde de; Jakomeet `git status` önce/sonra aynı (2 satır, önceden vardı) |
| aynı | kopya baseline | `AiAudit>Events` kenarı silindi | rc=1, dosya:satır listeli "new edge" |
| `gate.sh` | örnek `slice-method.json` atılabilir depoda | olduğu gibi (araç yok) | `GATE FAIL … fail=4`, rc=1 |
| aynı | tüm komutlar `true` | `phpunit` → `false` | PASS rc=0 → `GATE FAIL pass=3 fail=1` rc=1 |
| aynı | izlenen dosya kirli | — | "dirty tree (tracked files)" rc=2 |
| aynı | `--full`, `{port}` var, `GATE_PORT` yok | — | `GATE INCOMPLETE skip=1`, rc=3; port verilince rc=0 |
| `standards-check.sh` | örnek kurallar, küçük fikstür | M1 Livewire'a `DB::transaction` | `FAIL GATE-LW1 app/Livewire/Foo.php:2`, rc=1 |
| aynı | | M2 Services'e `app(` (sayaç) | `FAIL GATE-APP count 1 > baseline 0`, rc=1 |
| aynı | | M3 view'a `alert(` (`any`) | `FAIL GATE-DLG …a.blade.php:1`, rc=1; geri alınca PASS rc=0 |
| aynı | örnek kurallar, PHPStan kurulu değil | — | **`GATE-STAN=0`, `STANDARDS PASS`**: `php vendor/bin/phpstan` dosya yokken rc=1 döner ve rc=1 varsayılan `ok_exit [0,1]` içinde |
Not: `gate.sh` untracked dosyaları kirli saymıyor (`--untracked-files=no`); README "`git status --short` boş" diyor. Kaynak REB `gate.sh:34` ile aynı; bulgu değil, belgede tek cümle yeter.

## 4. Lisans ve atıf
- SOURCES.md: REB, CRM, CRM#44, JKM, PLT tam commit'lerle; JKM-SA ve SES "commit yok" diye dürüstçe işaretli. Cited commit'ler doğrulandı (CRM HEAD = 8c67ac70; JKM HEAD = 1fc60009; boundaries son değişim = b1f605b8).
- `check-module-boundaries.php` başlığında köken, PR #94, commit ve MIT notu var.
- security-audit: SOURCES "metin kopyalanmadı" diyor, MIT LICENSE dosyası pakette yok. TAM eki kaynağın ifadelerinin çevirisi ("last trusted decision point", "weakest parallel path", "smallest effective fix", `confirmed/needs_validation/rejected`, `report-schema.json` alanları). Türev sayılabilir; Cloudflare MIT bildirimi kopyalanmalı.
- PLT commit'i SOURCES'ta `9acdde3`, metrics'te `72ba952` (sonraki iki backlog commit'i). Çelişki değil ama SOURCES'ta tek satırla belirtilmeli.

## 5. Olgu kontrolü: Live Learning
`docs/adoption.md:20` ve `docs/open-questions.md:24` "depo bulunamadı" diyor. Depo var: `/Users/ramazanayyildiz/CODE/Ram/live-learning` (dal `work-course-progress-report`, HEAD `4a5ec811`). Kökte `scripts/standards-check.sh`, `scripts/gate.sh` (exit 0/1/2/3, tek satır `GATE PASSED|FAILED`), `docs/standards/live-learning-standards.md`, `docs/standards/gap-analysis.md` (STANDARDS-01, 5cdb442), `docs/standards/error-codes.md`, `docs/slices/` altında çok sayıda dilim/handoff dosyası. Not: dosyalar `backend/` altında değil, depo kökünde; `backend/` Laravel uygulaması.

## 6. Metrics spot kontrolü (rebuild `056662ba2`, bağımsız betikle)
| Sayı | Belge | Bağımsız sayım | Durum |
|---|---|---|---|
| Dilim dosyası | 149 | 149 (review/dev-report/`_` hariç büyük harfli kimlik) | tutuyor |
| REVISE kararlı rapor | 175 (361 rapor) | 175 / 361 (kendi karar ayrıştırıcım; `P\d\d-` önekli evidence eşlemesiyle) | tutuyor |
| Dolu kapanış notu | 3 (25 başlık) | 25 başlık; dolu: P03-REF-02a, P03-REF-04a, P03-REF-04a-2 = 3 (gevşek okumada ~11 bölüm içerik taşıyor, yalnız 3ü karar sözcüğü taşıyor) | tutuyor |
Uyarı: düz `grep 'Karar: REVISE'` yalnız 13 dosya bulur; 175'in çoğu Codex `VERDICT: REVISE`. Belge "REVISE kararlı rapor" diyor, doğru, ama okuyucu için tek cümle eklenebilir. "Kararı okunamayan 8" bende 4 çıktı (ayrıştırıcı farkı, önemsiz).

## Bulgular
| # | Önem | Blok | Yer | Kanıt | Öneri |
|---|---|---|---|---|---|
| F1 | orta | evet | `docs/adoption.md:20`, `docs/open-questions.md:24` | §5 | Live Learning'i gerçek depodan anlat (yol, gate/standards, gap-analysis, slices); open-questions #8'i güncelle |
| F2 | orta | evet | `scripts/standards/rules.example.json` GATE-STAN; `standards-check.sh:129-136` | §3 son satır | Örnekte `ok_exit` yanında çıktıda zorunlu işaret (ör. `require_regex`) iste ya da `[ -x vendor/bin/phpstan ] \|\|` ile rc≠0/1; sıfır çıktı + rc=1 = ERR; öz teste "araç yok → FAIL" vakası ekle |
| F3 | düşük | evet | paket kökü / `SOURCES.md:11` | §4 | Cloudflare MIT LICENSE metnini `licenses/security-audit-LICENSE` olarak kopyala, SOURCES'ta "çeviri/türev" de |
| F4 | düşük | hayır | `templates/review-brief.md:18`, `README.md` TAM satırı | §2 (a)(b) | "Kural başına 3–5 mutasyon" ve "para/göçte Codex zorunlu (proje politikası)" geri ekle |
| F5 | düşük | hayır | `docs/metrics-2026-10-19.md:3`, `metrics-demo.sh` | §1 | Yeniden üretim komutuna `SESSION_SLICES=…` yaz ya da yoksa uyar |
| F6 | bilgi | hayır | `SOURCES.md` PLT satırı, README A1 | §3 not, §4 | PLT 72ba952 notu; gate'in untracked'ı saymadığını belirt |

Tekrar inceleme (r2) kapsamı: F1–F3 düzeltme diff'i + `selfcheck.sh` + standards fikstüründe "PHPStan yok" vakası.
