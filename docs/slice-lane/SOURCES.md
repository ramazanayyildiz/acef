# Kaynaklar

Bu paketteki her dosya aşağıdaki kaynaklardan damıtıldı. Kaynak depolar yalnız okundu; hiçbirine yazılmadı. Okuma tarihi: 2026-10-19.

| Kısa ad | Depo / yol | Commit | Not |
|---|---|---|---|
| REB | `/Users/ramazanayyildiz/CODE/OPA/b2press-rebuild/.worktrees/docs-view` | `056662ba21549663c2451520b398aa19180b04b3` (2026-10-19 09:35 +0300) | Rebuild'in güncel main'i bu worktree'de (kök klasör eski). |
| CRM | `/Users/ramazanayyildiz/CODE/OPA/unusualspace-crm` | `8c67ac70498ece59d03b02110739e944f8df3eb4` | `docs/audits/bootstrap-sync-handoff-2026-10-19.md` "Owner decisions and working method". |
| CRM#44 | `unusual-growth/unusualspace-crm` PR #44, dal `chore/standards-ratchet` | head `3dfe8bdc1ff40eb0830c4d2e77ca98f871ef78a7` | `gh pr diff 44` ile okundu (PR açık, merge edilmedi). |
| JKM | `/Users/ramazanayyildiz/CODE/OPA/jakomeet` (dal `development`) | HEAD `1fc600091c92e68e495f57de1d5531118f29d1cf`; `check-module-boundaries.php` son değişim `b1f605b83e65a527d447652d4e989fb88b770540`; diğer okunan dosyaların son değişimi `fbc6c78d5ba34cfbddacd8b4f169ffd327aee1fb` | `composer.json` lisansı MIT. |
| JKM-SA | `jakomeet/.claude/skills/security-audit/` | **commit yok**: Jakomeet çalışma ağacında untracked (`git ls-files` 0 dosya); kaynak kimliği yalnız dizinin kendi LICENSE dosyası | Kendi `LICENSE` dosyası: **MIT, Copyright (c) 2025-2026 Cloudflare, Inc.** `templates/review-brief.md` "TAM eki" bu metnin Türkçe çevirisi/türevidir (ilkeler, durum sınıfları, önem çapaları, `report-schema.json` zorunlu alanları); lisans metni aynen `LICENSES/security-audit-MIT.txt`'de. |
| LL | `/Users/ramazanayyildiz/CODE/Ram/live-learning` (dal `work-course-progress-report`) | `4a5ec811e6c6ccfe6abec105d2c550ff62b10ddd` (2026-10-19 21:00 +0300); gate/standards dosyalarının son değişimi `7cf9936dd0003d0f8d805feffd2dc5417105e4e1` | Kökte `scripts/gate.sh`, `scripts/standards-check.sh`, `scripts/standards/baseline.txt`, `docs/standards/{README,live-learning-standards,gap-analysis,error-codes}.md`, `docs/<ID>.md` dilimleri, `docs/COORDINATOR-STATE-2026-10-19.md`, `backend/AGENTS.md`. Yalnız `docs/adoption.md` ve `docs/open-questions.md` için okundu. |
| PLT | `/Users/ramazanayyildiz/CODE/OPA/platform` | `9acdde3c3631b928851d36ee0d27f816bcebc5b5` (2026-10-19 22:12 +0300) | `docs/slices/*.md`, `docs/backlog.md` (B28, B35, B40, B7), `docs/STATUS-2026-10-19.md`. v0.1.0'ın metrics belgesi `72ba952`'de üretilmişti (arada yalnız backlog/STATUS commit'leri, `docs/slices/` aynı); v0.1.1'den itibaren `scripts/metrics-demo.sh` platform backlog'unu `9acdde3`'ten okur ve slices dizini bu commit'ten farklıysa uyarır. |
| SES | Koordinatör oturumunun scratchpad'i: `/private/tmp/claude-501/-Users-ramazanayyildiz-CODE-OPA-modularous/30ddcf96-0d03-4cf4-8022-c5e07d16bdda/scratchpad/slices/` | **commit yok** (git dışı, geçici dizin) | `REVIEW-TEMPLATE.md`, `BOOT-FIX-0*.md`, inceleme ve r2 dosyaları. Dosyalar silinebilir; içerik bu pakete damıtıldı. |

## Dosya → kaynak eşlemesi

| Bu paket | Kaynak |
|---|---|
| `README.md` akış, roller, sınıflar | REB `AGENTS.md` bölümleri "ACEF'siz geliştirme düzeni" (2026-10-07), "Hızlandırma kararları" (2026-10-08), "Sade düzen iyileştirmeleri", "Port ve süre kuralı", "Paralel hatlar, inceleme sınıfları" (2026-10-13), "Paralel hat sınırı 5" (2026-10-14), "Keşif tarayıcı testi" (2026-10-13), "Ekip kararları v1.2" (2026-10-15); CRM handoff "Working method"; PLT STATUS |
| `templates/slice.md` | REB `docs/slices/_template.md` (ürün özgü yollar çıkarıldı); SES `BOOT-FIX-02.md` (tarihli izinli liste ekleri) |
| `templates/dev-report.md` | REB AGENTS akış adım 2; PLT `PLAT-MERGE-01D.md` "Ortak kurallar"; JKM `docs/bmad/pre-review-selfcheck.md` (öz-denetim bölümü) |
| `templates/review-brief.md` | SES `REVIEW-TEMPLATE.md`; REB AGENTS akış adım 3–5 ve "Korunan kurallar"; PLT backlog B28; JKM-SA `SKILL.md` "Core principles", `VALIDATION-AND-REPORTING.md`, `DATA-ISOLATION-AND-LIFECYCLE.md`, `WEB-PROTOCOL-AND-AUTH.md` (TAM eki) |
| `templates/review-checklist.md` | Koordinatör talimatı (2026-10-19, METHOD-01 eki); SES `BOOT-FIX-02-review-r2.md` (bağlantı taraması); PLT backlog B7, B28, B38, B39, B40; PLT STATUS (01D kaçağı, `CACHE_STORE`) |
| `templates/review-r2.md` | REB `P04-ASSIGN-01-review-r2.md`; SES `BOOT-FIX-02-review-r2.md` |
| `templates/closing-note.md` | REB `_template.md` "Kapanış notu", REB AGENTS akış adım 6; PLT `PLAT-MERGE-01D.md`, `PLAT-NAV-02.md` kapanış notları |
| `templates/invariants-skeleton.md` | REB `docs/slices/_invariants.md` (yalnız yapı: Kural / Kaynak / Nasıl sınanır / Sabitleyen testler) |
| `templates/locks.md` | REB `observations/locks.md` |
| `templates/interventions.schema.json` | REB `observations/interventions.json` (111 kayıt; 108'i `ts/slice/actor/type/reason/files`, 3'ü eski `at/by/kind/detail` biçimi) |
| `templates/module-CLAUDE.md` | JKM `app/Modules/Events/CLAUDE.md` (yapı), JKM `docs/rules/general.md` |
| `templates/exploration-tour.md` | REB AGENTS "Keşif tarayıcı testi"; CRM handoff "Exploration tour" |
| `scripts/gate.sh` | REB `scripts/gate.sh` (çıkış kodları 0/1/2/3, tek özet satırı, kirli ağaç reddi, ana ağaç koruması) |
| `scripts/standards-check.sh`, `scripts/standards/*` | CRM#44 `scripts/standards-check.sh` (eklenen satır / any / sayaç motoru), REB `scripts/standards-check.sh` (TOOL-04, TOOL-06 dilim başına not dosyası) |
| `scripts/check-module-boundaries.php`, `examples/module-boundaries.json` | JKM `scripts/check-module-boundaries.php`, `scripts/module-boundaries.json` (PR #94); `--namespace` / `--modules-dir` genelleştirmesi bu pakette eklendi |
| `scripts/codex-review.sh` | REB `scripts/codex-review.sh` (zorunlu model, ARAÇ HATASI ayrımı, stdin brief) — yalınlaştırıldı |
| `scripts/metrics.py` | Yeni; ölçüm tanımları REB `observations/ACEF_EVAL_REPORT.md` "Yöntem" bölümünden |
| `docs/open-questions.md` | REB `ACEF_EVAL_REPORT.md` "Nihai yargı", `fable-acceleration-memo.md`, `astra-acceleration-memo.md`; LL (inceleme kaydı, push farkı) |
| `docs/adoption.md` | REB, CRM, JKM, PLT, LL (yukarıdaki commit'ler) |
| `LICENSES/security-audit-MIT.txt` | JKM-SA `LICENSE` (aynen) |

---

## acef yerleşimi (2026-10-20, METHOD-02)

Bu dosya slice-method `2a3ba48` (etiket `v0.1.1` = `3951843` + METHOD-01 inceleme kayıtları) sürümünden **satır satır aynen** alındı; METHOD-01 incelemelerindeki `dosya:satır` atıfları geçerli kalsın diye yukarıdaki metin değiştirilmedi, yalnız bu bölüm eklendi. Yukarıdaki yollar paket yollarıdır; acef içinde karşılıkları:

| slice-method | acef |
|---|---|
| `templates/*.md` | `templates/slice/*.md` |
| `templates/interventions.schema.json` | `schemas/slice-interventions.schema.json` |
| `schema/slice-method.schema.json` | `schemas/slice-method.schema.json` |
| `scripts/*` (gate, standards-check, check-module-boundaries, codex-review, metrics, metrics-demo, selfcheck, `standards/`, `tests/`) | `scripts/slice/*` |
| `README.md`, `SOURCES.md`, `docs/*.md` | `docs/slice-lane/*.md` |
| `slice-method.example.json`, `examples/module-boundaries.json` | `docs/slice-lane/examples/` |
| `LICENSES/security-audit-MIT.txt` | `LICENSES/security-audit-MIT.txt` |

Yöntemin İngilizce kanonik özeti ve acef v2 kulvarlarıyla ilişkisi: `method/SLICE_LANE.md`. Uygulamaya kopyalanan dosyalardaki `scripts/gate.sh`, `templates/review-checklist.md` gibi atıflar uygulama içi yollardır ve değişmez.

### acef kaynak satırı (provenance)

| Kısa ad | Depo / yol | Commit | Not |
|---|---|---|---|
| SM | `/Users/ramazanayyildiz/CODE/OPA/slice-method` (yerel, uzak yok) | `2a3ba488032d61b3d808cd20e227cf9a04856e43` (etiket `v0.1.1` = `3951843` + inceleme kayıtları) | acef dalı `v3/slice-lane`'e kopyalandı: ilk commit içerik değişikliği olmayan kopya, ikinci commit yalnız yol düzeltmeleri. Katman durumu: `docs/ai/capabilities/slice-lane.json`. slice-method bu sürümde donduruldu. |

---

## Yığından bağımsız çekirdek (2026-10-20, ACEF-NEUTRAL-01)

Proje ve yığın adları çekirdekten (`method/SLICE_LANE.md`, `templates/slice/`, `schemas/`, `docs/slice-lane/`) çıkarıldı;
bu dosya onların TEK yeridir (provenance). Çekirdek metinler yukarıdaki kısa adlarla atıf verir: **REB** (yöntemin
damıtıldığı proje, ACEF değerlendirme raporu `observations/ACEF_EVAL_REPORT.md` `056662ba2`), **CRM** / **CRM#44**
(yöntemi benimseyen ikinci proje, standart ratchet motoru), **JKM** / **JKM-SA** (modül sınırı bekçisi, öz-denetim,
güvenlik bulgu disiplini), **LL**, **PLT** (2026-10-19 oturumunun koştuğu paket deposu), **SES**. Örnekler proje adı
yerine `{{project}}` kullanır. Yığına özgü içerik (Laravel/PHP komutları, Livewire kuralları, PHPUnit/PHPStan,
artisan, composer) `stacks/laravel/`'a taşındı; dosya tablosu `stacks/laravel/README.md`, komut karşılıkları
`stacks/laravel/checklist-commands.md`.

| Kaynak kaydı | Yer | Not |
|---|---|---|
| METHOD-01 inceleme (REVISE) ve r2 (PASS) | `archive/slice-lane/METHOD-01-review.md`, `archive/slice-lane/METHOD-01-review-r2.md` | `dosya:satır` atıfları `v3.0.0-alpha` etiketindeki metne göredir |
| Ölçüm demosu 2026-10-19 | `archive/slice-lane/metrics-2026-10-19.md` | yeniden üretim: `stacks/laravel/metrics-demo.sh` (girdiler `stacks/laravel/metrics-paths.json`) |
| slice-method CHANGELOG (v0.1.0, v0.1.1) | `archive/slice-lane/slice-method-CHANGELOG.md` | acef değişiklikleri kök `CHANGELOG.md`'de |
| Kaynak projelerde benimseme durumu | aşağıda, "Adoption status at import" | `docs/slice-lane/adoption.md`'den taşındı |

## Adoption status at import (2026-10-19)

### Uygulamalar: neyi zaten var (`docs/slice-lane/adoption.md`'den taşındı, metin değişmedi)

**unusual-saas-bootstrap.** Çalışma `platform/consume-package` → `boot-fix-01` → `boot-fix-02` → `boot-fix-03` yığın dallarında; `main`'e PR tepe daldan, sahibin sözüyle. Hat DB'leri `us_crm_testing_l7`/`_l8` ve `phpunit.l<N>.xml` (platform STATUS). `composer check` kapı olarak kullanılıyor; Dusk/E2E betikleri ve `check-platform-dependencies.php` var. Dilim dosyaları `docs/plans/slices/` altında (BOOT-FIX dilimleri). Eksik: standart ratchet'i (PR #44 CRM'de; bootstrap'ta yok), `slice-method.json`, mimari testler (SKEL-01 sırada), modül sınırı bekçisi (B35).

**b2press-rebuild.** Yöntemin kaynağı: `AGENTS.md`, `docs/slices/_template.md`, `_invariants.md` (I1–I19), `scripts/gate.sh`, `standards-check.sh` (TOOL-04, 7 sayaç), `codex-review.sh` (şema doğrulamalı), `slice-worktree.sh`/`slice-teardown.sh`, `observations/locks.md`, `interventions.json`. Benimseme = yalnız `slice-method.json` eklemek ve kapanış notu alanlarını kullanmaya başlamak; mevcut betikler kalabilir. Ölçüm demosu iki boşluk gösterdi: kapanış notlarının çoğu doldurulmamış yer tutucu, `Durum:` satırı kapanışta güncellenmiyor (`docs/metrics-2026-10-19.md`). Açık backlog'u: B29/B30/B33 (araçlar `app/packages/platform` varsayıyor, tek süreçli PHPUnit OOM, GATE-PKG boş yol).

**US-CRM (unusualspace-crm).** Handoff "Working method" yöntemi tanımlıyor: ≤150 satır dilim, alt ajan geliştirici, temiz ağaç koşusu, alan bazlı Full/Light sınıfları, Codex `gpt-6.1-sol` döngüde, 5 hat / 2 ağır slot, hat DB'si `us_crm_testing_l<N>`, kritik postmerge seti (`tests/Feature/Billing`, `tests/Feature/Authorization`, `RevolutWebhookTest`, `StatementRetryTest`, `UserImpersonationFeatureTest`, `--filter=Team`), faz kapanışında keşif turu. Standart ratchet'i PR #44'te (açık, merge edilmedi). Henüz `docs/slices/` dizini ya da kapanmış dilim yok; bu yüzden ölçüm demosu yapılmadı. Benimseme: PR #44 merge olunca `rules.json`'a taşımak ya da olduğu gibi bırakmak; `slice-method.json`'a kritik seti yazmak.

**Jakomeet.** Kendi BMAD akışı var (`_bmad-output`, `docs/bmad/pre-review-selfcheck.md` + pre-commit kancası, kural numaraları), `docs/rules/general.md`, modül başına `CLAUDE.md` (Events), modül sınırı bekçisi (PR #94) ve `.claude/skills/security-audit`. Bu paket Jakomeet'ten üç şey aldı (bekçi, öz-denetim, güvenlik bulgu disiplini). Benimseme önerisi: BMAD story akışını değiştirmeden inceleme adımında `review-checklist.md`'yi ve kapanışta `closing-note.md` alanlarını kullanmak. Platform geçiş dilimleri B14/B20 Jakomeet `development` 1fc60009 tabanından başlar (B36).

**Live Learning.** Depo `/Users/ramazanayyildiz/CODE/Ram/live-learning`, dal `work-course-progress-report` (HEAD `4a5ec811`; `origin/development` geride). Yöntem dosyaları depo KÖKÜNDE, `backend/` Laravel uygulaması (`app/Modules/Learning`), `frontend/` ayrı. Zaten var: `scripts/gate.sh <tree>` (standart + PHPUnit + `node --test` + vitest + depo dışına vite build; çıkış 0/1/2/3, tek satır `GATE PASSED|FAILED …`), `scripts/standards-check.sh` (B2Press'ten modellenmiş; 7 sayaçlı `scripts/standards/baseline.txt`, GATE-BASE/GATE-SELF/GATE-R57, `baseline-notes/`), `docs/standards/live-learning-standards.md` (S-* kuralları + her dilimin inceleyicisinin yanıtladığı RQ-1..10 inceleme soruları), `docs/standards/gap-analysis.md` (STANDARDS-01, ölçüm `5cdb442`, REF-01..REF-12 sırası), `docs/standards/error-codes.md`, `backend/AGENTS.md` (katman kuralları, `git stash` yasağı, `AuthorizationMatrixTest`). Dilim dosyaları `docs/slices/` altında DEĞİL, doğrudan `docs/<ID>.md` (170 dosya; ürün kararları, gece notları ve handoff'larla karışık; `docs/slices/` dizini üç dalda da yok). İnceleme sonucu ayrı `-review.md` dosyası değil, dilim dosyasının "Review" bölümü (ör. `docs/FIX-D.md`: "an independent read-only reviewer found no High"); tam denetimler depo dışında `~/CODE/Ram/engineering-audit/audits/live-learning/`. Koordinatör durumu `docs/COORDINATOR-STATE-2026-10-19.md`, `docs/HANDOFF.md`, `docs/OVERNIGHT-<tarih>.md`; dilimler `.claude/worktrees/<x>` + `slice/<x>` dallarında, başsız `claude -p` süreçleri ve bir gözetmenle koşuyor. Farklar: merge sonrası **push sahibin sözü beklenmeden** birleştirme prosedürünün parçası (bu paketin "Asla" listesiyle çelişir; sahibin Live Learning'e özel kararı olup olmadığı doğrulanmadı); test DB'si bellek içi SQLite (MySQL koşusu MYSQL-TESTS-01). Benimseme: `slice-method.json` (gate = mevcut `scripts/gate.sh`), dilimleri `docs/slices/`'a taşımak ya da `slices_dir: docs` + ID öneki kuralı, inceleme sonucunu ayrı dosyaya ya da sabit "Karar:" satırına yazmak. `metrics.py` bugünkü düzende Live Learning'in incelemelerini sayamaz (ayrı rapor dosyası yok); bu yüzden ölçüm demosu yapılmadı.

**platform (tek paket).** Bu oturumda yöntemi koşan depo: `docs/slices/` (8 dilim, 7 inceleme, hepsi kapanış notlu), `docs/backlog.md` B1–B41, `docs/STATUS-2026-10-19.md`, `composer check` kapısı. Eksik: `slice-method.json`, kapanış notunda süre ve kaçan hata alanları.
