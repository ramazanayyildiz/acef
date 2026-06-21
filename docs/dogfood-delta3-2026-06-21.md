# Delta-3 Dogfood Notes — 2026-06-21

Scope: first real run of `scripts/acef-process-validator` against `/Users/ramazanayyildiz/CODE/Delta-3`.

## Findings

1. Delta-3 root is a multi-repo workspace, not a git repo.
   - `adapter-freshness` cannot resolve HEAD at the workspace root.
   - Validator now reports nested repos and asks the operator to choose a git repo with `--repo`.

2. Existing Delta-3 docs are pre-ACEF-contract artifacts.
   - Root has `docs/ai/DELTA3_PROJECT_ADAPTER.md`.
   - Subrepos checked (`goztepe-web`, `fut-plus`, `core`, `Delta3-Core-Backend`) do not yet have
     `docs/ai/ACEF_PREFLIGHT.md`.
   - `preflight` correctly fails in those repos.

## Commands exercised

```bash
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3 --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3 --check adapter-freshness --adapter docs/ai/DELTA3_PROJECT_ADAPTER.md
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/goztepe-web --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/fut-plus --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/core --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/Delta3-Core-Backend --check preflight
```

## Next dogfood step

Pick one git repo, preferably `goztepe-web` or `core`, and generate the first current adapter + pattern registry:

- `docs/codebase-map.md`
- `docs/ai/pattern-registry.json`
- optional `docs/ai/ACEF_PREFLIGHT.md` for a real task run

Then rerun:

```bash
scripts/acef-process-validator --repo <repo> --check adapter-freshness --adapter docs/codebase-map.md
scripts/acef-process-validator --repo <repo> --check preflight
```
