# ACEF Stabilization Roadmap

ACEF should now enter a validation-first phase. The goal is not to add more retrieval, graph, vector, or orchestration
infrastructure. The goal is to make the core delivery model cheaper, less brittle, and empirically measurable.

## v1 Closeout

Status: **ACEF v1**.

The first empirical validation round is complete. ACEF v1 is evidence-backed for quality/process control and guarded
delivery discipline. It is not evidence-backed as a token-cost reduction system.

The next optimization target is deliberately narrow:

- shorter worker prompts;
- narrower file and diff reads;
- less repeated ledger/artifact loading;
- better per-role Epic Context Packs.
- state-machine pushed context (`acef-next`) after the context retrieval/context-policy pilot;
- cockpit/context-compiler/tool-proxy design before any custom runtime.

The next delivery-quality target is also deliberately narrow:

- make PR review a first-class, bounded ACEF entry point;
- tighten the lightweight lane used for normal bug fixes and small changes;
- add short JIT review lenses only after they are measured against real defects and token cost;
- pilot a report-only `bug-hunter` lens before adding broader security, refactor, stack, or observability skill packs.

Do not add SQLite, vector, graph, SCIP, Serena, Codebase-Memory, or new retrieval infrastructure during this optimization
round. First improve the current prompt/context policy, then rerun the 30-run empirical validation matrix and compare
against the v1 baseline.

See `method/ACEF_COCKPIT.md` for the product direction: ACEF may use external UI/runtime tools as cockpit or execution
shells, but ACEF keeps gate, evidence, actor, scope, and state authority.

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

Status: **IMPLEMENTED** (2026-06-23). Schemas plus the `acef-state` operational writer cover active run, actors,
worker scope, evidence, gate verdicts, and approval receipts.

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

Status: **IMPLEMENTED** (2026-06-23). The process validator and Codex guard use the shared parser; the Claude/OpenCode
hard wall loads the repo-local parser when installed and fails closed with an equivalent contract otherwise.

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

Status: **COMPLETE for v1** (2026-06-23).

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

v1 result:

- quality/known-defect recall improved in ACEF lanes;
- median input-token usage increased versus baseline;
- no default retrieval or storage backend was admitted.

## Phase 6: Context Policy Tightening

Goal: reduce ACEF overhead without weakening evidence, actor separation, or guarded scope.

Allowed work:

- shorten role prompts;
- improve per-role Epic Context Packs;
- narrow target-file and diff reads;
- remove repeated ledger/planning-artifact ingestion from ordinary workers;
- keep detailed evidence in files, not chat.
- design and test a cockpit/context-compiler/tool-proxy layer that feeds existing CLIs bounded context.

Not allowed in this phase:

- SQLite;
- vector databases;
- graph databases;
- SCIP/Serena/Codebase-Memory default rollout;
- Context Mode or `acef-query` promotion to default worker context.
- custom AI runtime before the cockpit/proxy approach is measured.

Exit criteria:

- rerun the same 30-run empirical validation matrix;
- median input-token reduction improves against the v1 baseline;
- pass rate, defect recall, scope violations, and invalid-run count do not regress.

## Phase 6A: PR Review and Lightweight Lane Hardening

Goal: make ACEF useful for the high-frequency work that does not justify a full BMAD story lifecycle.

PR review deliverables:

- a bounded changed-files review entry point driven by the PR diff, relevant acceptance criteria, focused tests, and
  the matching pattern-registry slice;
- findings with verified `file:line`, severity, impact, confidence, and evidence;
- explicit separation between implementation defects, test gaps, conformance findings, security findings, and style;
- report-only review by default; any required code change moves to a separately scoped implementation or
  `verify-patch` actor;
- measured defect recall, false-positive rate, context/token cost, and extra-file-read count.

Lightweight lane deliverables:

- a compact lifecycle for small features and bug fixes: preflight/hot slice, reuse-before-create, implementation,
  independent review, focused verification, and closeout evidence;
- no full-ledger or full-planning-artifact reads for ordinary workers;
- clear promotion rules when scope, risk, source conflict, or repeated review findings exceed the lightweight contract;
- repo-local markers and typed worker scope enforced consistently across Claude Code, Codex, and OpenCode adapters;
- benchmark coverage for both standard and guarded lightweight work.

First lens pilot:

- `bug-hunter` is an unprefixed, reusable, report-only workhorse;
- it accepts a bounded diff, path set, or explicit scan budget rather than performing an unlimited repository scan;
- every finding requires verified `file:line`, impact, confidence, and evidence;
- it does not patch code, approve a gate, replace the Code Reviewer, or absorb security scanning;
- a Code Reviewer may receive it as a short JIT lens, but findings still follow ACEF disposition and actor-separation
  rules.

Status: the 10-case fixture pilot passed as a controlled signal. `bug-hunter` is now recommended as a JIT lens for
bounded PR/lightweight review, but remains outside the minimal default install. The next decision gate is real
PR/lightweight usage, not synthetic fixture performance.

Exit criteria:

- at least 10 representative PR/lightweight runs across standard and guarded work;
- blocker/high defect recall does not regress against the v1 benchmark;
- false positives and token/context cost are reported, not inferred;
- no reviewer-authored patch and no scope violation;
- the lightweight lane stays materially cheaper than full BMAD for eligible work.

## Phase 6B: State-Machine Pushed Context

Goal: reduce drift and token load by making agents ask ACEF for the next small instruction instead of selecting skills or
rereading large docs themselves.

This follows the context retrieval/context-policy pilot. It does not admit a new retrieval backend, runtime, database, or
UI. It projects existing typed state, ledger pointer, current context, worker scope, evidence, gates, and approvals into
one bounded instruction packet.

Deliverables:

- document the `acef-next` state-machine pushed-context design in `method/STATE_MACHINE_CONTEXT.md`;
- define the `acef.next.v1` JSON output shape;
- specify that retrieval/current-context is context only, never evidence;
- specify that next-epic and human-gated transitions require typed approval receipts;
- specify future tests for stale current-context, story-continuation escape, fake approval, role-specific bounded output,
  and missing worker scope.

Exit criteria before implementation:

- the design preserves ledger, Process Judge, evidence, gate, and actor-separation authority;
- the proposed output is small enough to use across Claude, Codex, and OpenCode;
- no custom runtime or dependency is required.

## Phase 7: SQLite Projection, Only If Justified

Goal: query structured ACEF state faster without changing source of truth.

SQLite is not canonical. It is a projection from Markdown reports, JSON sidecars, evidence manifests, and pattern
registry entries. It is admitted only if a future measurement shows JSON/files are too slow or hard to query in real
runs, or FR/evidence trace queries become a repeated bottleneck after Phase 6.

## Phase 8: Tool Pilots, Only For Measured Gaps

Candidate order:

1. `ast-grep` for deterministic structural rules.
2. `ccusage` or equivalent for token/cost baselines.
3. `MCP Inspector` for MCP/tool contract checks.
4. `SCIP` for symbol-level code navigation.
5. Serena or Codebase-Memory only if code navigation remains expensive.
6. Vector or graph only if lexical + JSON + SQLite cannot answer real queries.

Do not add a tool because it may help someday. Add it only after a concrete repeated failure appears in measured work.

## Immediate Implementation Order

1. Document context policy. **Done.**
2. Add typed JSON schemas. **Done.**
3. Add shared parser skeleton and tests. **Done.**
4. Wire one low-risk validator check to JSON-first parsing. **Done.**
5. Add evidence manifest writing to a real ACEF run. **Done.**
6. Run a 30-task validation round. **Done.**
7. Tighten prompt/context policy and rerun the 30-task validation matrix.
8. Design state-machine pushed context (`acef-next`) as the next bounded-context optimization.
9. Decide whether SQLite projection is justified only after the rerun.

## Non-Goals For The Current Cycle

- no vector database;
- no graph database;
- no event-sourced rewrite;
- no new orchestration framework;
- no default Context Mode dependency;
- no full SQLite migration before JSON ownership is proven.
