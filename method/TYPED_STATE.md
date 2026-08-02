# ACEF Typed State

Markdown remains the human narrative. JSON sidecars carry machine truth.

ACEF should not require hooks, validators, and query tools to independently parse prose for the same fact. Critical
state moves into typed sidecars and is read through one parser library.

## Ownership Model

| Information | Canonical owner |
|---|---|
| Active run, execution workflow, assurance profile, scope unit, story, phase | `docs/ai/ACEF_ACTIVE_RUN.json` |
| Direct task scope, focused verification, handoff, and promotion | `docs/ai/ACEF_DIRECT_RUN.json` |
| Worker identity and context profile | `docs/ai/actors/*.json` |
| Active worker write boundary, including active-run `runId` | `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` |
| Runtime command evidence | `docs/ai/evidence/*.json` |
| Gate verdict | `docs/ai/gates/*.json` |
| Human approval receipt | `docs/ai/approvals/*.json` |
| Story acceptance criteria | story artifact |
| Pattern canonicality | pattern registry |
| Human-readable chronology | delivery ledger |
| Worker hot slice | generated `ACEF_CURRENT_CONTEXT.md` |

## JSON First, Markdown Second

Validators and guards should prefer JSON sidecars. Markdown parsing is allowed only as a compatibility fallback while
older ACEF repos migrate.

## Initial Schemas

The first typed-state slice defines these contracts:

- `schemas/active-run-v2.schema.json` (current; v1 remains readable for migration)
- `schemas/direct-run.schema.json`
- `schemas/actor.schema.json`
- `schemas/evidence.schema.json`
- `schemas/gate.schema.json`
- `schemas/review-report-v3.schema.json`
- `schemas/developer-repair-v3.schema.json`
- `schemas/process-judge-decision-v3.schema.json`
- `schemas/approval.schema.json`
- `schemas/worker-scope.schema.json`

The parser entrypoint is `scripts/lib/acef-state-parser.js`.

## Operational Writer

Install the repo-local tools, then use `.acef/bin/acef-state` instead of hand-authoring machine state:

```bash
scripts/install-acef-tools --repo /path/to/repo

.acef/bin/acef-state active-run --repo . --run-id RUN-4-1 \
  --workflow-id full-bmad --full-flow-contract four-actor-v3 \
  --assurance guarded --scope-unit story \
  --expected-story "Story 4.1" \
  --assurance-rationale "provider integration" \
  --status active --story "Story 4.1" --phase atdd \
  --ledger docs/ai/ACEF_example_DELIVERY_AUDIT.md \
  --context docs/ai/ACEF_CURRENT_CONTEXT.md

.acef/bin/acef-state actor --repo . --id atdd-4-1 --story "Story 4.1" \
  --phase atdd --role test-author --client codex --context-profile atdd

# Advance the active phase before creating its actor. V3 Developer identity is
# stable across bounded repair cycles, so record the spawn result's exact
# agent_id/receiver thread id as its session ID; task_name is not a session ID.
.acef/bin/acef-state active-run --repo . --run-id RUN-4-1 \
  --workflow-id full-bmad --status active --story "Story 4.1" --phase development \
  --ledger docs/ai/ACEF_example_DELIVERY_AUDIT.md

.acef/bin/acef-state actor --repo . --id dev-4-1 --story "Story 4.1" \
  --phase development --role developer --client codex --session-id codex-session-4-1 \
  --context-profile developer

.acef/bin/acef-state worker-scope --repo . --story "Story 4.1" --phase development \
  --worker-id dev-4-1 --allow 'app/**' --allow 'tests/**'

.acef/bin/acef-state evidence-run --repo . --id story-4-1-runtime --kind runtime-test \
  --actor dev-4-1 --story "Story 4.1" --satisfies FR-12 -- php artisan test --filter Story41

.acef/bin/acef-state gate --repo . --id story-4-1-close --scope "Story 4.1" \
  --atdd-actor atdd-4-1 --development-actor dev-4-1 \
  --code-review-actor review-4-1 --patch-assurance-actor assurance-4-1 \
  --red-evidence story-4-1-red --green-evidence story-4-1-runtime \
  --code-review-report-hash <sha256> --patch-assurance-report-hash <sha256>

# After a deterministic REVISE and an actual Developer repair commit, derive
# the immutable receipt instead of hand-authoring it.
.acef/bin/acef-state developer-repair --repo . --id story-4-1-repair-1 \
  --prior-gate story-4-1-close --developer-actor dev-4-1

# When a conditional Story Judge trigger exists, derive its run/story/actor
# binding and verdict; pass this artifact to gate with --judge-decision.
.acef/bin/acef-state judge-decision --repo . --id story-4-1-ambiguity \
  --gate-id story-4-1-close-r1 --actor judge-4-1 --trigger ambiguity \
  --evidence story-4-1-red --evidence story-4-1-runtime

.acef/bin/acef-state approval --repo . --id epic-5-start --decision APPROVE \
  --scope epic:5 --target-epic 5 --quote "Start Epic 5"
```

New direct-run admission is retired. `acef-state direct-run` remains available only when
`docs/ai/ACEF_DIRECT_RUN.json` already exists with the same run ID, so old records can be closed or promoted without
discarding history.

Active-run v2 separates planning depth (`workflowId`: `quick-fix`, `lightweight`, or `full-bmad`) from risk assurance
(`assuranceProfile`: `baseline` or `guarded`). Guarded is additive. A legacy active `lane: guarded` does not contain
enough information to infer planning depth, so authorization fails closed until it is migrated explicitly:

```bash
.acef/bin/acef-state migrate-active-run --repo . \
  --workflow-id lightweight --assurance guarded
```

Full runs also select a versioned story contract. Existing records without `fullFlowContract` mean
`six-actor-v2`; new Full runs default to `four-actor-v3`. Once a run has lifecycle actor/gate records, the contract is
immutable. Every new v3 run must declare its complete `--expected-story` inventory before its first actor or gate; the
inventory is preserved across story and Epic phases and cannot be added to or narrowed later. V3 story `PASS` is computed from typed actors, red→green evidence, final-tree review/assurance, findings,
runner proof, and hashes; `--verdict PASS` cannot override a failed check. Actor-decided gates remain supported for
legacy runs and mandatory Epic close. Conditional v3 Story Judge decisions are hashed inputs to the deterministic gate
and cannot override a failed mechanical check.

A v3 Epic close must freeze its story inventory when the Epic scope starts:

```bash
.acef/bin/acef-state active-run --repo . --run-id RUN-EPIC-4 \
  --workflow-id full-bmad --scope-unit epic --story "Epic 4" --phase epic-process-judge \
  --expected-story "Story 4.1" --expected-story "Story 4.2" \
  --status active --ledger docs/ai/ACEF_example_DELIVERY_AUDIT.md
```

The actor-decided Epic gate persists that inventory and must aggregate exactly one terminal deterministic `PASS` and
the green evidence for every listed story. Naming a story scope `Epic ...` does not change its gate type.

`evidence-run` executes an argv command without a shell, stores stdout/stderr under
`docs/ai/evidence/raw/`, hashes the raw artifact, records the Git commit/tree and actor, and preserves the command's
exit code. It also writes a deterministic `runnerProof` over the command, exit code, repository state, actor, story,
raw artifact hash, and satisfied checks. It refuses to start when application paths are already dirty. A `PASS` gate must
cite at least one successful evidence manifest whose raw hash, runner header, and runner proof still match.

Actor, evidence, gate, and approval records are immutable. `ACEF_DIRECT_RUN.json`, `ACEF_ACTIVE_RUN.json`, and
`ACEF_ACTIVE_WORKER_SCOPE.json` are atomic singletons and may be replaced only as the run advances.
`acef-state worker-scope` requires an active run, requires the same story, and copies the active `runId` into the scope.
Legacy scopes without `runId` still parse for migration, but write authorization and pre-commit reject them until the
scope is regenerated.

## Validator Contract

New typed runs use JSON first:

```bash
.acef/bin/acef-process-validator --repo . --check actor-separation --ledger "$LEDGER"
.acef/bin/acef-process-validator --repo . --check run-authorization
.acef/bin/acef-process-validator --repo . --check worker-scope --ledger "$LEDGER"
.acef/bin/acef-process-validator --repo . --check evidence-manifest --ledger "$LEDGER"
.acef/bin/acef-process-validator --repo . --check gate-verdict --ledger "$LEDGER"
.acef/bin/acef-process-validator --repo . --check epic-transition-approval --ledger "$LEDGER" --target-epic 5
```

The checks bind actors to story phases, scope to the active actor, evidence to actor/commit/raw bytes, gate PASS to
successful evidence, and epic transitions to an exact human quote. Generic continuation text cannot satisfy an epic
approval. Repositories without `ACEF_ACTIVE_RUN.json` retain the Markdown compatibility path.

## Non-Goals

This is not a SQLite rollout, vector search, graph storage, or general memory layer. JSON sidecars are the first step
because they make existing checks less brittle without changing ACEF's local-first Git authority model.
