# stacks/laravel — Laravel adapter for the Slice lane

The Slice lane core (`method/SLICE_LANE.md`, `templates/slice/`, `schemas/`, `docs/slice-lane/`, `scripts/slice/`) is
stack-neutral: stack commands appear as `{{test_command}}`, `{{static_analysis}}`, `{{boundary_check}}`,
`{{standards_check}}` (plus optional keys). This directory fills them for Laravel/PHP applications.

| File | Role | Copied into the app as |
|---|---|---|
| `profile.json` | fills the placeholders (schema: `schemas/stack-profile.schema.json`) | `scripts/stack-profile.json` (`slice-method.json` → `"stack-profile"`) |
| `gate.sh` | runs the core `scripts/slice/gate.sh` with `--profile profile.json` (from an acef checkout) | — (apps copy the core gate) |
| `check-module-boundaries.php` | module → module dependency ratchet (`--namespace`, `--modules-dir`) | `scripts/check-module-boundaries.php` |
| `standards/` | Laravel rules for the core standards engine, baseline example, per-slice notes README | `scripts/standards/` |
| `codex-review.sh` | read-only review by another model family (no PHP dependency) | `scripts/codex-review.sh` |
| `checklist-commands.md` | Laravel commands for review checklist B–D and the dev-report self-check | read by reviewers |
| `templates/module-CLAUDE.md` | filled-in module rules (Livewire, `DB::`, `route.permission`) | `app/Modules/<Module>/CLAUDE.md` |
| `examples/` | `slice-method.example.json` (Laravel gate), `module-boundaries.json` (frozen graph) | `slice-method.json` |
| `metrics-demo.sh`, `metrics-paths.json` | regenerate `archive/slice-lane/metrics-2026-10-19.md` from pinned source projects | — |
| `tests/` | `test-standards.sh`, `test-boundaries.sh`, `test-profile.sh` | — |

Tests: `bash scripts/slice/selfcheck.sh` runs the core checks and every `stacks/*/tests/test-*.sh`; or run
`bash stacks/laravel/tests/test-*.sh` one by one (needs `php` and `python3`).

Adoption steps: `docs/slice-lane/adoption.md` ("Adopt in a new stack", "Laravel profile").
