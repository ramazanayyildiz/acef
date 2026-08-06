# ACEF Delivery Rules — Lanes + Promotion (Layer 5, the glue)

This is the **integration layer**: it doesn't add a new tool, it says **which layer runs for which work**, so the
operating model (Layer 1), the test/flow skills (Layer 2), the BMAD v2 lane (Layer 3), and the codemap/adapter
(Layer 4) work together as one system.

## Ground proportionally (Layer 4)
Before any work, extract/refresh the **project adapter** (`acef-adapter` + `map-codebase`): stack, commands, tests,
CI, golden neighbors, pattern registry, risk surface, with a freshness stamp. No route runs on a stale adapter.
("Understand the repo first, then work" — the codemap idea.)

Contained reversible single-boundary/single-surface work is outside ACEF and uses targeted repo reads plus focused
verification. It does not create ACEF artifacts. The retired `direct` lane exists only to read, close, or promote
records created before retirement.

ACEF runs in lean mode by default: durable artifacts carry the evidence; chat carries only compact status. Do not paste
full artifacts, broad search output, long logs, or worker transcripts into chat unless the user asks for detail.

Adapter memory and run state are separate:

- **Codemap snapshot** records what the repo currently looks like.
- **Adapter living-knowledge** records durable repo facts: pattern registry, golden neighbors, do-not-copy,
  reuse probes, risk boundaries, and fitness checks. Each entry needs source evidence, confidence, freshness,
  maturity, and an update trigger.
- **Delivery ledger** records one run's working state: gate summaries, drift notes, handoffs, and next allowed step.

See `method/ADAPTER_MEMORY.md`. Do not store run-local drift/handoff state in the adapter, and do not treat uncited
adapter notes as conformance rules.

Method prose is not enforcement. Load-bearing rules must move into machinery, fresh sharded workers, or just-in-time
injection. Use `method/RULE_ENFORCEMENT_MAP.md` to track which ACEF rules still depend on agent memory.

Adapter/pattern-registry status controls what can proceed:

- `READY` — work may proceed within the adapter's covered scopes.
- `PARTIAL` — mechanical/standard work may proceed only for work shapes already covered in the pattern registry. New
  work shapes and guarded work require registry extraction or explicit human risk acceptance first.
- `MISSING` — no conformance gate may pass; run adapter/codemap first.

## Execution workflow and assurance

| Execution workflow | Stable ID | Use for |
|---|---|---|
| **ACEF Fix** | `quick-fix` | narrow reproduced defects with focused before/after evidence |
| **ACEF Standard** | `lightweight` | scoped ordinary feature/config/doc work with compact independent review |
| **ACEF Full (BMAD v2)** | `full-bmad` | planning-heavy stories, broad features/refactors, new patterns, or unclear scope |

Baseline assurance uses the workflow's base controls. Guarded assurance adds high-risk controls for persistence,
migration, auth/security/privacy/permissions, money, provider integrations, realtime, concurrency/fencing,
state-machine behavior, and destructive/irreversible effects. Guarded is additive and never reruns the lifecycle.

Native repository work is the default for contained reversible work. ACEF Standard handles scoped ordinary work,
ACEF Fix handles reproduced defects, and ACEF Full handles planning-heavy work. Guarded may be combined with any one of
them; a non-Full Guarded epic requires typed human approval.

The guard hook activates only from ACEF-owned markers or typed ACEF state. Stock `.bmad`, `_bmad`, and `_bmad-output`
directories do not activate ACEF.

Full BMAD v2 has a hard capability preflight: the real BMAD workflow must be installed/wired and its required skills or
commands must resolve to paths before the workflow starts. If BMAD is missing, ACEF stops and asks for installation/wiring or
a workflow decision. A generic subagent running a BMAD-like checklist is not valid BMAD. **No automatic fallback is allowed:**
classification says what the work needs; capability preflight proves what can actually run. If Route B needs BMAD and
BMAD is unavailable, the verdict is `HALT` until the human explicitly chooses to install/wire BMAD or accepts a
non-Full Guarded exception with typed human approval.

Before any admitted ACEF lane executes, the conductor must write/update the preflight artifact described in `OPERATING_MODEL.md`.
No preflight artifact with `PASS` means no planning, implementation, test generation, release, or done-state change.
For multi-step features, the conductor must also create/update the feature delivery ledger described in
`OPERATING_MODEL.md`. Preflight proves the start; the ledger proves the run stayed on the rails.

Before any admitted ACEF worker fan-out, source verification, deep workflow/template read, planning artifact, or implementation step,
the conductor must also complete the Active Run Bootstrap from `OPERATING_MODEL.md`: target repo/workspace resolved,
`docs/ai/` created, delivery ledger created, active ledger pointer set (`ACEF_ACTIVE_LEDGER` or
`docs/ai/ACEF_ACTIVE_LEDGER`), and `## Session Handoff` recorded. Source repos used for evidence do not own the target
run's gates.

## Route → execution and assurance

| Request shape | Execution | Assurance |
|---|---|---|
| Tiny contained change | native repository workflow outside ACEF when reversible, single-boundary, and single-surface | — |
| Small feature | ACEF Standard | Baseline or Guarded from risk |
| Bug fix | native when contained; otherwise ACEF Fix; ACEF Full if planning/scope expands | Baseline or Guarded from risk |
| Large feature / epic | ACEF Full (BMAD v2) by default | Baseline or Guarded from risk |
| Test-case extraction · automation | capability inside the selected workflow | inherits selected assurance |

**Test/flow work (D/E/F) is a capability set invoked inside a route, not a separate lane.** A small feature needing
tests pulls the test skills into ACEF Standard; an epic needing E2E pulls them into ACEF Full.

## Promotion

An existing direct compatibility task promotes immediately when it becomes irreversible, touches more than one inferred product surface, changes
paths outside its compact task record, weakens tests, or encounters persistence, migration, auth/security/privacy,
money, external-provider, realtime/concurrency/state-machine, tracking/reporting/analytics, or a new pattern. Use
`promote-lightweight` for contained low-risk growth, `promote-full-bmad` for planning-heavy coherent work, and
select Guarded assurance for high-risk boundaries. Direct has no human-risk-acceptance bypass.

ACEF Fix promotes to ACEF Full when the repro is unclear, scope expands, a new pattern appears, or after-patch evidence
does not cover the reproduced failure. High risk changes assurance to Guarded, not planning depth.

### Quick Fix single-review contract

New ACEF Fix runs record `quickFixContract: single-review-v1`. The critical path is Developer → one independent Code
Reviewer → deterministic closeout. ATDD may be a third context when a regression test must first be authored; otherwise
red evidence may be produced by the developer. Process Judge, Patch Assurance, Verify-Patch, Test Review, optional NFR,
and broad-suite repetition are not scheduled. Guarded strengthens boundary/evidence controls without adding actors.

The normal budget is three commits and the hard maximum is four; at most five product files, 50 changed product lines,
four evidence runs, and one review cycle. Alert at 20 minutes and stop/replan at 30 active minutes or after a framework
failure. Replan sooner for a second root cause, new contract/migration/dependency, widened authorization, unresolved HIGH
after one repair, a second review cycle, or a twice-flaky focused test. User-facing fixes need product-outcome evidence.

Quick-fix scope is an envelope, not a narrow file hallway. At dispatch, compute and record implementation paths, tests
that import/exercise those symbols or hit the route/runtime path, fixtures/snapshots, route or smoke files, and shared
resources such as seeds, migrations, settings groups, shared UI sections, or global fixtures. The human approves that
envelope once. Workers may edit inside it without another approval.

If a quick-fix worker edits tests, `docs/ai/ACEF_LIGHTWEIGHT_RUN.json` must record `quickFix.testIntegrity` and the
validator must pass: assertion count does not drop, no new skip/only/todo/xfail style pattern appears, matcher-loosening
is not flagged, and the touched test still names the implementation symbol, route, or behavior surface through
`implementationReference`.

Parallel quick-fix workers require disjoint file scopes and disjoint shared resources. Non-overlapping files are not
enough when workers touch the same seed, migration, settings group, fixture, shared component section, or other global
state.

A lightweight task promotes to full BMAD when any of:
- it adds new product scope,
- multiple independent failure surfaces reveal a new/unclear cross-cutting contract rather than a bounded defect,
- canonical docs conflict,
- a migration/backfill has legacy-data risk,
- authz / tenant isolation / entitlement behavior is underspecified,
- review needs repeated rounds just to discover basic requirements.

Risk alone never satisfies this promotion list. A reproduced, root-cause-proven, bounded defect may use ACEF Fix +
Guarded across multiple risky boundaries when it introduces no architecture, contract, or product-scope change. That
selection is not an exception and does not require permission to skip BMAD.

Multiple independent defects do not become Full merely because they share an audit, CI, or release theme. Readiness
must inventory root causes and return `REPLAN/SPLIT` before active-run bootstrap. Route each bounded defect separately;
create a Full unit only for a coherent planning-heavy contract that remains after the split.

NFR work and broad regression are conditional controls, not lifecycle defaults. Create or refresh an NFR assessment
only when the patch adds/changes a non-functional contract or an acceptance criterion names one. Use focused tests
during Fix/Standard and during Full stories. Run a broad suite once at Full/epic close, or once for Fix/Standard only
when a changed shared contract makes focused evidence insufficient; record the trigger and reuse the result across
reviewers unless a named evidence conflict requires adjudication.

Two consecutive typed non-`PASS` review verdicts or a third repair cycle on the same guarded/full-BMAD story → stop and
`REPLAN/SPLIT`. V3 additionally treats a new HIGH in consecutive rounds or growing patch scope as an earlier reviewer
signal, but its mechanical hard stop is the bounded repair counter. Legacy contracts retain their
code-review/test-review/Judge inputs. The breaker does not grep prose or require literal `REPLAN` wording.

## Discipline that travels with admitted ACEF lanes (borrowed IN)
- **Plan integrity** — no skip / reorder / shrink / expand scope without human approval.
- **2× typed non-PASS review → REPLAN/SPLIT** — the circuit breaker runs in guarded/full-BMAD closeout and
  pre-commit. A later `PASS` resets the consecutive count.
- **Fresh independent review** (no self-approval) and contract-specific bounded repair on `REVISE`.
- **Review-patch hard stop** — if an independent reviewer returns `REVISE`, `BLOCK`, or `MERGE WITH REQUIRED PATCH`, the
  conductor records `docs/ai/ACEF_REVIEW_PATCH_REQUIRED.json` and stops. Under `four-actor-v3`, only the original
  Developer may edit implementation/tests during a bounded repair while Patch Assurance remains report-only. Every
  repair makes Patch Assurance stale and therefore requires a fresh final-tree Patch Assurance report. Production
  repairs also require fresh Code Review; test-only repairs may preserve an earlier Code Review PASS. Existing
  `six-actor-v2` runs retain their separate `verify-patch` repair worker. The active worker scope must authorize the
  selected contract's repair actor before the marker is cleared.
- **Reuse-before-create gate** — before implementation in every admitted ACEF lane, the worker records the work shape, registry
  entry used, golden neighbor checked, existing symbols searched, what was reused, and why any new pattern is needed.
  This gate is short in ACEF Standard and story-scoped in ACEF Full, but it is never skipped.
- **Conformance feedback loop** — every conformance finding becomes a code patch, pattern-registry update,
  do-not-copy update, proposed mechanical check, or explicit human deferral. Findings do not disappear into chat.
- **Architecture conformance before stories** — after architecture and before epics/stories, run an independent
  conformance gate over adapter/codemap use, golden-neighbor claims, source discrepancies, counts/inventories,
  do-not-copy entries, and deliberate divergences. `REVISE` returns to architecture; stories cannot start while
  conformance findings are undispositioned.
- **Active run bootstrap** — before workers or source verifiers run, the target workspace has a delivery ledger, active
  ledger pointer, and structured session handoff. A stale ledger from another run cannot satisfy the current run.
- **Delegation authorization** — full BMAD and any lane that requires independent workers records one run-level
  delegation approval for ACEF-required persona workers. This avoids repeated permission prompts while preserving the
  boundary: no generic delegation, no worker-spawned subagents, no worker ledger edits, one story/phase per worker, and
  active worker scope before implementation writes.
- **Conductor step ledger** — every transition records expected route/lane/track, required skill/tool, resolved
  path/command, inputs, outputs, evidence, verdict, and next allowed step. No ledger entry means no advancement.
  The entry starts before the conductor reads that step's workflow/template files or invokes the skill/tool; outputs and
  verdict are filled afterward. Writing it only after exploration has already begun is drift, not compliance.
- **Bounded gate reports** — capability gates are not open-ended exploration. Once the gate fact is proven, the
  conductor writes the artifact, states the next allowed action, and returns control before loading deeper workflow
  steps.
- **Lean reporting** — every admitted ACEF lane writes complete evidence to disk but reports compactly in chat. Existing
  direct compatibility runs report only their compact task record, focused verification, and handoff. ACEF chat output remains: artifact path,
  verdict, key evidence path/command, and next allowed step. Raw output dumps and full artifact bodies are drift
  risks because they consume context and hide the next gate.
- **Lean evidence contract** — story/epic close requires artifact paths for worker report, review report, and the
  workflow's decision report (Quick Fix reuses its single reviewer report; other actor-decided gates use Process Judge),
  plus worker-context budget fields (`worker_context: bounded`, `fork_context: false`, `raw_output_policy:
  artifact-only`), output-budget fields (`diff_policy: targeted`, `test_output_policy: summary-only`,
  `search_output_policy: summarized`), and a refreshed Session Handoff. Epic close also records
  `fresh_session_recommended: yes`; continuing the same bloated thread is optional, not the default. Run
  `--check lean-evidence`.
- **Epic context pack** — before the first story worker in a full-BMAD epic, write a compact context pack with resolved
  patterns, golden neighbors, source reconciliation summary, shared risks, test strategy, fixtures, scope boundaries,
  exact commands, pitfalls, and per-story touched surfaces. Story workers consume the pack plus narrow story inputs; broad
  repo re-reading is blocked unless the story introduces a new/guarded/risky surface. Run `--check epic-context-pack`.
- **Decision gates** — story/task close and epic close must prove required steps, skills, and artifacts before `done`.
  `single-review-v1` Quick Fix uses its independent reviewer gate plus deterministic closeout; Full epic close uses
  Epic Process Judge, and compatibility contracts retain their specified Process Judge behavior.
- **Seeded epic gates** — full BMAD epics/stories generation must seed `Epic N Process Judge [PENDING]` rows/artifacts
  before implementation starts. The final story in an epic points to that epic gate, and Epic N+1 cannot start until
  Epic N Process Judge is `PASS`.
- **Explicit epic transition approval** — Epic N+1 cannot start merely because the user said "go on", "continue",
  "devam", or "tamamla". After Epic N Process Judge `PASS`, the ledger must record `## Epic Transition Approval` with
  `status: APPROVED`, `target_epic: Epic N+1`, and the exact `user_quote` naming that epic with an approval/start verb.
  Run `.acef/bin/acef-process-validator --check epic-transition-approval --target-epic N+1` before creating or dispatching
  the first story in the next epic.
- **Human-pause is not process-gate** — a human may permit autonomous continuation, but that only waives waiting for
  the human. It never waives required Process Judge or Epic Process Judge gates.
- **Artifact claim reconciliation** — before a step can pass, every claimed output path in a state file, frontmatter,
  or ledger entry must be verified on disk. Missing claimed outputs halt the run until corrected or generated under a
  valid ledger step.
- **Source reconciliation** — before an import/reconcile step can pass, every named source that owns required scope must
  be parsed and reconciled. Functional spec, UX/design, backend contract, adapter, and codebase evidence are separate
  sources of truth; do not collapse them into one. Source differences must become a superset/discrepancy table, not a
  silent omission. Full BMAD records `## Source Reconciliation` and runs `--check source-reconciliation`.
- **External Framework Grounding Gate** — before ATDD for a story that relies on third-party framework APIs, prove the
  installed framework's real API with a small spike/probe and one reference implementation. ATDD must assert that proven
  API, not guessed methods or internal properties. Fake descriptors, vendor facade/class overrides, monkey patches, and
  test-only framework shims are `REPLAN` triggers unless the human explicitly accepts them as architecture.
- **Real Runtime Smoke Gate** — for user-visible or runtime-wired behavior, story/epic close must include at least one
  real entrypoint check: HTTP route, CLI command, queue dispatch, scheduler, CMS/admin runtime, or template render path
  as production uses it. Status-only checks are insufficient; assert meaningful rendered content or a negative guard
  against known broken output. If manual/conductor app review finds the issue first, write the failing runtime-smoke
  test before fixing.
- **State-changing evidence quality** — if the feature creates, captures, records, saves, tracks, or mutates CRM,
  finance, note, payment, history, or other product state, closeout evidence must include a durable write/read proof.
  Schema files, model declarations, fixture-store command tests, in-memory singleton stores, demo data, and route 200
  smoke do not prove persistence.
- **FR-Capability Trace Gate** — before an epic starts, every functional requirement assigned to that epic must map to
  at least one owning story whose deliverable is the user-visible capability, not merely a supporting artifact. Before
  epic close, each mapped FR needs: owning story done, a real-path capability test, and conductor/manual execution where
  browser/admin/runtime UX is involved. Artifact existence never satisfies an FR by itself. A "manual QA later" deferral
  may cover polish only after an automated check proves the entrypoint exists.
- **Goal-story reconciliation** — story PASS and goal complete are different states. Foundation/backend stories may pass
  their own AC, but a user-facing goal cannot be marked complete until `activeGoal` and `goalCoverage` prove the owning
  persona can reach and use the visible product surface. Run `--check goal-coverage`; backend/query seams do not satisfy
  workspace, staff flow, CRM, finance, capture, manage, or tracking goals unless the human explicitly scoped the goal as
  backend-only.
- **Full BMAD actor separation** — the conductor coordinates the story lifecycle; it is not a lifecycle actor. New
  `four-actor-v3` stories require distinct ATDD, Developer, Code Reviewer, and Patch Assurance identities plus a
  distinct Story Process Judge only when triggered. Existing `six-actor-v2` stories retain their frozen verifier,
  test-review, and Story Process Judge identities. The actor that authored code must never review, accept, or mark done
  that code. Guarded payment/auth/entitlement/data stories require independent review by default. If one worker
  collapses ATDD + development + review, the story is process-tainted until restarted or independently recovered.
- **Full BMAD persona mapping** — every dispatched BMAD worker must bind to an explicit persona identity from the
  selected versioned contract: PM/Planner, UX Designer, Architect, Test Author/Tester, Developer, Code Reviewer/Judge,
  Patch Assurance Reviewer, legacy Verify-Patch Reviewer, legacy Test Reviewer, conditional Process Judge, Product
  Outcome Verifier, or Documentation Maintainer. Generic workers are invalid unless their prompt and artifact record
  one of these identities. The conductor is not a persona worker.
- **Worker Scope Fence** — implementation workers must be bound to one active story/phase before they write code or
  commit. The conductor records the bound scope in `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` with `activeStory`,
  `phase`, `workerId`, `allowedPaths`, `maxCommits`, `canEditLedger:false`, and `canSpawnAgents:false`. The guard hook
  blocks worker writes outside `allowedPaths`, worker edits to `docs/ai/ACEF_*`, worker-spawned subagents, and commits
  that do not cite the active story. Planning personas may still write legitimate BMAD artifacts; do not solve worker
  drift by broadly blocking `_bmad-output/`.
- **Typed run state** — new ACEF runs write machine state with `.acef/bin/acef-state`: actor identity under
  `docs/ai/actors/`, the active worker boundary in `ACEF_ACTIVE_WORKER_SCOPE.json`, hashed command evidence under
  `docs/ai/evidence/`, Process Judge verdicts under `docs/ai/gates/`, and exact human approvals under
  `docs/ai/approvals/`. Validators prefer these JSON records; the ledger remains the human chronology. A `PASS` gate
  without successful, hash-verified evidence is invalid.
- **Accelerated cadence is bounded** — independent stories/spikes may run in parallel only when dependencies, likely
  touched files, and shared resources do not overlap. Workers must emit complete final reports inline. Mechanical/low-risk work may use a
  combined independent review-and-judge worker only when the author is separate and the ledger records the waiver.
  Guarded/security/routing/storage/KVKK/data-migration/source-conflict work keeps separate reviewer and Process Judge.
- **Done = user-visible** — for user-facing work, prove the owning persona can reach and use the surface, not just a green unit test.
- **Drift = stop condition** — if specs, artifact, and code disagree, resolve the source-of-truth conflict before merging.
- **Guarded test floor** — for guarded-track work a verification checklist is a **supplement, not a substitute**: require at least one symbol-grounded test on the auth / payment / entitlement / data boundary (bootstrap the framework with approval if the repo has none). A zero-test repo does not license shipping guarded work untested; the human-approval gate confirms a test was written, not just a checklist.
  Record the exact boundary symbol and `path#symbol` evidence under `## Guarded Test Floor`; run
  `--check guarded-test-floor` before close.

## Explicitly OUT (reference-only)
- **Heavy phase-gated PM governance** (full charter / WBS / RTM / RAID / phase-gate document suites) — for large
  programs; not a default for ongoing work. Borrow a single pattern (plan-integrity) if useful, not the whole layer.
- **Pre-SDLC** (idea capture / discovery / council) — a separate front, outside this execution model.

## Per-stack values
All concrete commands, test frameworks, branch names, model tiers, and "done" checks are **adapter values** filled in
per repo (Layer 4) — they are not part of this method. The method (lanes, tracks, personas, gates, promotion) is the
same on any stack.
