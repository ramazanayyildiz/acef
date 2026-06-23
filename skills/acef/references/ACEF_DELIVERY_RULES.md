# ACEF Delivery Rules — Two Lanes + Promotion (Layer 5, the glue)

This is the **integration layer**: it doesn't add a new tool, it says **which layer runs for which work**, so the
operating model (Layer 1), the test/flow skills (Layer 2), the BMAD v2 lane (Layer 3), and the codemap/adapter
(Layer 4) work together as one system.

## Always first: ground (Layer 4)
Before any work, extract/refresh the **project adapter** (`acef-adapter` + `map-codebase`): stack, commands, tests,
CI, golden neighbors, pattern registry, risk surface, with a freshness stamp. No route runs on a stale adapter.
("Understand the repo first, then work" — the codemap idea.)

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

## Two lanes

| Lane | Use for | Engine |
|---|---|---|
| **Lightweight lane** | small / scoped / ongoing work | the operating model (Layer 1): track → personas → Judge, evidence in the artifact + PR, borrowing review discipline without a full story lifecycle |
| **Full BMAD v2** | epics, large features, core-behavior change, multi-module, or anything risky-and-large | the heavy story lifecycle (Layer 3) |

The lightweight lane *is* Layer 1 run for day-to-day work. Full BMAD v2 is the heavy lane for big/risky work. Most
ongoing work lives in the lightweight lane.

When using the Claude Code guard hook, lightweight runs should create `.acef-lightweight-lane` (or the neutral
`.acef-lane`) at the repo root while the run is active. Full BMAD runs use `.acef-bmad-lane` or BMAD runtime markers.
Without a lane marker, Claude Code hooks cannot know a repo is inside an ACEF run and will allow by default.

Full BMAD v2 has a hard capability preflight: the real BMAD workflow must be installed/wired and its required skills or
commands must resolve to paths before the lane starts. If BMAD is missing, ACEF stops and asks for installation/wiring or
a lane decision. A generic subagent running a BMAD-like checklist is not valid BMAD. **No automatic fallback is allowed:**
classification says what the work needs; capability preflight proves what can actually run. If Route B needs BMAD and
BMAD is unavailable, the verdict is `HALT` until the human explicitly chooses to install/wire BMAD or accepts a
non-BMAD guarded lightweight exception.

Before any lane executes, the conductor must write/update the preflight artifact described in `OPERATING_MODEL.md`.
No preflight artifact with `PASS` means no planning, implementation, test generation, release, or done-state change.
For multi-step features, the conductor must also create/update the feature delivery ledger described in
`OPERATING_MODEL.md`. Preflight proves the start; the ledger proves the run stayed on the rails.

Before any worker fan-out, source verification, deep workflow/template read, planning artifact, or implementation step,
the conductor must also complete the Active Run Bootstrap from `OPERATING_MODEL.md`: target repo/workspace resolved,
`docs/ai/` created, delivery ledger created, active ledger pointer set (`ACEF_ACTIVE_LEDGER` or
`docs/ai/ACEF_ACTIVE_LEDGER`), and `## Session Handoff` recorded. Source repos used for evidence do not own the target
run's gates.

## Route → lane

| Route | Lane | Track (lightweight) |
|---|---|---|
| Small feature | lightweight | standard (guarded if it touches risk) |
| Bug fix | lightweight | standard / mechanical |
| Large feature / epic | **full BMAD v2** | — |
| Test-case extraction · Test automation · Unit/integration | capability **inside a route**, not a lane | the test/flow skills (Layer 2) |

**Test/flow work (D/E/F) is a capability set invoked inside a route, not a separate lane.** A small feature needing
tests pulls the test skills in under the lightweight lane; an epic needing E2E pulls them in under BMAD v2.

## Promotion (lightweight → full BMAD v2)
A lightweight (usually guarded) task promotes to full BMAD when any of:
- it adds new product scope,
- more than one independent failure surface appears,
- canonical docs conflict,
- a migration/backfill has legacy-data risk,
- authz / tenant isolation / entitlement behavior is underspecified,
- review needs repeated rounds just to discover basic requirements.

`REPLAN` twice on the same scope → stop and escalate to the human.

## Discipline that travels with both lanes (borrowed IN)
- **Plan integrity** — no skip / reorder / shrink / expand scope without human approval.
- **2×REPLAN → escalate** — the circuit breaker.
- **Fresh Judge review** (no self-approval) and **verify-patch on REVISE**.
- **Review-patch hard stop** — if an independent reviewer returns `REVISE`, `BLOCK`, or `MERGE WITH REQUIRED PATCH`, the
  conductor records `docs/ai/ACEF_REVIEW_PATCH_REQUIRED.json` and stops. Only a separate `verify-patch` worker scoped in
  `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` may edit implementation files until the marker is cleared.
- **Reuse-before-create gate** — before implementation in either lane, the worker records the work shape, registry
  entry used, golden neighbor checked, existing symbols searched, what was reused, and why any new pattern is needed.
  This gate is short in the lightweight lane and story-scoped in full BMAD, but it is never skipped.
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
- **Lean reporting** — every lane writes complete evidence to disk but reports compactly in chat: artifact path,
  verdict, key evidence path/command, and next allowed step. Raw output dumps and full artifact bodies are drift
  risks because they consume context and hide the next gate.
- **Lean evidence contract** — story/epic close requires artifact paths for worker report, review report, Process Judge
  report, worker-context budget fields (`worker_context: bounded`, `fork_context: false`, `raw_output_policy:
  artifact-only`), and a refreshed Session Handoff. Epic close also records `fresh_session_recommended: yes`; continuing
  the same bloated thread is optional, not the default. Run `--check lean-evidence`.
- **Process Judge gates** — story/task close and epic close must prove the required steps, skills, and artifacts were
  actually used before status changes to `done`.
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
- **FR-Capability Trace Gate** — before an epic starts, every functional requirement assigned to that epic must map to
  at least one owning story whose deliverable is the user-visible capability, not merely a supporting artifact. Before
  epic close, each mapped FR needs: owning story done, a real-path capability test, and conductor/manual execution where
  browser/admin/runtime UX is involved. Artifact existence never satisfies an FR by itself. A "manual QA later" deferral
  may cover polish only after an automated check proves the entrypoint exists.
- **Full BMAD actor separation** — the conductor coordinates the story lifecycle; it is not the ATDD author,
  implementing actor, code reviewer, verifier, test reviewer, or Process Judge. The actor that authored code must never
  review, accept, or mark done that code. Guarded payment/auth/entitlement/data stories require independent review by
  default. If one worker collapses ATDD + dev-story + code-review, the story is process-tainted until restarted or
  backfilled by separate independent review and Process Judge approval.
- **Full BMAD persona mapping** — every BMAD worker must bind to an explicit persona identity: PM/Planner, UX Designer,
  Architect, Test Author/Tester, Developer, Code Reviewer/Judge, Verify-Patch Reviewer, Test Reviewer, Process Judge,
  or Documentation Maintainer. Generic workers are invalid unless their prompt and artifact record one of these
  identities. The conductor is not a persona worker.
- **Worker Scope Fence** — implementation workers must be bound to one active story/phase before they write code or
  commit. The conductor records the bound scope in `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` with `activeStory`,
  `phase`, `workerId`, `allowedPaths`, `maxCommits`, `canEditLedger:false`, and `canSpawnAgents:false`. The guard hook
  blocks worker writes outside `allowedPaths`, worker edits to `docs/ai/ACEF_*`, worker-spawned subagents, and commits
  that do not cite the active story. Planning personas may still write legitimate BMAD artifacts; do not solve worker
  drift by broadly blocking `_bmad-output/`.
- **Accelerated cadence is bounded** — independent stories/spikes may run in parallel only when dependencies and likely
  touched files do not overlap. Workers must emit complete final reports inline. Mechanical/low-risk work may use a
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
