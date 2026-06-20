# ACEF Operating Model — Personas + Tracks (Layer 1)

The base operating model for running multi-agent delivery work. It is a **process guide**, not a rules document, and
it is **stack-agnostic** — the specific branch names, model tiers, and example surfaces are filled in per repo by the
project adapter, not hard-coded here.

> Provenance: this is a role-and-track operating model proven across multiple real production projects. The lightweight
> delivery lane (Layer 5) and the BMAD v2 lane (Layer 3) both build on it.

## Goals
- Keep communication deterministic and auditable.
- Prevent agent chat-drift and scope creep.
- Make every decision traceable to a task + PR.

## Single source of truth
For an initiative, the single source of truth is the task artifact + the PR. Agents do **not** communicate via
side-chats — they write updates into (1) the task artifact and (2) the PR description and review comments. If a fact
matters for review, merge, or future maintenance, it lives in the artifact or PR, never only in chat.

## Branching and PR targets
Cut task branches from the repo's **integration branch** (an adapter value — varies per repo), never from the
protected/release branch. Open PRs against the integration branch unless the Architect/Judge says otherwise. The PR is
the review surface; the Developer never self-merges.

## Personas

| Persona | Role |
|---|---|
| **Planner** | Writes the task spec, sets acceptance criteria + test plan, assigns the track. No production code. |
| **Test Author** | Guarded track only. Writes/​names the failing tests from the acceptance criteria, independently, before/alongside the Developer. |
| **Developer** | Implements exactly one task, runs tests/gates, writes a Developer Report. |
| **Judge** | Fresh review (never self-approval). Returns exactly one of `MERGE` / `REVISE` / `REPLAN`. |
| **Process Judge** | Verifies the required process was actually followed. It checks route/lane/track, required skill paths, phase order, artifacts, and evidence before any story or task is marked `done`. It does not review implementation quality. |
| **Epic Process Judge** | Runs only at epic close. It verifies the full epic gate chain before product-done/status close. |
| **Documentation Maintainer** | Runs only on doc drift; updates docs to match behavior, never expands scope. |
| **Human Architect** | Owns the plan, approves scope changes, gates, and done-state. |

## Tracks

The Planner assigns one **track** per task. The track sets which personas participate and which model tier runs
(tier names — fast / balanced / frontier — map to concrete models via the adapter; cost decision, never a gate shortcut).

| | Mechanical | Standard | Guarded |
|---|---|---|---|
| **Model tier** | fast | balanced | frontier |
| **Planner** | spec + track | same | same |
| **Test Author** | skip | skip | required (independent tests) |
| **Developer** | implements + validates | implements + own tests | implements + runs Test Author's tests |
| **Judge** | skip (auto-merge if validation passes) | reviews | reviews (stricter) |
| **Doc Maintainer** | if needed | if needed | if needed |

**When to use each:**
- **Mechanical** — no design decision; spec says exactly what to create (skeletons, boilerplate, doc updates, scripts).
- **Standard** — clear boundaries but requires reading code and local decisions (feature work, bug fixes, wiring).
- **Guarded** — security-sensitive, cross-module, or architectural; wrong decisions are expensive (auth, tenant
  isolation, payment, data/migrations, module-boundary contracts). When unsure, pick the higher track.

**Track flows:** Mechanical = Planner → Developer → done · Standard = Planner → Developer → Judge · Guarded =
Planner → Test Author + Developer (parallel) → Judge (full pipeline).

## Process gates

### Feature Delivery Ledger

Preflight is only the first gate. For any multi-step feature, the conductor must also maintain a durable delivery
ledger (default: `docs/ai/ACEF_<feature>_DELIVERY_AUDIT.md`, or the project's equivalent) from the first route decision
until final done-state.

The ledger is the supervisor/auditor surface. It records every phase transition, not just the initial classification:

- current route, lane, track, and story/task;
- next allowed phase and the exact skill/tool that must run;
- resolved path/command for that skill/tool before invocation;
- input artifacts consumed by the skill;
- output artifacts produced by the skill;
- tests/checks run and their full pass/fail status;
- Process Judge or Epic Process Judge verdicts;
- drift findings and the framework/skill/documentation patch applied to prevent repeat drift;
- rerun evidence after a drift fix.

If a phase is skipped, reordered, substituted, or renamed, the ledger must show explicit human approval. Otherwise the
supervisor must halt the run, patch the ACEF instruction that allowed ambiguity, and rerun from the failed gate.

Every artifact claim must be reconciled against disk before the step can pass. If a state file, frontmatter field, or
ledger entry says an output was generated, the conductor must verify the exact path exists or explicitly mark it as not
produced yet. Missing claimed artifacts are a `HALT` until the state file is corrected or the missing outputs are
generated through a properly started ledger step.

Every source claim must also be reconciled before the step can pass. For import/reconcile steps, each named input
document that owns required scope must be parsed and reconciled, or explicitly marked `not used` with a reason. Do not
let one source stand in for another when they own different dimensions: functional specs may own business rules,
UX/design docs may own screen and flow inventory, backend/code may own contracts, and adapters may own repo patterns.
If sources disagree, the artifact records a superset or discrepancy table and the gate remains open until the conflict
is resolved or intentionally deferred.

The ledger is opened before the work step starts, not reconstructed after the fact. Once preflight passes, the conductor
must start the relevant Step Ledger Entry before reading that step's workflow/template files, invoking its skill/tool,
spawning a worker, or generating an artifact. Outputs, verdict, and next step are filled after the step completes.
Retroactive entries are allowed only to document drift recovery; they do not make the skipped gate valid.

### Step Ledger Entry

Every conductor step must use this shape:

```md
Step:
Expected route/lane/track:
Required skill/tool:
Resolved skill/tool path:
Inputs:
Outputs:
Evidence command/source:
Verdict: PASS | FAIL | HALT
Next allowed step:
```

No step may advance on prose alone. A statement like "I followed BMAD" or "tests are missing" is invalid unless the
entry names the actual skill/tool path and the source evidence behind the claim.

### Bounded Gate Reports

Gate work is intentionally narrow. A gate answers one question: can the next phase start?

After the gate fact is proven, the conductor must:

1. update the gate artifact;
2. record the verdict and next allowed action;
3. return control before loading deeper workflow steps.

Do not turn a preflight or capability check into unbounded method exploration. If deeper planning is now allowed, it
starts as the next phase with its own ledger entry.

### No Gate Artifact, No Progress

ACEF advances by artifacts, not narrative. Before moving from routing/preflight into planning, implementation, test
generation, release, or `done`, the conductor must create or update a durable preflight artifact (default:
`docs/ai/ACEF_PREFLIGHT.md`, or the project's equivalent) with:

- requested work and source inputs;
- selected route, lane, and track;
- required skills/tools for that route/lane/track;
- resolved path or command for every required skill/tool;
- adapter/codemap freshness evidence;
- test setup evidence (`wired`, `installed-but-not-wired`, or `missing`);
- API/backend/source-of-truth evidence when contracts are involved;
- risk gates and required human approvals;
- verdict: `PASS`, `FAIL: <missing evidence/gate>`, or `HALT: <human decision needed>`.

If the verdict is not `PASS`, the conductor stops. It may ask for missing installation, wiring, evidence, or a human
decision, but it may not silently continue on a weaker lane.

The preflight artifact is not a replacement for the delivery ledger. Preflight decides whether the first lane can start;
the delivery ledger proves that the feature keeps following the lane until completion.

### Seeded Epic Gates

For full BMAD work, epic gates must exist on the board before implementation starts. When the epics/stories phase
creates the story backlog, it must also create one `Epic N Process Judge [PENDING]` ledger row or artifact for every
epic. The row sits immediately after that epic's final story and has its own required skill/tool, evidence source,
verdict, and next allowed step.

The last story-level Process Judge in an epic must point to `Epic N Process Judge`. It must not point to the first story
of the next epic. The next epic's first story may not be created, started, or dispatched until the prior epic gate is
`PASS`.

Autonomy grants and human-pause grants are separate from process gates. If a human says "continue without me", the
conductor may skip waiting for a human checkpoint, but it may not skip `Epic N Process Judge`.

### Subagent Claims Are Not Evidence

Subagents can collect leads, but their output is a claim until the conductor verifies the source path, command, or
artifact that supports it. Any fact that affects a gate (BMAD availability, test setup, backend contract, adapter
freshness, security/payment/entitlement risk, done-state) must be verified by source evidence before it is recorded as
READY.

The implementation Judge and the Process Judge are separate roles. The Judge reviews the change; the Process Judge
reviews the workflow claim. A workflow claim is invalid unless the required skill exists, was invoked, and left evidence
on disk.

In full BMAD, the conductor is also separate from the story workers. It coordinates step order only. It must not act as
the ATDD author, implementing actor, code reviewer, verifier, test reviewer, or Process Judge. A code-review claim is
invalid if the reviewer is the same worker identity that authored the code. Guarded payment/auth/entitlement/data
stories cannot use self-review.

BMAD story evidence must include persona identity for every required worker phase. Valid persona identities are:
PM/Planner, UX Designer, Architect, Test Author/Tester, Developer, Code Reviewer/Judge, Verify-Patch Reviewer, Test
Reviewer, Process Judge, and Documentation Maintainer. A generic or conductor identity does not satisfy a worker phase.

**Story/task Process Judge questions:**
1. What route, lane, and track was selected, and where is that recorded?
2. Which skills were required for that route/lane/track, and what are their resolved paths?
3. If BMAD was claimed, did the real BMAD skill/conductor run, or was this only a hand-rolled imitation?
4. Were required phases executed in order?
5. Were ATDD, dev-story, code-review, verify-patch, test-review, and Process Judge performed by separate valid worker
   identities where required?
6. Does each worker identity map to an allowed persona, not to conductor/dispatcher/general-purpose?
7. Is the code reviewer independent from the worker that authored the code?
8. Do readiness, ATDD/test, review, verify-patch, test-review, and product-done artifacts exist when the lane requires them?
9. Do required artifacts include the real workflow evidence/manifest, not only files shaped like the expected output?
10. If a required gate is missing, did the work return to the right phase instead of being marked done?
11. Does the delivery ledger contain a step entry for every transition since preflight?
12. If a drift fix was applied, was the failed gate rerun from the start after the fix?

**Story/task verdict:** `PASS`, `FAIL: <missing gate/evidence>`, or `HALT: <human decision needed>`.

**Epic Process Judge questions:**
1. Was the `Epic N Process Judge [PENDING]` gate row/artifact seeded during epics/stories generation, before
   implementation started?
2. Did the final story-level Process Judge in the epic set `Next allowed step: Epic N Process Judge`?
3. Did the next epic wait until this epic gate reached `PASS` before any next-epic story was created, started, or
   dispatched?
4. Did the epic start with the required test-design / risk-weighted coverage plan?
5. Did every story pass story-level Process Judge before epic close?
6. Did drift audit, trace, epic test-review, E2E/user-flow evidence, manual QA ledger, product-done audit, retrospective,
   and final status close run when required?
7. Are all Critical/High persona flows executed, explicitly deferred with owner/rationale, or marked blocked/failing?
8. Is any `done` status based on chat or prose instead of durable artifact + PR evidence?
9. Does the feature delivery ledger reconcile the full epic path: preflight → planning → stories → tests → review →
   product-done → close?

**Epic verdict:** `PASS` means the epic may close; `FAIL` returns to the missing gate; `HALT` asks the human.

## Status flow

`planned → in-progress → reviewing → done`, with `reviewing → in-progress` (REVISE) and `reviewing → planned` (REPLAN).
Mechanical tasks may go `in-progress → done` on passing validation (no Judge). Standard/guarded require a Judge decision.

## Required task blocks (short, factual, copy-paste)

- **Task Header** (Planner): Track · Status · Owner · Scope (in/out) · Expected files · Acceptance criteria · Test plan · Non-goals · Risks.
- **Test Author Report** (guarded): test files · failure modes targeted · boundary cases.
- **Developer Report**: what changed · files changed · exact test commands · pass/fail + full failing output (no paraphrase) · open questions (max 2, only if blocking).
- **Judge Decision**: `MERGE`/`REVISE`/`REPLAN` · 3–7 actionable reasons · follow-ups · a lessons entry (or "none") · on MERGE, close the task in the artifact.
- **Docs Drift Note** (when needed): docs updated · why · what was not changed.

Every PR includes: link to the task · scope + non-goals · test commands + results · rollback/kill-switch notes when applicable.

## Plan integrity (hard rule)
Agents must never skip, defer, reorder, add, remove, or mark tasks done without explicit human approval. If a task
looks already satisfied, present evidence and **ask** before closing it. No unilateral scope reduction ("not needed for
V1" is an architectural decision the human owns). A violation is reverted immediately and recorded as a lesson. The
plan represents the Architect's intent; an executor may lack the context for why a task exists.

## Circuit breaker
If the Judge issues `REPLAN` twice for the same scope, stop and escalate to the human for a decision/ADR. Do not keep
producing/rejecting tasks on twice-replanned scope.

## Continuous improvement
Two side loops: **Lessons** (the Judge records recurring mistakes after reviews) and **Process improvements** (the
Planner proposes workflow changes on friction). Both only **propose** + notify the human; neither self-implements.

## Conflict resolution
If guidance conflicts: repo rules win over guides/personas/prompts; initiative-specific guardrails win for that epic;
if still unclear, stop and request a human decision/ADR.
