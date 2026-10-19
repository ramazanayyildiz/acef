# METHOD-01 hedefli yeniden inceleme (r2)
Karar: **PASS**
Tarih: 2026-10-19 · Aday `3951843` (tag `v0.1.1`) · Model: Claude Opus 5.5 (yeni oturum) · Kapsam: yalnız r1 bulguları F1–F6 · Ortam: temiz klon `scratchpad/review-method-01-r2`, fikstür `scratchpad/m01r2-fix`

## Özet
1. Paket kapısı temiz klonda yeşil: selfcheck ok=80, standards ok=12, gate ok=7, boundaries ok=4; metrics-demo env'siz belgeyi birebir üretiyor, `git status` sonra boş.
2. F1 düzeldi: Live Learning yolları, dosyaları ve "dilim = `docs/<ID>.md`, inceleme dilim içinde bölüm" iddiası `4a5ec811`'de doğrulandı; push adımı `COORDINATOR-STATE-2026-10-19.md:29`'da.
3. F2 düzeldi: araç yokken artık rc=1 (requires ile ve onsuz); gerçek bulgular sayılıyor. Yan etki: bulgu metninde "No such file or directory" geçerse araç hatası sayılıyor (güvenli yönde, gürültülü).
4. F3–F6 kapandı; kalan üç küçük not bloklamıyor (SOURCES'ta LL commit'i belirsiz, lisans dosyası "aynen" değil, F2 yanlış pozitif).

## 1. Yeniden koşu (temiz klon, HEAD `3951843`)
| Komut | Beklenen | Gerçek |
|---|---|---|
| `scripts/selfcheck.sh` | ok=80 | `SELFCHECK PASS ok=80 fail=0`, rc=0 |
| `scripts/tests/test-standards.sh` | ok=12 | ok=12 fail=0, rc=0 |
| `scripts/tests/test-gate.sh` / `test-boundaries.sh` | rc=0 | ok=7 / ok=4, rc=0 |
| `scripts/metrics-demo.sh` (env yok) | belge aynen | rc=0, `git status --short` boş (fark 0) |
Not: oturum bölümü scratchpad'ten okunuyor; bu dosya `slices/`e kopyalandıktan sonra da yeniden koşuldu, fark 0 (geri alındı).

## 2. F1 — Live Learning (`~/CODE/Ram/live-learning`, `4a5ec811`, dal `work-course-progress-report`)
- Var (`git cat-file` ile): kökte `scripts/gate.sh`, `scripts/standards-check.sh`, `scripts/standards/baseline.txt`, `docs/standards/{README,live-learning-standards,gap-analysis,error-codes}.md`, `docs/COORDINATOR-STATE-2026-10-19.md`, `docs/HANDOFF.md`, `backend/AGENTS.md`.
- `docs/` altında 170 `.md` (iddia 170). `docs/slices/` hiçbir yerel/uzak dalda yok; r1'in "docs/slices/ altında" ifadesi bendeydi ve yanlıştı, geliştirici doğru düzeltti.
- İnceleme dilim içinde: `docs/FIX-D.md:119` "- **Review:** an independent read-only reviewer found no High." İstisna: `docs/SECURITY-REVIEW-COMMUNITY-SITE-01.md` ayrı dosya (genel kuralı bozmaz).
- Merge sonrası push (açık soru #8): `docs/COORDINATOR-STATE-2026-10-19.md:26-29` "## Merge procedure … 2. `scripts/gate.sh` … → GATE PASSED; … `npm run e2e` … 3. Push; `git worktree remove --force` …". Doğrulandı. Karşıt bağlam: `docs/OVERNIGHT-2026-10-17.md:81` "**Push:** … dalını GitHub'a göndereyim mi?" (17 Ekim'de push sahibe soruluyordu). 19 Ekim prosedürünün sahip onaylı olup olmadığı belirsiz; belgenin "doğrulanmadı" demesi doğru, ama dosya:satır vermiyor.
- Belirsiz: `SOURCES.md:12` "gate/standards dosyalarının son değişimi `7cf9936`". `docs/standards/` için doğru (`7cf9936`), betikler için değil: `gate.sh` → `9f953e4`, `standards-check.sh` → `7bf90faa`, `baseline.txt` → `fad01981` (`git log -1 4a5ec811 -- <yol>`).

## 3. F2 — eksik araç (fikstür: örnek kurallar, `GATE-STAN=0` baseline)
| Vaka | Sonuç |
|---|---|
| A `vendor/bin/phpstan` yok, örnek kurallar | `FAIL GATE-STAN required tool missing: vendor/bin/phpstan`, rc=1 |
| B aynı, `requires` silinmiş | `FAIL … tool error (exit 1): Could not open input file`, rc=1 |
| C sahte phpstan: 2 bulgu, exit 1 | `FAIL GATE-STAN count 2 > baseline 0`, rc=1 (bulgu sayılıyor, "eksik" değil) |
| D aynı, baseline 2 | `STANDARDS PASS`, rc=0 |
| E tek bulgu satırı "…; No such file or directory …", exit 1 | `FAIL GATE-STAN tool error (exit 1): app/Services/A.php:3:…`, rc=1 |
| F araç var, çıktı yok, exit 0 | PASS, "can be lowered: 2 -> 0" |
E: geliştiricinin uyardığı davranış doğrulandı. Metin sezgisi `requires` sağlanmışken ve `count_regex` eşleşmesi varken de uygulanıyor; meşru bulgu sayılmıyor, ERR'e dönüşüyor. Sessiz PASS yok (kapalı yönde hata) ama `--print-baseline` bu durumda rc=2 ile ölür (denendi: "GATE-STAN could not be measured"), birleştirici baseline ölçemez.

## 4. F3–F6
- F3: `LICENSES/security-audit-MIT.txt` byte-identical **değil** (1535 vs 1078 bayt): başa 5 satırlık köken başlığı eklenmiş; son 1078 bayt Jakomeet `LICENSE` ile `cmp` ile aynı. MIT bildirimi tam, yükümlülük karşılanıyor; ama `SOURCES.md:39` "(aynen)" diyor. Atıf `review-brief.md:44`, `SOURCES.md:11,39`, `README.md:76`'da var.
- F4: `review-brief.md:18` "her kural için 3–5 mutasyon"; `review-brief.md:3` ve `README.md:49` "para ve göç dilimlerinde zorunlu". selfcheck ikisini de arıyor (`selfcheck.sh:31`).
- F5: metrics belgesi "ortam değişkeni gerekmez" diyor ve öyle; backlog'lar sabit commit'ten `git show` ile okunuyor.
- F6: `README.md:27` untracked notu; `SOURCES.md:13` 72ba952 açıklaması var.

## Bulgular (bloklamayan)
| # | Önem | Yer | Kanıt | Öneri |
|---|---|---|---|---|
| R1 | düşük | `SOURCES.md:12` LL satırı | §2 son madde | Son değişimi dosya başına yaz (docs/standards 7cf9936; gate 9f953e4; standards-check 7bf90faa; baseline fad01981) |
| R2 | düşük | `docs/open-questions.md` #8, `docs/adoption.md:20` | §2 push maddesi | `COORDINATOR-STATE-2026-10-19.md:29` ve `OVERNIGHT-2026-10-17.md:81` atfını ekle |
| R3 | düşük | `scripts/standards-check.sh:144` | §3 E | Metin sezgisini yalnız `count_regex` eşleşmesi 0 iken uygula; öz teste vaka E ekle |
| R4 | düşük | `LICENSES/security-audit-MIT.txt` başlığı ("Copied verbatim"), `SOURCES.md:39` "(aynen)" | §4 F3 | Köken başlığını `LICENSES/README` ya da NOTICE'e taşı, ya da "(aynen)" → "(lisans metni aynen, üstte köken başlığı)" |

R1–R4 v0.1.2 / backlog adayı; yeni inceleme turu gerektirmez.
