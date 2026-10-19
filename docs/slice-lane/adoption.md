# Benimseme

Bir uygulama yöntemi dört adımda alır. Hiçbiri çalışma zamanı bağımlılığı eklemez; dosyalar uygulamanın deposuna kopyalanır ve orada sahiplenilir. Hangi sürümün alındığı `slice-method.json` → `method_version`'da yazar.

1. **Şablonlar.** `templates/` → `<app>/docs/slices/_templates/` (ya da projenin dilim dizini). `invariants-skeleton.md` → `<app>/docs/slices/_invariants.md` olarak doldurulur; ilk değişmezler projenin zaten tekrar ettiği kabul metinlerinden çıkar. `module-CLAUDE.md` modüllü projelerde her modüle.
2. **`slice-method.json`.** `slice-method.example.json`'dan: dilim/kanıt dizinleri, gate komutları, kritik postmerge seti, hat portları ve DB kalıbı, sıcak dosyalar, salt okunur taranacak host depolar. Şema: `schema/slice-method.schema.json`.
3. **Kapı.** `scripts/gate.sh`, `standards-check.sh` (+ `standards/rules.json`, birleştiricinin ölçtüğü `baseline.txt`), varsa `check-module-boundaries.php`. Geliştirici ve inceleyici kendi worktree'sini argüman verir; CI aynı komut listesini koşabilir.
4. **Kayıt.** `docs/backlog.md` (B<n> tablosu: ID | Kaynak | Önem | Madde | Durum), günlük `docs/STATUS-<tarih>.md`, `interventions.json`. Kapanış notları `templates/closing-note.md` alanlarıyla yazılır ki `scripts/metrics.py` okuyabilsin.

## Uygulamalar: neyi zaten var

**unusual-saas-bootstrap.** Çalışma `platform/consume-package` → `boot-fix-01` → `boot-fix-02` → `boot-fix-03` yığın dallarında; `main`'e PR tepe daldan, sahibin sözüyle. Hat DB'leri `us_crm_testing_l7`/`_l8` ve `phpunit.l<N>.xml` (platform STATUS). `composer check` kapı olarak kullanılıyor; Dusk/E2E betikleri ve `check-platform-dependencies.php` var. Dilim dosyaları `docs/plans/slices/` altında (BOOT-FIX dilimleri). Eksik: standart ratchet'i (PR #44 CRM'de; bootstrap'ta yok), `slice-method.json`, mimari testler (SKEL-01 sırada), modül sınırı bekçisi (B35).

**b2press-rebuild.** Yöntemin kaynağı: `AGENTS.md`, `docs/slices/_template.md`, `_invariants.md` (I1–I19), `scripts/gate.sh`, `standards-check.sh` (TOOL-04, 7 sayaç), `codex-review.sh` (şema doğrulamalı), `slice-worktree.sh`/`slice-teardown.sh`, `observations/locks.md`, `interventions.json`. Benimseme = yalnız `slice-method.json` eklemek ve kapanış notu alanlarını kullanmaya başlamak; mevcut betikler kalabilir. Ölçüm demosu iki boşluk gösterdi: kapanış notlarının çoğu doldurulmamış yer tutucu, `Durum:` satırı kapanışta güncellenmiyor (`docs/metrics-2026-10-19.md`). Açık backlog'u: B29/B30/B33 (araçlar `app/packages/platform` varsayıyor, tek süreçli PHPUnit OOM, GATE-PKG boş yol).

**US-CRM (unusualspace-crm).** Handoff "Working method" yöntemi tanımlıyor: ≤150 satır dilim, alt ajan geliştirici, temiz ağaç koşusu, alan bazlı Full/Light sınıfları, Codex `gpt-6.1-sol` döngüde, 5 hat / 2 ağır slot, hat DB'si `us_crm_testing_l<N>`, kritik postmerge seti (`tests/Feature/Billing`, `tests/Feature/Authorization`, `RevolutWebhookTest`, `StatementRetryTest`, `UserImpersonationFeatureTest`, `--filter=Team`), faz kapanışında keşif turu. Standart ratchet'i PR #44'te (açık, merge edilmedi). Henüz `docs/slices/` dizini ya da kapanmış dilim yok; bu yüzden ölçüm demosu yapılmadı. Benimseme: PR #44 merge olunca `rules.json`'a taşımak ya da olduğu gibi bırakmak; `slice-method.json`'a kritik seti yazmak.

**Jakomeet.** Kendi BMAD akışı var (`_bmad-output`, `docs/bmad/pre-review-selfcheck.md` + pre-commit kancası, kural numaraları), `docs/rules/general.md`, modül başına `CLAUDE.md` (Events), modül sınırı bekçisi (PR #94) ve `.claude/skills/security-audit`. Bu paket Jakomeet'ten üç şey aldı (bekçi, öz-denetim, güvenlik bulgu disiplini). Benimseme önerisi: BMAD story akışını değiştirmeden inceleme adımında `review-checklist.md`'yi ve kapanışta `closing-note.md` alanlarını kullanmak. Platform geçiş dilimleri B14/B20 Jakomeet `development` 1fc60009 tabanından başlar (B36).

**Live Learning.** Depo `/Users/ramazanayyildiz/CODE/Ram/live-learning`, dal `work-course-progress-report` (HEAD `4a5ec811`; `origin/development` geride). Yöntem dosyaları depo KÖKÜNDE, `backend/` Laravel uygulaması (`app/Modules/Learning`), `frontend/` ayrı. Zaten var: `scripts/gate.sh <tree>` (standart + PHPUnit + `node --test` + vitest + depo dışına vite build; çıkış 0/1/2/3, tek satır `GATE PASSED|FAILED …`), `scripts/standards-check.sh` (B2Press'ten modellenmiş; 7 sayaçlı `scripts/standards/baseline.txt`, GATE-BASE/GATE-SELF/GATE-R57, `baseline-notes/`), `docs/standards/live-learning-standards.md` (S-* kuralları + her dilimin inceleyicisinin yanıtladığı RQ-1..10 inceleme soruları), `docs/standards/gap-analysis.md` (STANDARDS-01, ölçüm `5cdb442`, REF-01..REF-12 sırası), `docs/standards/error-codes.md`, `backend/AGENTS.md` (katman kuralları, `git stash` yasağı, `AuthorizationMatrixTest`). Dilim dosyaları `docs/slices/` altında DEĞİL, doğrudan `docs/<ID>.md` (170 dosya; ürün kararları, gece notları ve handoff'larla karışık; `docs/slices/` dizini üç dalda da yok). İnceleme sonucu ayrı `-review.md` dosyası değil, dilim dosyasının "Review" bölümü (ör. `docs/FIX-D.md`: "an independent read-only reviewer found no High"); tam denetimler depo dışında `~/CODE/Ram/engineering-audit/audits/live-learning/`. Koordinatör durumu `docs/COORDINATOR-STATE-2026-10-19.md`, `docs/HANDOFF.md`, `docs/OVERNIGHT-<tarih>.md`; dilimler `.claude/worktrees/<x>` + `slice/<x>` dallarında, başsız `claude -p` süreçleri ve bir gözetmenle koşuyor. Farklar: merge sonrası **push sahibin sözü beklenmeden** birleştirme prosedürünün parçası (bu paketin "Asla" listesiyle çelişir; sahibin Live Learning'e özel kararı olup olmadığı doğrulanmadı); test DB'si bellek içi SQLite (MySQL koşusu MYSQL-TESTS-01). Benimseme: `slice-method.json` (gate = mevcut `scripts/gate.sh`), dilimleri `docs/slices/`'a taşımak ya da `slices_dir: docs` + ID öneki kuralı, inceleme sonucunu ayrı dosyaya ya da sabit "Karar:" satırına yazmak. `metrics.py` bugünkü düzende Live Learning'in incelemelerini sayamaz (ayrı rapor dosyası yok); bu yüzden ölçüm demosu yapılmadı.

**platform (tek paket).** Bu oturumda yöntemi koşan depo: `docs/slices/` (8 dilim, 7 inceleme, hepsi kapanış notlu), `docs/backlog.md` B1–B41, `docs/STATUS-2026-10-19.md`, `composer check` kapısı. Eksik: `slice-method.json`, kapanış notunda süre ve kaçan hata alanları.

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
