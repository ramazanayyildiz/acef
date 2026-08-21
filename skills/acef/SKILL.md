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
- Never silently reduce a selected workflow's controls to save context. New `direct` runs are retired; use native
  admission, ACEF Fix, Standard, or Full instead of an improvised downgrade.
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
verification. Do not spawn a subagent. Run recognized tests/static analysis through
`.acef/bin/acef-native-test -- <focused-command>`: three distinct focused commands, two attempts each, 180 seconds per
command, and 10 active minutes. Stop when the requested patch is green. Broad verification is allowed once only as a
clean-tree `--closeout` after all related repairs, never during native implementation.
Use `--work-unit <stable-child-id>` only for independently admitted native children sharing a branch and HEAD.

Admit the work to ACEF when persistence/migration, security/privacy/permissions, money, provider integration, realtime,
concurrency/fencing, state-machine behavior, tracking/reporting/analytics, a new pattern, scope expansion, multiple
boundaries/surfaces, irreversible effects, or multi-session/worker coordination appears.

For admitted work, route two independent dimensions. Select ACEF Fix (`quick-fix`), ACEF Standard (`lightweight`), or
ACEF Full (`full-bmad`, BMAD v2) for execution depth. Then select Baseline or Guarded assurance from risk. Guarded is an
additive overlay, never a fourth workflow and never a reason to repeat BMAD phases. Write typed active-run v2 state with
`workflowId`, `assuranceProfile`, and `scopeUnit`; an active legacy `lane: guarded` must be explicitly migrated before
continuing.

New `quick-fix` runs use `quickFixContract: single-review-v1`: Developer, one independent Code Reviewer, and
deterministic closeout. The Developer owns focused RED→GREEN; a separate ATDD context is forbidden. New Standard runs
use the same `redOwnershipContract: integrated-developer-v1`. Do not schedule Process Judge, Patch Assurance, Verify-Patch,
Test Review, optional NFR, or repeated broad suites for this contract. Alert at 20 minutes; stop/replan at 30 minutes,
on a second root cause/review cycle, or after any framework failure.

Before active-run bootstrap, split independent defects and unrelated audit findings. A shared CI/release theme does not
make them one Full story. `REPLAN/SPLIT` invalidates the parent admission decision: send every child work item back to
ACEF admission independently. Native-eligible children stay outside ACEF and create no run artifacts; only admitted
children proceed to Fix, Standard, or Full. Full remains reserved for one coherent planning-heavy contract.
New typed intake records reversibility and technical/product topology; a reversible one-boundary/one-surface child
without an ACEF control trigger is mechanically rejected as `NATIVE_WORKFLOW` before state is written.

Bind every new admitted run to a stable parent objective using `--objective-id` and `--objective-scope`. The objective
owns cumulative budgets across renamed stories and recovery runs: consolidate at five runs, three replans, six review
cycles, or 30 active control minutes without a product/test commit; suspend before run eight or after five replans.
During consolidation, admit only typed defect-ledger work. Complete the manual-QA checklist before explicitly batching
same-key non-critical findings. Critical security, payments, migration, realtime, concurrency, and state-machine
findings cannot be batched, deferred, or quarantined and require Standard/Full + Guarded. Same-run remediation still
uses the existing maximum of two delta-review cycles; do not add reviewers or duplicate lifecycle phases.

Run `.acef/bin/acef-process-validator --repo <target> --check installation-freshness` before admitted work. If it
reports `INSTALL_STALE`, refresh the target and every linked worktree from the current ACEF source with
`scripts/update-acef-installation --repo <target> --all-worktrees`; do not repair copied runtime files manually.

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
- Full BMAD / planning-heavy, broad, new-contract, or ambiguous epic work: `references/ACEF_BMAD_V2_LANE.md` and
  `references/ACEF_RULE_ENFORCEMENT_MAP.md`. Risk without those planning triggers selects Guarded assurance on Fix or
  Standard instead of selecting Full.
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
2. Pass the installation-freshness check.
3. Choose/reuse the stable parent objective ID and scope; inspect its cumulative counters and defect ledger.
4. Create `docs/ai/` if missing.
5. Create or update the delivery ledger.
6. Set `docs/ai/ACEF_ACTIVE_LEDGER` or `ACEF_ACTIVE_LEDGER`.
7. Add/update `## Session Handoff` with `last_passed_gate`, `active_lane`, `active_track`, `next_allowed_step`, and `ledger_path`.
8. If the lane needs independent persona workers, record `## Delegation Authorization`: approved personas, one
   story/phase per worker, no worker-spawned subagents, no worker ledger edits, active worker scope required, final
   report then STOP.
9. For Full v3, reuse existing approved planning sources and run readiness as a deterministic, story-scoped delta gate.
   Do not spawn a fresh readiness worker or rescan the full PRD/NFR corpus unless a named conflict or ambiguity requires
   independent judgment.
10. Write active-run state with the parent objective binding, then start the first step row before invoking workers/tools.
    The installation-advertised runtime, every executable evidence/discovery command, bounded implementation paths,
    and test paths must be frozen before ATDD dispatch.

### In-flight runtime recovery

An installed dispatch contract is run-bound, not retroactive. If an older Full v3 story already has committed RED and
product commits but its control-plane bindings drifted, do not restart readiness or ATDD. Run
`acef-state recover-active-run` with those commits, the committed RED artifact, a reason, and one exact focused command
from the frozen scope. Imported RED stays non-canonical and the run enters `recovery-review`; dispatch exactly one
independent Recovery Judge and commit the exact recovered close package. `story-transition` then binds current
readiness rules to the next story.

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
- Full v3 is the only current flow with `independent-test-author-v1`. Dispatch Code Review and Patch Assurance in
  parallel when two slots are available; otherwise run them sequentially against the identical committed input tree
  without waiting for capacity or dropping a reviewer.
- Full-BMAD ATDD needs one genuine critical-path red plus a map of every criterion; regression-only criteria need not all
  be red before implementation. A `REVISE` gets one fresh report-only adjudication, then at most one findings-hash-bound,
  test-artifact-only correction. Before correction dispatch, persist and commit `docs/ai/corrections/<actor>.json` with the source
  and correction actor IDs, exact parent-result SHA-256, `scope: test-artifacts-only`, and explicit non-glob allowed
  paths. Never replay the ATDD lifecycle; a second incomplete result is `REPLAN/SPLIT`.
- Give each Full v3 ATDD worker one literal `acef-state evidence-run --kind runtime-test` command using the frozen
  focused argv. Run it once after the clean test-only commit; that command atomically creates the canonical ATDD actor
  record, so neither conductor nor child runs a separate actor command. Never invent evidence kinds, append path
  operands, reuse a failed evidence ID, pre-create the ATDD actor, or send `followup_task` to an ATDD identity.
- New supervised Full runs use `capsule-supervisor-v2`. Its actor/session and generated evidence IDs include the
  normalized `runId`; recovery keeps the story name unchanged and starts a new runId. Never create `r2`/`r3` story
  aliases to escape stale actor files. When `evidence-run` reports `REUSED`, consume the alias it wrote instead of
  executing the same command or rebuilding the same test environment.
- For framework tests in linked worktrees, freeze the installed `acef-worktree-test` wrapper as the evidence command.
  It isolates runtime names and rejects parent-checkout Composer/vendor leakage. Its typed setup exit 75 is recorded as
  infrastructure and permits at most two retries without consuming the canonical product evidence ID.
- Run formatters only through `acef-scoped-format --allow-path ... -- <formatter>` so a formatter cannot silently touch
  a sibling worker's files.
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
- A proven, bounded defect with no new contract may use ACEF Fix + Guarded even across multiple risky boundaries; do
  not ask for a non-BMAD exception. NFR assessment is conditional on a changed NFR contract. Run focused tests during
  work and one broad suite only at Full closeout or when a named shared-contract trigger makes it necessary.
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
