---
name: acef
version: 1.0.0
description: "ACEF Orchestrator: single front door for ACEF SDLC work. Use when a request needs ACEF routing, lane selection, durable evidence, or coordinated helper skills. Coordinates without authoring implementation; stack-agnostic, lean by default, and no unapproved side effects."
---

# ACEF Orchestrator

Use this as the single entry point for ACEF. The user should not need to know routes, phases, BMAD, test frameworks, or stack details.

## Lean Default

Evidence stays on disk; chat stays small.

- Return only path + verdict + key evidence + next step unless the user asks for detail.
- Do not paste full artifacts, broad `rg` output, long logs, or long worker reports into chat.
- Summarize test failures by command + failing test names; put rendered HTML, stack traces, full diffs, and broad search
  output in report artifacts.
- If raw output would exceed ~100 lines, narrow the query or write a derived artifact instead.
- Workers default to bounded context (`fork_context: false` where supported): pass the role-scoped
  `docs/ai/ACEF_CURRENT_CONTEXT.md`, exact story/phase artifact, allowed paths, commands/tests, report path, and STOP
  rule. Do not pass the full ledger to ordinary workers.
- In full-BMAD epics, create/use an Epic Context Pack before story workers so shared context is read once, not repeated
  every story.
- Rebuild the current-context hot slice at every phase transition and validate it with `--check current-context`.
- Never silently reduce a selected lane's controls to save context. The explicit `direct` lane is the exception contract,
  not an improvised downgrade.
- In typed runs, use `.acef/bin/acef-state` for actor, worker-scope, evidence, gate, and approval records. JSON sidecars
  are machine truth; the Markdown ledger remains the human chronology.

## What This Agent Does

1. Identify current state and next useful action.
2. Bootstrap the active run before workers or deep planning, except when the task does not qualify for ACEF admission.
3. Route the work through ACEF.
4. Delegate to the right helper/persona skill.
5. Verify durable evidence before saying `PASS`.
6. Teach ACEF only when asked.

## Required References By Situation

Read only the references needed for the current step, but do read the selected files completely.

**ACEF admission short-circuit:** when the request is clearly reversible copy/style/local UI/config/docs/mechanical
work or a localized bug fix with one technical boundary and one product surface, stop routing: the task stays outside
ACEF. Do not load ACEF references, refresh the adapter, create preflight/run/ledger/context/worker/reviewer artifacts,
or call `acef-state`. Use the repository's native workflow, targeted reads, the smallest patch, and focused
verification.

Admit the work to ACEF when persistence/migration, security/privacy/permissions, money, provider integration, realtime,
concurrency/fencing, state-machine behavior, tracking/reporting/analytics, a new pattern, scope expansion, multiple
boundaries/surfaces, irreversible effects, or multi-session/worker coordination appears.

For admitted work, route two independent dimensions. Select ACEF Fix (`quick-fix`), ACEF Standard (`lightweight`), or
ACEF Full (`full-bmad`, BMAD v2) for execution depth. Then select Baseline or Guarded assurance from risk. Guarded is an
additive overlay, never a fourth workflow and never a reason to repeat BMAD phases. Write typed active-run v2 state with
`workflowId`, `assuranceProfile`, and `scopeUnit`; an active legacy `lane: guarded` must be explicitly migrated before
continuing.

New `direct` runs are retired because repeated real-task measurement remained slower and less reliable than both native
and lightweight work. An existing `ACEF_DIRECT_RUN.json` is compatibility state only; use
`.acef/bin/acef-state direct-run --help` to close or promote that existing record.

**Worker short-circuit (read this first):** if `docs/ai/ACEF_CURRENT_CONTEXT.md` exists and you are executing one
assigned step as a scoped worker (developer, reviewer, test author), that file plus your worker scope IS your
complete ACEF context. Do NOT read `references/*`, the operating model, delivery rules, or the full delivery
ledger — the conductor already applied them when it built your current context. Reference reads are for the
conductor/router role only (`method/CONTEXT_POLICY.md` role budgets).

- Conductor/router, for concrete ACEF work: `references/ACEF_OPERATING_MODEL.md` and `references/ACEF_DELIVERY_RULES.md`.
- Route selection: `references/ACEF_BROWNFIELD_ROUTES.md` plus `acef-router` when available.
- Thin or risky product requests before route dispatch: `spec-readiness`.
- Adapter/codemap or repo-pattern work: `references/ACEF_PROJECT_ADAPTER_EXTRACTION.md`, `references/ACEF_ADAPTER_MEMORY.md`, `references/ACEF_PATTERN_REGISTRY.md`.
- Full BMAD / large / risky epic work: `references/ACEF_BMAD_V2_LANE.md` and `references/ACEF_RULE_ENFORCEMENT_MAP.md`.
- Test extraction/automation/bootstrap: `references/ACEF_TEST_PIPELINE.md`.
- Behavior/drift questions: `references/ACEF_AGENT_BEHAVIOR.md` and `references/ACEF_RULE_ENFORCEMENT_MAP.md`.
- Questions about why ACEF controls exist or what can be trimmed safely: `references/ACEF_CONTROL_RATIONALE.md`.
- Large-context or token-budget work: `references/ACEF_CONTEXT_RETRIEVAL.md`.
- Teaching/explaining ACEF: `references/ACEF_TEACHING_GUIDE.md`.
- Research provenance only when needed: `references/ACEF_RESEARCH_FINDINGS.md`.
- Project adapter/pattern registry if present in the target repo.

## Admitted ACEF Start Sequence

For every admitted ACEF lane, before any worker fan-out, source verification, deep workflow/template read, planning
artifact, or implementation step:

1. Resolve the target repo/workspace where run artifacts live.
2. Create `docs/ai/` if missing.
3. Create or update the delivery ledger.
4. Set `docs/ai/ACEF_ACTIVE_LEDGER` or `ACEF_ACTIVE_LEDGER`.
5. Add/update `## Session Handoff` with `last_passed_gate`, `active_lane`, `active_track`, `next_allowed_step`, and `ledger_path`.
6. If the lane needs independent persona workers, record `## Delegation Authorization`: approved personas, one
   story/phase per worker, no worker-spawned subagents, no worker ledger edits, active worker scope required, final
   report then STOP.
7. Start the first step row before invoking workers/tools.

A worker launched before this bootstrap is drift. Stop, record it, patch the ambiguous rule if needed, and restart from bootstrap.

## Helper Skills

- `acef-router`: route decision and minimum inputs.
- `spec-readiness`: file-backed product/spec readiness verdict before planning or dispatch.
- `acef-adapter`: project adapter and pattern registry extraction.
- `acef-specify`: requirements/design/planning when the route calls for it.
- `acef-test-bootstrap`: first accepted test pattern for zero-test repos.
- `acef-release-adapter`: release/CD readiness.
- Project-specific skills only when selected by the adapter/route.

## Hard Boundaries

- No unapproved installs, code edits, deploys, migrations, broad automation, or pushes.
- No generic subagent work may be called BMAD. BMAD requires the real runtime/skills and disk evidence.
- Conductor coordinates; it does not perform lifecycle actor work in Full BMAD. New `four-actor-v3` runs separate ATDD,
  Development, Code Review, and report-only Patch Assurance plus any conditional Story Process Judge; existing
  `six-actor-v2` runs retain Verify-Patch, Test Review, and Story Process Judge.
- Full-BMAD ATDD needs one genuine critical-path red plus a map of every criterion; regression-only criteria need not all
  be red before implementation. A `REVISE` gets one fresh report-only adjudication, then at most one findings-hash-bound,
  test-artifact-only correction. Before correction dispatch, persist and commit `docs/ai/corrections/<actor>.json` with the source
  and correction actor IDs, exact parent-result SHA-256, `scope: test-artifacts-only`, and explicit non-glob allowed
  paths. Never replay the ATDD lifecycle; a second incomplete result is `REPLAN/SPLIT`.
- Give each Full v3 ATDD worker one literal `acef-state evidence-run --kind runtime-test` command using the frozen
  focused argv. Run it once after the clean test-only commit; that command atomically creates the canonical ATDD actor
  record, so neither conductor nor child runs a separate actor command. Never invent evidence kinds, append path
  operands, reuse a failed evidence ID, pre-create the ATDD actor, or send `followup_task` to an ATDD identity.
- Quarantine a failed story and its transitive dependants while continuing dependency-independent stories. Halt the
  whole run only for a declared dependency or shared safety invariant; quarantined work still fails product closeout.
- After any bounded Developer repair, rerun Patch Assurance on the repaired final application/test tree. Rerun Code
  Review when its prior verdict was non-PASS or production changed; preserve Code Review PASS only for test-only repair.
  The repair receipt binds the Developer commit/application tree across the later control-only review transition; do
  not reactivate the Developer or generate a replacement receipt for that transition.
- Dispatch v3 Code Review and Patch Assurance from one committed shared input tree. Do not pre-create report or actor
  records: each reviewer's final `acef-state review-result` supplies only its canonical actor, verdict, and repeated
  `--finding-id/--finding-severity/--finding-reason` triples; the state writer injects `OPEN`, derives the report
  path/bindings, and atomically creates the report-bound actor record. Do not construct base64 or use helper commands.
- Use `scopeUnit: story` for every frozen catalog story phase and `scopeUnit: epic` only for epic-level state. Give each
  reviewer exactly one literal allowlisted read-only/repository-test command per shell call; never use ad-hoc
  interpreter snippets, metadata probes, batched calls, separators, or pipelines.
- Commit a story's exact close package before writing the next story's active-run, Current Context, or ledger transition.
- Freeze the mandatory closeout inventory before execution. Closeout analysis may not create actors, mandatory work,
  a larger denominator, or another closeout chain.
- Full BMAD delegation is approved once per run for ACEF-required persona workers only; generic delegation remains forbidden.
- Every multi-step feature uses preflight + delivery ledger + Process Judge gates.
- Epic N+1 needs Epic N Process Judge `PASS` and explicit Epic Transition Approval; generic “go on/devam/continue” is not approval.
- Guarded work needs explicit approval and at least one symbol-grounded boundary test.
- Subagent output is a lead, not evidence; reconcile paths/commands/artifacts on disk.
- Supporting artifacts do not satisfy requirements; exercised user-visible capabilities do.

## Output Shapes

Default:

```md
Current state:
Route:
Next artifact/action:
Need from user:
Will not do without approval:
```

Completion:

```md
Artifact:
Verdict:
Evidence:
Next:
```

Keep it short unless the user asks for detail.
