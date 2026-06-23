# ACEF Stabilization Roadmap

ACEF should now enter a validation-first phase. The goal is not to add more retrieval, graph, vector, or orchestration
infrastructure. The goal is to make the core delivery model cheaper, less brittle, and empirically measurable.

## Strategic Decision

Keep ACEF's core:

```text
agent claim != evidence
artifact exists != capability works
green test != correct implementation
review report != independent verification
retrieval bytes != actor token/cost savings
```

Do not promote `files` retrieval, Context Mode, SQLite, vectors, graphs, SCIP, Serena, or Codebase-Memory to defaults
until real actor runs prove the benefit without quality or scope regressions.

## Phase 0: Freeze and Baseline

Rules:

- no new retrieval/storage backend by default;
- `acef-query --provider files` and `--provider context-mode` stay experimental;
- keep current safe optimizations;
- record future experiments before changing worker defaults.

Default safe optimizations:

- `ACEF_CURRENT_CONTEXT.md`;
- Epic Context Pack;
- role-specific short prompts;
- targeted file and diff reads;
- short test failure summaries;
- short worker final reports.

Exit criteria:

- ACEF docs say retrieval providers are experimental;
- default worker policy does not depend on Context Mode or byte-reduction claims;
- no new backend is admitted without measured failure of the current layer.

## Phase 1: Context Diet

Goal: reduce token consumption without changing the evidence model.

Deliverables:

- `method/CONTEXT_POLICY.md`;
- role-specific context profiles;
- current-context generation and validation rules;
- worker report limits.

Exit criteria:

- ordinary workers no longer receive the full ledger by default;
- test failures are summarized instead of dumping full HTML/output;
- final reports are short and detailed evidence is file-backed.

## Phase 2: Typed JSON Sidecars

Goal: stop treating Markdown prose as the only machine state.

Deliverables:

- `method/TYPED_STATE.md`;
- `schemas/active-run.schema.json`;
- `schemas/actor.schema.json`;
- `schemas/evidence.schema.json`;
- `schemas/gate.schema.json`;
- `schemas/approval.schema.json`.

Ownership model:

```text
Markdown ledger       -> human-readable chronology
JSON sidecars         -> machine truth
ACEF_CURRENT_CONTEXT  -> generated projection
SQLite later          -> optional index/projection
```

Exit criteria:

- new runs can write active-run, actor, evidence, gate, and approval JSON records;
- validators can prefer JSON records over Markdown parsing.

## Phase 3: Shared Parser

Goal: make hook, validator, and query interpret ACEF state the same way.

Deliverables:

- `scripts/lib/acef-state-parser.js`;
- parser fixtures and tests;
- migration of high-value checks away from one-off regex.

Parser surface:

```text
parseActiveRun()
parseActorRecord()
parseApproval()
parseEvidenceManifest()
parseGateVerdict()
parseFreshness()
parseWorkerScope()
```

Exit criteria:

- the same parser fixtures are used by validator, guard, and query tests;
- duplicated parsing logic is removed or marked for retirement.

## Phase 4: Evidence and Trust Model

Goal: make "evidence" and "guard" claims precise.

Deliverables:

- `method/TRUST_MODEL.md`;
- evidence manifest schema;
- approval receipt schema;
- explicit `UNKNOWN` / `STALE` / `PARTIAL` gate semantics.

Rules:

- ACEF guards are drift-prevention tools, not an OS security boundary;
- forced human decisions should be receipts, not only prose quotes;
- hard gates require fresh evidence bound to the repository commit/tree and command.

Exit criteria:

- docs state what ACEF does and does not protect against;
- runtime evidence records bind command, exit code, repo commit/tree, dirty digest, and raw evidence hash when available.

## Phase 5: Real Measurement Round

Goal: determine where ACEF is worth its process cost.

Deliverable:

- `method/VALIDATION_PLAN.md`;
- at least 30 real task runs before calling a lane empirically proven.

Required sample:

```text
10 native/baseline runs
10 ACEF lightweight runs
10 ACEF guarded/full runs
```

Exit criteria:

- median total input token reduction at least 25%;
- no worse blocker/high escaped defects than baseline;
- guarded scope violations are 0;
- context-miss retries affect fewer than 10% of runs;
- lightweight wall-clock overhead below 30%.

## Phase 6: SQLite Projection, Only If Justified

Goal: query structured ACEF state faster without changing source of truth.

SQLite is not canonical. It is a projection from:

- Markdown reports;
- JSON sidecars;
- evidence manifests;
- pattern registry.

Candidate queries:

```text
FR -> story -> test -> evidence
actor -> artifact -> gate
pattern -> golden neighbor
story -> context pack -> touched files
```

Admission trigger:

- JSON/files become too slow or hard to query in real runs;
- FR/evidence trace queries are a repeated bottleneck.

## Phase 7: Tool Pilots, Only For Measured Gaps

Candidate order:

1. `ast-grep` for deterministic structural rules.
2. `ccusage` or equivalent for token/cost baselines.
3. `MCP Inspector` for MCP/tool contract checks.
4. `SCIP` for symbol-level code navigation.
5. Serena or Codebase-Memory only if code navigation remains expensive.
6. Vector or graph only if lexical + JSON + SQLite cannot answer real queries.

Do not add a tool because it may help someday. Add it only after a concrete repeated failure appears in measured work.

## Immediate Implementation Order

1. Document context policy.
2. Add typed JSON schemas.
3. Add shared parser skeleton and tests.
4. Wire one low-risk validator check to JSON-first parsing.
5. Add evidence manifest writing to a real ACEF run.
6. Run a 30-task validation round.
7. Decide whether SQLite projection is justified.

## Non-Goals For The Current Cycle

- no vector database;
- no graph database;
- no event-sourced rewrite;
- no new orchestration framework;
- no default Context Mode dependency;
- no full SQLite migration before JSON ownership is proven.

