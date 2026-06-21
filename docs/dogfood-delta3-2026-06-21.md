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

3. Real dogfood repo selected: `goztepe-web`.
   - `goztepe-web` is a git repo at `origin/main` / `b163c82`.
   - The evidence stamp is `b163c82`.
   - Added a current `docs/codebase-map.md` and `docs/ai/pattern-registry.json` as local untracked dogfood artifacts.
   - Pattern registry status is `PARTIAL`, which permits covered/mechanical work shapes only.
   - Registry includes the required living-memory fields: `evidence`, `enforcedBy`, and per-entry
     `lastVerifiedCommit`.
   - It captured both canonical reuse targets and do-not-copy entries:
     - TanStack file routes
     - TanStack Query server-state usage
     - shared API fetch wrappers
     - UI primitive wrapper pattern
     - payment bridge as a risk-boundary pattern, not a blind-copy pattern
     - localStorage access-token storage, dead premium routes, and duplicated API base URL as do-not-copy items

4. Dogfood changed how the validator should be used.
   - Adapter freshness must be checked at a concrete git repo, not a workspace root.
   - A committed adapter cannot contain its own commit hash. Freshness must accept either exact HEAD or a reachable
     ancestor stamp when no covered source paths changed since the stamp.
   - Both codebase map and pattern registry pass freshness when stamped with reachable source commit `b163c82`.
   - `preflight` still correctly fails because this was adapter/pattern-registry dogfood, not a delivery run.

5. Delta-3 push policy for this run.
   - The temporary local dogfood commit was removed by operator request.
   - The dogfood artifacts remain untracked locally in `goztepe-web`.
   - Nothing was pushed to any Delta-3 remote by operator instruction.

6. Mechanical catch-test run against `goztepe-web`.
   - Temporary bad ledgers were passed to the validator; no bad app code was committed or pushed.
   - `reuse-before-create` fails when a delivery ledger has no reuse/golden-neighbor evidence.
   - `do-not-copy` fails when a delivery ledger treats `risk.local-storage-access-token` as a reusable pattern.
   - The ACEF/BMAD hook denies a phase command before execution when the step-ledger row is missing.
   - The temporary hook marker was removed after the test.

## Commands exercised

```bash
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3 --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3 --check adapter-freshness --adapter docs/ai/DELTA3_PROJECT_ADAPTER.md
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/goztepe-web --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/fut-plus --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/core --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/Delta3-Core-Backend --check preflight
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/goztepe-web --check adapter-freshness --adapter docs/codebase-map.md
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/goztepe-web --check adapter-freshness --adapter docs/ai/pattern-registry.json
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/goztepe-web --check reuse-before-create --ledger /tmp/acef-bad-reuse.*.md
scripts/acef-process-validator --repo /Users/ramazanayyildiz/CODE/Delta-3/goztepe-web --check do-not-copy --ledger /tmp/acef-bad-copy.*.md
```

## Validation results

```text
PASS adapter-freshness: Adapter freshness matches HEAD b163c82
PASS adapter-freshness: Adapter freshness matches HEAD b163c82
FAIL preflight: Missing docs/ai/ACEF_PREFLIGHT.md
FAIL reuse-before-create: Missing reuse-before-create / golden-neighbor ledger entry
FAIL do-not-copy: Do-not-copy entr(y/ies) mentioned without rejection context: risk.local-storage-access-token
DENY hook: ACEF step-ledger gate blocks bmad-create-story until the delivery-ledger row is IN PROGRESS
json-ok
git diff --check: clean
```

## Current next step

The P0 process gates and first P1 conformance checks are now implemented and dogfood-proven at the mechanical level.
Next useful hardening is hook-level P1 enforcement for reuse-before-create / do-not-copy before writes, or P2 promotion
of repeated findings into repo-specific lint/fitness checks.
