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
   - `goztepe-web` is a git repo at local HEAD `770e81a`, one local commit ahead of `origin/main`.
   - The evidence stamp is `b163c82`, the reachable source commit before the local ACEF docs commit.
   - Added a current `docs/codebase-map.md` and `docs/ai/pattern-registry.json`.
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
   - The dogfood commit exists locally in `goztepe-web` as `770e81a`.
   - It was not pushed to any Delta-3 remote by operator instruction.

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
```

## Validation results

```text
PASS adapter-freshness: Adapter freshness b163c82 is ancestor of HEAD 770e81a; no covered changes since stamp
PASS adapter-freshness: Adapter freshness b163c82 is ancestor of HEAD 770e81a; no covered changes since stamp
FAIL preflight: Missing docs/ai/ACEF_PREFLIGHT.md
json-ok
git diff --check: clean
```

## Next dogfood step

Patch ACEF from the dogfood findings:

- Document that pattern registries use reachable evidence commits, not necessarily exact final commit hashes.
- Add/clarify that `PARTIAL` registry permits only covered mechanical/standard work shapes.
- Keep `gate-summaries` and `drift-notes` in delivery ledgers, not adapter memory.
- Add a future validator path for reuse-before-create/do-not-copy once P0 process validators are stable.

Then use a real delivery run to exercise:

```bash
scripts/acef-process-validator --repo <repo> --check preflight
```
