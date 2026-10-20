# stacks/laravel — Laravel adapter for the Slice lane

The Slice lane core (`method/SLICE_LANE.md`, `templates/slice/`, `schemas/`, `docs/slice-lane/`, `scripts/slice/`) is
stack-neutral: stack commands appear as `{{test_command}}`, `{{static_analysis}}`, `{{boundary_check}}`,
`{{standards_check}}` (plus optional keys). This directory fills them for Laravel/PHP applications.

| File | Role | Copied into the app as |
|---|---|---|
| `profile.json` | fills the placeholders (schema: `schemas/stack-profile.schema.json`) | `scripts/stack-profile.json` (`slice-method.json` → `"stack_profile"`) |
| `gate.sh` | runs the core `scripts/slice/gate.sh` with `--profile profile.json` (from an acef checkout) | — (apps copy the core gate) |
| `check-module-boundaries.php` | module → module dependency ratchet (`--namespace`, `--modules-dir`) | `scripts/check-module-boundaries.php` |
| `migrate-roundtrip.sh` | `{{migrate_roundtrip}}` (checklist C9): `migrate`, then `migrate:rollback --step=<n>` for only what that run applied; `--database=`/`--path=`/`--force` pass through; n = 0 exits 3 | `scripts/migrate-roundtrip.sh` |
| `standards/` | Laravel rules for the core standards engine, baseline example, per-slice notes README | `scripts/standards/` |
| `checklist-commands.md` | Laravel commands for review checklist B–D and the dev-report self-check | read by reviewers |
| `templates/module-CLAUDE.md` | filled-in module rules (Livewire, `DB::`, `route.permission`) | `app/Modules/<Module>/CLAUDE.md` |
| `examples/` | `slice-method.example.json` (Laravel gate), `module-boundaries.json` (frozen graph) | `slice-method.json` |
| `metrics-demo.sh`, `metrics-paths.json` | regenerate `archive/slice-lane/metrics-2026-10-19.md` from pinned source projects | — |
| `tests/` | `test-standards.sh`, `test-boundaries.sh`, `test-profile.sh`, `test-migrate-roundtrip.sh` | — |

Tests: `bash scripts/slice/selfcheck.sh --stack laravel` runs the core checks and this adapter's checks (`php -l`,
`tests/`). Without `--stack`, selfcheck runs them only when `php --version` works (`profile.json` →
`selfcheck.requires`) and otherwise prints `SKIP stack laravel`. The profile also adds PHP's "Could not open input
file" to the standards engine's tool-error wording (`standards.tool_error_patterns`) and keeps the source project's
evidence-directory naming (`metrics.evidence_dir_strip_phase_prefix: true`). The review call is the core
`scripts/slice/codex-review.sh`.

Adoption steps: `docs/slice-lane/adoption.md` ("Adopt in a new stack", "Laravel profile").
