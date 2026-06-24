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
- Keep chat/context small while preserving full disk evidence.

## Single source of truth
For an initiative, the single source of truth is the task artifact + the PR. Agents do **not** communicate via
side-chats — they write updates into (1) the task artifact and (2) the PR description and review comments. If a fact
matters for review, merge, or future maintenance, it lives in the artifact or PR, never only in chat.

## Lean Runtime Default

ACEF is lean by default. Lean mode never removes gates or evidence; it only limits what is pasted into chat.

- Write artifacts, gate reports, worker reports, and audits to disk.
- In chat, return only the artifact path, verdict, key evidence command/path, next allowed step, and any decision needed.
- Do not paste full PRDs, story specs, ledgers, broad search output, or long test logs into chat unless the user asks.
- Prefer targeted reads/searches. If a command would return more than roughly 100 lines, narrow it or write a derived
  summary artifact instead.
- Worker final reports should be complete on disk, but chat summaries should stay under about 20 lines.
- If details are needed for audit, link the file path and exact command rather than copying the body.

## Worker Context Budget

Persona workers should start with a bounded prompt, not the parent thread. This keeps cost predictable and prevents old
context from quietly overriding the active ledger.

- Default worker context is `fork_context: false` or the closest equivalent the tool supports.
- Do not pass the parent transcript or full ledger to ordinary workers. Pass only: repo path, role-scoped current-context
  path, story/spec path, allowed paths, required commands/tests, report artifact path, and the explicit STOP rule.
- One worker owns one phase of one story. It writes one report artifact, returns a compact summary, then stops.
- Long command output and full logs go into the report artifact, not chat.
- Worker execution inputs are recorded with `acef-worker-execution-v1`: maximum runtime, maximum tool calls, optional
  token/cost budget, write mode, stop condition, and whether each limit is `declared`, `observed`, or
  `mechanically_enforced`. Do not claim mechanical enforcement where the client only supports prompt-level or
  after-the-fact observation.
- Worker results use `acef-worker-result-v1`: status, normalized failure kind, short summary, detailed artifact path and
  SHA-256, optional transcript path and SHA-256, usage metrics, answer key, and verdict. Transcripts stay outside Git;
  the repo stores only their path/hash reference.
- Model overrides are optional and secondary. Use cheaper/faster models for mechanical planning, cleanup, ledger
  formatting, and simple ATDD; use the parent/stronger model for development, review, Process Judge, and guarded or
  security-sensitive work.
- If a tool cannot enforce `fork_context: false`, the worker prompt must still state that prior chat is not evidence and
  all decisions must be grounded in the supplied ledger/spec paths.

## Current Context Hot Slice

The append-only delivery ledger remains the source of truth, but it is not the default worker input. Before each worker
phase, derive `docs/ai/ACEF_CURRENT_CONTEXT.md` from the active ledger, Epic Context Pack, exact story artifact, and the
last phase report. Keep it at 150 lines or fewer and replace it at each phase transition.

The hot slice must contain current work, gate state, allowed scope, relevant acceptance criteria, required commands,
deferred/out-of-scope work, known pitfalls, artifact paths, and role-specific inputs. It records `source_ledger`,
`active_story`, `active_phase`, and `last_passed_gate`; the validator reconciles those values to the active ledger.

| Role | Default input |
|---|---|
| Planner / story author | Epic Context Pack + exact backlog/story seam |
| ATDD | context pack slice + acceptance criteria + target test paths |
| Developer | ATDD artifact + failing summary + target app/test paths |
| Code Reviewer | targeted diff summary + touched files + acceptance-criteria matrix + generated PR review profile |
| Verify-Patch | required review actions + affected paths/tests only |
| Test Reviewer | changed tests + test strategy + concise command evidence |
| Story Process Judge | story artifacts + compact ledger slice + command evidence |
| Epic Process Judge | full ledger + epic artifacts + integration/runtime evidence |

Record the contract in the ledger:

```md
## Current Context Contract
status: PASS
context_path: docs/ai/ACEF_CURRENT_CONTEXT.md
active_story: story 4.1
active_phase: development
worker_role: developer
full_ledger_access: denied
max_lines: 150
```

Ordinary workers use `full_ledger_access: denied`; Story Process Judge uses `story-slice`; only Epic Process Judge uses
`allowed`. Run `.acef/bin/acef-process-validator --check current-context` before dispatch.

## Lean Output Budget

The largest token spikes usually come from raw diffs, broad searches, full ledgers, and framework test failures that dump
rendered HTML. ACEF treats those as evidence artifacts, not chat content.

- Diffs are targeted by path or commit range; full `git diff` output belongs in a report artifact.
- Searches are narrowed by path/pattern; broad `rg` dumps are summarized into a report artifact.
- Test output is summarized in chat as command + pass/fail + failing test names. Full logs, rendered HTML, stack traces,
  and response bodies stay in a report artifact.
- Worker reports contain enough detail for audit, but final chat reports stay compact.
- Multiple worker results can be rolled up by answer key without loading long output into chat. `acef-worker-result
  rollup` reads result JSON files, keeps detailed artifacts by path/hash, and emits consensus, conflicts, open questions,
  and the recommended next action.
- If a failure needs a large HTML/JSON/body dump, store it under `docs/ai/reports/` or another explicit artifact path and
  cite that path.

## Epic Context Pack

Full-BMAD epics amortize shared context at the epic boundary. Before the first story worker in an epic, create an
`Epic Context Pack` artifact and record it in the delivery ledger. Story workers consume the pack plus their exact story
artifact/diff/test files; they do not re-read the whole repo unless the story touches a new, guarded, or risky surface.

The pack contains:

- resolved patterns;
- golden neighbors;
- source reconciliation summary;
- shared risk list;
- test strategy;
- reusable fixtures/helpers;
- allowed and deferred scope;
- exact commands;
- known pitfalls;
- per-story touched surfaces.

The delivery ledger records:

```md
## Epic Context Pack
status: PASS
scope: Epic 4
pack_path: docs/ai/epic-4-context-pack.md
consumed_by_story: story 4.1
worker_input_mode: pack-plus-story
broad_repo_reread: no
```

Run `.acef/bin/acef-process-validator --check epic-context-pack` before dispatching the first story worker in an epic.

## Lean Evidence Contract

Story and epic close evidence must be artifact-backed so a fresh session can resume without inheriting a bloated parent
thread. Before a story or epic can close, the delivery ledger records `## Lean Evidence Contract`:

```md
status: PASS
scope: story 4.1
worker_report: docs/ai/reports/story-4.1-worker.md
review_report: docs/ai/reports/story-4.1-review.md
process_judge_report: docs/ai/reports/story-4.1-process-judge.md
session_handoff_updated: yes
worker_context: bounded
fork_context: false
raw_output_policy: artifact-only
diff_policy: targeted
test_output_policy: summary-only
search_output_policy: summarized
fresh_session_recommended: yes  # required for epic close
```

The report paths must exist on disk. The conductor chat summary stays compact; the reports contain the complete logs,
files changed, test evidence, findings, and deferrals. Run `.acef/bin/acef-process-validator --check lean-evidence`
before story/epic close.

## Story-close evidence minimums

Every story close must include two canonical ledger facts, even when the full evidence lives in separate judge reports:

1. **ATDD red-before-dev evidence.** If a story uses ATDD, the ledger or story Process Judge row records the test-only
   commit/artifact, the expected-fail command, the observed failing count or failure summary, and the development commit
   that followed it. A passing final suite is not enough; the run must prove the test was red before implementation.
2. **Actor identity summary.** The canonical ledger row records the actor identity for each phase that ran: Planner,
   ATDD/Test Author, Developer, Code Reviewer, Verify-Patch, Test Reviewer, and Process Judge as applicable. It may link
   to detailed reports, but the ledger row must be enough to see that the author did not approve its own work.

Lean chains may omit optional review phases only when explicitly authorized for low-risk work. They still require
red-before-dev evidence when ATDD is used and a distinct Process Judge identity in the canonical ledger. Guarded work
cannot use the lean chain.

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

Every implementation track uses the reuse-before-create gate. The gate can be tiny for mechanical/lightweight work, but
it must exist before new helpers, components, services, hooks, APIs, or patterns are written.

## Process gates

### Active Run Bootstrap

Before any worker fan-out, source verification, deep workflow/template read, planning artifact, or implementation step,
the conductor must create a resumable active run in the target repo/workspace.

Required bootstrap order:

1. Resolve the target repo/workspace where run artifacts live. For greenfield work, create or select the target home
   before target-scoped gates; source repos are read-only evidence and do not own the run state.
2. Create `docs/ai/` if missing.
3. Create the feature delivery ledger (`docs/ai/ACEF_<feature>_DELIVERY_AUDIT.md` or the project equivalent).
4. Set the active pointer by writing that relative ledger path to `docs/ai/ACEF_ACTIVE_LEDGER` or by setting
   `ACEF_ACTIVE_LEDGER`.
5. Add a complete `## Session Handoff` block to the ledger with at least:
   `last_passed_gate`, `active_lane`, `active_track`, `next_allowed_step`, and `ledger_path`.
6. For any lane that requires independent worker/persona phases, record `## Delegation Authorization` before the first
   dispatch. It must say whether delegation is approved, the allowed personas, and the limits: one story/phase per
   worker, no worker-spawned subagents, no worker edits to `docs/ai/ACEF_*`, active worker scope required before
   implementation writes, and final report then STOP.
7. Start the first Step Ledger Entry before invoking a worker, reading deeper method files/templates, or launching
   source verifiers.

If a run invokes workers before this bootstrap exists, the correct response is not to reconstruct the ledger afterward.
Record a drift finding, patch the ambiguous instruction if needed, and restart from the bootstrap. A stale ledger from a
different run must never satisfy the current run.

### Feature Delivery Ledger

Preflight is only the first gate. For any multi-step feature, the conductor must also maintain a durable delivery
ledger (default: `docs/ai/ACEF_<feature>_DELIVERY_AUDIT.md`, or the project's equivalent) from the first route decision
until final done-state.

The ledger is the supervisor/auditor surface. It records every phase transition, not just the initial classification:

- current route, lane, track, and story/task;
- delegation authorization for ACEF-required persona workers when the lane needs independent workers;
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

If an independent reviewer returns `REVISE`, `BLOCK`, or `MERGE WITH REQUIRED PATCH`, the conductor stops after
summarizing the findings. It must not patch the files itself. The conductor writes
`docs/ai/ACEF_REVIEW_PATCH_REQUIRED.json` with `activeStory`, `reviewVerdict`, and `status: REQUIRED`, then dispatches a
separate `verify-patch` worker with `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json`. The marker is removed or marked `CLEARED`
only after the verify-patch worker reports and the patch is independently verified. This is a hard role boundary, not a
style preference.

Workers must return a complete final report in their final message: artifact paths, commits, files changed, test
commands/results, findings, deferrals, and blockers. If a worker goes idle without this report, the conductor treats it
as an incomplete step and records the gap before requesting the missing report.

For chat, the conductor summarizes that final report compactly. The full report belongs in the ledger, PR, or worker
artifact; the conversation should not become the artifact store.

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

Before any certification, Process Judge, Epic Process Judge, or external verifier handoff, run
`.acef/bin/acef-process-validator --check clean-tree`. A verifier must not certify one commit while uncommitted follow-on
work is layered on top.

### Seeded Epic Gates

For full BMAD work, epic gates must exist on the board before implementation starts. When the epics/stories phase
creates the story backlog, it must also create one `Epic N Process Judge [PENDING]` ledger row or artifact for every
epic. The row sits immediately after that epic's final story and has its own required skill/tool, evidence source,
verdict, and next allowed step.

The last story-level Process Judge in an epic must point to `Epic N Process Judge`. It must not point to the first story
of the next epic. The next epic's first story may not be created, started, or dispatched until the prior epic gate is
`PASS`.

Autonomy grants and human-pause grants are separate from process gates. If a human says "continue without me", the
conductor may skip waiting for a human checkpoint, but it may not skip `Epic N Process Judge`. A next-epic transition is
a separate scope approval: the ledger must record `Epic Transition Approval`, `status: APPROVED`, `target_epic`, and the
exact `user_quote` naming the target epic. Generic continuation phrases such as "go on", "continue", "devam", and
"tamamla" never authorize Epic N+1.

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

When the full BMAD lane is authorized, delegation to those ACEF-required persona workers should be approved once at run
start and recorded in the ledger. The approval is not a blank check: it covers only the required persona phases in the
current ACEF run. Each worker remains bound by the Worker Scope Fence, cannot spawn another worker, cannot edit the
ledger/run-control files, and must report then stop.

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
9. If review required a patch or returned `REVISE`/`BLOCK`, did the conductor stop and use a separate verify-patch worker
   rather than editing the files itself?
10. If the story claims a user-visible, runtime-wired, admin/editor, API, CLI, queue, scheduler, or framework-integrated
   capability, did evidence exercise the real entrypoint/capability instead of only supporting artifacts or isolated helpers?
11. Do required artifacts include the real workflow evidence/manifest, not only files shaped like the expected output?
12. If a required gate is missing, did the work return to the right phase instead of being marked done?
13. Does the delivery ledger contain a step entry for every transition since preflight?
14. If a drift fix was applied, was the failed gate rerun from the start after the fix?

**Story/task verdict:** `PASS`, `FAIL: <missing gate/evidence>`, or `HALT: <human decision needed>`.

### Vertical-Slice Completeness Gate

Before a user-visible or runtime-wired story/epic can close, its ledger must contain `## Vertical Slice Trace` with:

| Capability | Actor | Surface | Entrypoint | Entrypoint Evidence | Application Path | Runtime Evidence | Status |
|---|---|---|---|---|---|---|---|
| promised user action | real actor | UI/admin/HTTP/API/CLI/queue/scheduler/CMS | production entrypoint | `source/path#probe` | surface -> application layers | `test/path#probe` | PASS |

A controller, service, repository, model, form, seeder, helper, or class is supporting structure, not a surface. If the
trace ends at one of those artifacts, the capability is incomplete. When repo docs/skills/stubs do not exist, derive the
slice from the requirement itself: who performs what action, where they enter, which layers execute, and which real-path
test proves it. Both evidence cells use `path#probe`; the validator requires the production source to contain the
entrypoint probe and the test to contain the runtime probe plus an executable assertion. Run
`.acef/bin/acef-process-validator --check vertical-slice` before story/epic close.

For guarded work, add `## Guarded Test Floor` with `boundary`, `boundary_symbol`, `test_evidence`,
`test_author_actor`, and `status: PASS`. The evidence uses `test/path#boundary_symbol`; the file must contain that exact
boundary symbol and an assertion. Run `--check guarded-test-floor`.

For full BMAD, add `## Actor Separation` as a `Phase | Actor | Evidence` table. ATDD, Development, Code Review,
Verify Patch, Test Review, and Process Judge actors must be distinct, non-conductor identities. Evidence uses
`path#actor`, and the file must contain that actor identity. Run `--check actor-separation`.

For full BMAD planning/import work, add `## Source Reconciliation` as a
`Source | Path | Decision | Discrepancy | Resolution` table. Decisions are `USED`, `NOT USED`, or `CONFLICT`; source
paths must exist, and conflicts/non-use require a closed resolution. Run `--check source-reconciliation`.

**Epic Process Judge questions:**
1. Was the `Epic N Process Judge [PENDING]` gate row/artifact seeded during epics/stories generation, before
   implementation started?
2. Did the final story-level Process Judge in the epic set `Next allowed step: Epic N Process Judge`?
3. Did the next epic wait until this epic gate reached `PASS` before any next-epic story was created, started, or
   dispatched?
4. Did the epic start with the required test-design / risk-weighted coverage plan?
5. Did every story pass story-level Process Judge before epic close?
6. Did drift audit, FR-capability trace, real-runtime smoke, epic test-review, E2E/user-flow evidence, manual QA ledger,
   product-done audit, retrospective, and final status close run when required?
7. Does every FR assigned to the epic map to at least one owning story marked done, plus a real-path capability test or
   manual check that exercises the promised user-visible capability?
8. For runtime-wired, admin/editor, API, CLI, queue, scheduler, or framework-integrated capabilities, did a real entrypoint
   smoke execute the production path with positive content assertions and relevant negative leak/shortcut assertions?
9. Are all Critical/High persona flows executed, explicitly deferred with owner/rationale, or marked blocked/failing, and
   are deferrals limited to polish or explicit blockers rather than whether the capability exists at all?
10. Is any `done` status based on chat or prose instead of durable artifact + PR evidence?
11. Does the feature delivery ledger reconcile the full epic path: preflight → planning → stories → tests → review →
   product-done → close?

**Epic verdict:** `PASS` means the epic may close; `FAIL` returns to the missing gate; `HALT` asks the human.

## Status flow

`planned → in-progress → reviewing → done`, with `reviewing → in-progress` (REVISE) and `reviewing → planned` (REPLAN).
Mechanical tasks may go `in-progress → done` on passing validation (no Judge). Standard/guarded require a Judge decision.

## Required task blocks (short, factual, copy-paste)

- **Task Header** (Planner): Track · Status · Owner · Scope (in/out) · Expected files · Acceptance criteria · Test plan · Non-goals · Risks.
- **Reuse-before-create** (Developer before code): Work shape · registry status/entry · golden neighbor checked ·
  existing symbols/components/helpers searched · reused item or reason for new pattern · do-not-copy checked.
- **Test Author Report** (guarded): test files · failure modes targeted · boundary cases.
- **Developer Report**: what changed · files changed · exact test commands · pass/fail + full failing output (no paraphrase) · open questions (max 2, only if blocking).
- **Judge Decision**: `MERGE`/`REVISE`/`REPLAN` · 3–7 actionable reasons · conformance lens result · follow-ups ·
  a lessons/registry update entry (or "none") · on MERGE, close the task in the artifact.
- **Docs Drift Note** (when needed): docs updated · why · what was not changed.

## Source comment policy

Developer prompts must keep ACEF/BMAD evidence out of source code. Source comments are for durable technical invariants,
not delivery history.

Allowed in source comments:
- non-obvious runtime constraints;
- race conditions or ordering constraints;
- external API quirks;
- security, privacy, or data-integrity warnings;
- concise rationale that a maintainer needs while changing the code.

Not allowed in source comments:
- Story/Epic/AC/NFR/OD references;
- `Process Judge`, `Reviewer`, `ATDD`, `guarded`, `test seam`, or gate-pass evidence;
- implementation history or why the story was accepted;
- explanations meant for the delivery ledger, story artifact, review report, process judge report, codemap, or pattern
  registry.

Rule of thumb: if the comment explains why the code must behave this way, it may stay. If it explains why the delivery
process accepted the story, move it to an ACEF artifact. Reviewers reject or patch source diffs that leak process/evidence
language into code.

Conformance lens:

- Did the change use the right pattern-registry entry or explain why none applies?
- Did it check and reuse a qualified golden neighbor?
- Did it avoid do-not-copy entries and stale/legacy exemplars?
- Did it introduce a new helper/component/service/dependency/pattern without a decision?
- Did source comments avoid ACEF/BMAD process evidence and keep only durable technical invariants?
- For architecture/planning artifacts: did every codemap/adapter-derived claim cite current source evidence rather
  than memory or a worker summary?
- For architecture/planning artifacts: were source conflicts recorded as discrepancies, and were counts/inventories
  re-verified before they became scope?
- Did any finding become a code patch, registry update, do-not-copy update, proposed mechanical check, or explicit
  human deferral?

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
