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
