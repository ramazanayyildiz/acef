# Benimseme

Bir uygulama yöntemi dört adımda alır. Hiçbiri çalışma zamanı bağımlılığı eklemez; dosyalar uygulamanın deposuna kopyalanır ve orada sahiplenilir. Hangi sürümün alındığı `slice-method.json` → `method_version`'da, hangi yığın profilinin kullanıldığı `stack_profile`'da yazar.

1. **Şablonlar.** `templates/slice/` → `<app>/docs/slices/_templates/` (ya da projenin dilim dizini). `invariants-skeleton.md` → `<app>/docs/slices/_invariants.md` olarak doldurulur; ilk değişmezler projenin zaten tekrar ettiği kabul metinlerinden çıkar. `module-CLAUDE.md` modüllü projelerde her modüle (yığın adaptörünün doldurulmuş sürümü varsa o).
2. **`slice-method.json`.** `docs/slice-lane/examples/slice-method.example.json`'dan: `{{project}}`, dilim/kanıt dizinleri, gate komutları (`{{test_command}}`, `{{static_analysis}}`, `{{boundary_check}}`, `{{standards_check}}`), kritik postmerge seti, hat portları ve DB kalıbı, sıcak dosyalar, salt okunur taranacak host depolar, `stack_profile`. Şemalar: `schemas/slice-method.schema.json`, `schemas/stack-profile.schema.json`.
3. **Kapı.** `scripts/slice/gate.sh` → `<app>/scripts/gate.sh`, `scripts/slice/standards-check.sh` (+ yığının `standards/rules.example.json` → `rules.json`, birleştiricinin ölçtüğü `baseline.txt`), varsa yığının sınır bekçisi. Geliştirici ve inceleyici kendi worktree'sini argüman verir; CI aynı komut listesini koşabilir.
4. **Kayıt.** `docs/backlog.md` (B<n> tablosu: ID | Kaynak | Önem | Madde | Durum), günlük `docs/STATUS-<tarih>.md`, `interventions.json`. Kapanış notları `templates/slice/closing-note.md` alanlarıyla yazılır ki `scripts/slice/metrics.py` okuyabilsin.

Kaynak projelerin 2026-10-19'daki benimseme durumu (hangi parça zaten vardı, ne eksikti) kaynak kaydıdır: `SOURCES.md` → "Adoption status at import".

## Adopt in a new stack

The core (`method/SLICE_LANE.md`, `templates/slice/`, `schemas/`, `docs/slice-lane/`, `scripts/slice/`) names no
language, framework, or tool. A stack is added as an adapter under `stacks/<stack>/`; nothing in the core changes.

1. **Create the adapter directory.** `stacks/<stack>/` with a `README.md` that lists each file, what it does, and where
   it is copied in an application. Use an existing adapter as the model.
2. **Write `stacks/<stack>/profile.json`** against `schemas/stack-profile.schema.json`: `stack`, `profile_version`, and
   `placeholders` with the four required keys — `test_command`, `static_analysis`, `boundary_check`,
   `standards_check` — plus every optional key the core templates and the core example use (`{{route_list}}`,
   `{{app_shell}}`, `{{migrate_roundtrip}}`, `{{browser_smoke}}`). Keys are lower snake_case. A stack without a
   boundary checker or type checker says so with a command such as `true` and a sentence in `description`; it never
   leaves a key empty. The gate resolves every command before running any: an undefined or empty key, a key that is
   not lower snake_case, or a `{{…}}` left after expansion exits 2. If the stack's runtime prints its own "file not
   found" wording, add it to `"standards": {"tool_error_patterns": [...]}` so a missing linter FAILs instead of
   counting 0. List the stack's toolchain in `"selfcheck": {"requires": [...]}`.
3. **Add the stack's checks.** `stacks/<stack>/standards/rules.example.json` for the core engine
   `scripts/slice/standards-check.sh` (line checks, counters, command counters for the stack's linters), a baseline
   example, and a boundary checker if the stack has modules. Write `stacks/<stack>/checklist-commands.md` with the
   stack's command for every review-checklist row that has a `{{…}}` or `<…>` pattern (B1–B2, C1–C9, D2–D3) and for
   the dev-report self-check rows. Optionally add a filled-in `templates/module-CLAUDE.md`. The review call
   (`scripts/slice/codex-review.sh`) is part of the core; an adapter does not need its own.
4. **Add a gate wrapper and examples.** `stacks/<stack>/gate.sh` runs the core gate with
   `--profile <adapter>/profile.json`; `stacks/<stack>/examples/slice-method.example.json` shows the gate commands
   built from the placeholders, with `"stack_profile": "scripts/stack-profile.json"`.
5. **Add self-tests and run the lane's gate.** `stacks/<stack>/tests/test-*.sh` (profile fills the four keys, the
   wrapper expands them in a throwaway repo, each checker fails loudly on a seeded violation). Then
   `bash scripts/slice/selfcheck.sh --stack <stack>` must print `SELFCHECK PASS`. Without `--stack`, selfcheck
   always runs the core checks (syntax, templates, core self-tests, metrics fixture, neutrality scan) and runs an
   adapter's checks only when every command in its `selfcheck.requires` answers `--version`; otherwise it prints
   `SKIP stack <name>` and does not fail, so a machine without one stack's toolchain still passes. `--stack <name>`
   forces that adapter (a missing prerequisite then FAILS). The neutrality scan fails if the core names a stack, a
   stack's tools, or a source project outside `SOURCES.md` and the section below; `--scan-only` runs just the scan.

In an application: copy the core files (steps 1–3 of "Benimseme" above), then `stacks/<stack>/profile.json` →
`<app>/scripts/stack-profile.json` and the adapter files listed in the adapter's `README.md` / `profile.json`
→ `files`.

## Laravel profile

Reference adapter: `stacks/laravel/` (profile with PHPUnit, PHPStan, `check-module-boundaries.php`, Laravel standards
rules). Its `README.md` lists every file and where it goes; `checklist-commands.md` holds the checklist B–D commands.
