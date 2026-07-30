# ACEF Typed State

Markdown remains the human narrative. JSON sidecars carry machine truth.

ACEF should not require hooks, validators, and query tools to independently parse prose for the same fact. Critical
state moves into typed sidecars and is read through one parser library.

## Ownership Model

| Information | Canonical owner |
|---|---|
| Active run, lane, story, phase | `docs/ai/ACEF_ACTIVE_RUN.json` |
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

- `schemas/active-run.schema.json`
- `schemas/direct-run.schema.json`
- `schemas/actor.schema.json`
- `schemas/evidence.schema.json`
- `schemas/gate.schema.json`
- `schemas/approval.schema.json`
- `schemas/worker-scope.schema.json`

The parser entrypoint is `scripts/lib/acef-state-parser.js`.

## Operational Writer

Install the repo-local tools, then use `.acef/bin/acef-state` instead of hand-authoring machine state:

```bash
scripts/install-acef-tools --repo /path/to/repo

.acef/bin/acef-state actor --repo . --id dev-4-1 --story "Story 4.1" \
  --phase development --role developer --client codex --context-profile developer

.acef/bin/acef-state active-run --repo . --run-id RUN-4-1 --lane guarded \
  --status active --story "Story 4.1" --phase development \
  --ledger docs/ai/ACEF_example_DELIVERY_AUDIT.md \
  --context docs/ai/ACEF_CURRENT_CONTEXT.md \
  --worker-role developer --actor dev-4-1 \
  --worker-scope docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json

.acef/bin/acef-state worker-scope --repo . --story "Story 4.1" --phase development \
  --worker-id dev-4-1 --allow 'app/**' --allow 'tests/**'

.acef/bin/acef-state evidence-run --repo . --id story-4-1-runtime --kind runtime-test \
  --actor dev-4-1 --story "Story 4.1" --satisfies FR-12 -- php artisan test --filter Story41

.acef/bin/acef-state gate --repo . --id story-4-1-judge --scope "Story 4.1" \
  --verdict PASS --decided-by judge-4-1 --evidence story-4-1-runtime

.acef/bin/acef-state approval --repo . --id epic-5-start --decision APPROVE \
  --scope epic:5 --target-epic 5 --quote "Start Epic 5"
```

New direct-run admission is retired. `acef-state direct-run` remains available only when
`docs/ai/ACEF_DIRECT_RUN.json` already exists with the same run ID, so old records can be closed or promoted without
discarding history.

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
