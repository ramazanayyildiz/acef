# ACEF Typed State

Markdown remains the human narrative. JSON sidecars carry machine truth.

ACEF should not require hooks, validators, and query tools to independently parse prose for the same fact. Critical
state moves into typed sidecars and is read through one parser library.

## Ownership Model

| Information | Canonical owner |
|---|---|
| Active run, lane, story, phase | `docs/ai/ACEF_ACTIVE_RUN.json` |
| Worker identity and context profile | `docs/ai/actors/*.json` |
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
- `schemas/actor.schema.json`
- `schemas/evidence.schema.json`
- `schemas/gate.schema.json`
- `schemas/approval.schema.json`

The parser entrypoint is `scripts/lib/acef-state-parser.js`.

## Non-Goals

This is not a SQLite rollout, vector search, graph storage, or general memory layer. JSON sidecars are the first step
because they make existing checks less brittle without changing ACEF's local-first Git authority model.

