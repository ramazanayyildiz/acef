# ACEF BMAD v2 Lane — the heavy lane (Layer 3)

The heavy delivery lane for **epics / large features / core-behavior / risky-and-large** work. It runs the full
story lifecycle with hard gates. Small/ongoing work does **not** use this lane — it uses the lightweight lane
(Layer 5 → Layer 1) and promotes here only when it grows (see `DELIVERY_RULES.md`).

## Dependency
This lane is driven by **BMAD-METHOD** (https://github.com/bmad-code-org/BMAD-METHOD, MIT) — an installable agent
framework. ACEF does not bundle it; install it where you want the heavy lane. ACEF orchestrates it and normalizes its
output; the discipline below is the operating contract around it. (The lane has been run in production on Laravel and
on TypeScript/Next stacks; the per-stack test/build commands are adapter values.)

## Hard preflight: real BMAD or stop

Before Route B / full BMAD v2 starts, the conductor must prove that the real BMAD workflow exists in the current repo
or agent environment. "BMAD-style", "BMAD-like", or generic subagents following a hand-written imitation are not BMAD.

Minimum required capability evidence:
- a BMAD conductor or equivalent story lifecycle driver;
- readiness, PRD/story/architecture, ATDD/test-architecture, dev-story, code-review, verify-patch, test-review, trace,
  E2E/manual-QA, and retrospective skills or commands as required by the selected flow;
- resolved paths for each required skill/command;
- an artifact location where each phase leaves durable evidence.
- proof that the conductor is adapted to the current repo's project adapter (stack, commands, test tools, artifact
  paths, branch/PR rules). A conductor copied from another project/stack without adaptation does not satisfy preflight.

If any required BMAD capability is missing or the conductor resolves only to an unadapted copy from another project,
return:

```text
HALT: BMAD-METHOD is not installed or not wired for this repo. Install/wire the real BMAD workflow, or choose a
different lane. Do not continue with a hand-rolled substitute.
```

This `HALT` is not a fallback. The conductor may not switch to lightweight guarded work on its own. A non-BMAD
lightweight exception requires explicit human approval and must be recorded as risk acceptance in the preflight
artifact.

## Planning artifact gates

Full BMAD planning is not complete when PRD/UX/Architecture artifacts merely exist. Before epics/stories generation,
the conductor must run an **Architecture Conformance Gate** under an independent Architect / Process Judge persona.

The gate checks that the architecture:
- uses adapter/codemap facts as evidence, not unverified memory or worker claims;
- qualifies every golden-neighbor claim at file plus symbol/contract level;
- reconciles PRD, UX/design, backend/API, adapter/codemap, and source-code evidence into an explicit discrepancy table
  when they conflict;
- proves counts and inventories that drive scope (modules, screens, blocks, routes, collections, endpoints);
- flags any deliberate divergence from a golden neighbor as a decision, not as copied precedent;
- checks do-not-copy entries and stale/legacy exemplars before recommending reuse;
- converts every conformance finding into a ledgered disposition before epics/stories start.

Valid dispositions are: `revise`, `accepted risk`, `spike`, `story acceptance criteria`, `pattern-registry update`,
`do-not-copy update`, or `proposed mechanical check`. Findings do not remain only in chat. A gate verdict of `REVISE`
returns to the architecture worker; epics/stories may not start until the gate is `PASS` or the human records explicit
risk acceptance for the unresolved items.

## Story lifecycle (per story)
1. **Readiness** — the story is implementable: acceptance criteria clear, canonical references linked, domain contract
   complete, dependency order known. A soft story is sent back before any build.
2. **Reuse-before-create** — before implementation, record work shape, pattern-registry status/entry, golden neighbor
   checked, existing symbols/components/helpers searched, what was reused, and why any new pattern is needed.
   `PARTIAL` registries permit only covered mechanical/standard work shapes; guarded stories and new work shapes must
   refresh the registry or record explicit human risk acceptance first.
3. **(NFR)** — extract non-functional constraints first on state-machine / concurrency / money / security-critical work.
4. **External framework grounding when needed** — if ATDD depends on third-party framework APIs, prove the installed
   version's real API with a spike/reference implementation before writing failing tests. Wrong framework assumptions
   produce hollow greens; the correct result is `REPLAN`.
5. **ATDD** — failing tests land **before** implementation, as their own commit. Every test fails on HEAD first.
6. **Dev-story** — implement until the ATDD tests go green. Developer prompts must keep ACEF/BMAD evidence out of
   source comments: Story/Epic/AC/NFR/OD labels, gate-pass proof, reviewer/judge language, and implementation history
   belong in the ledger or story artifact. Source comments may only carry durable technical invariants a maintainer
   needs at the code site.
7. **Code-review** — multi-layer adversarial review (e.g. correctness + conformance + blind-spot + edge-case + acceptance-auditor
   lenses). Reviewer returns `MERGE` / `REVISE` / `REPLAN` (findings classed Patch / Decision / Defer / Dismiss).
   Every conformance finding becomes a code patch, pattern-registry update, do-not-copy update, proposed mechanical
   check, or explicit human deferral. Reviewer must reject or patch process/evidence comments that leak into source
   code.
8. **Verify-patch** — after every REVISE, fresh-context verifiers re-read each patch's acceptance criteria + domain
   contract + the actual diff, and check the patch claim **and** adjacent invariants it could affect. The conductor does
   not apply review patches. A `REVISE`, `BLOCK`, or `MERGE WITH REQUIRED PATCH` verdict creates
   `docs/ai/ACEF_REVIEW_PATCH_REQUIRED.json`; only a separately scoped `verify-patch` worker may edit implementation
   until the marker is cleared.
9. **Loop** code-review → verify-patch until **zero blocker + zero high** findings remain (read the findings, don't
   stop on a verdict string or a round count).
10. **Test-review** — score test quality (target ≥ 80/100): brittleness, duplication, false-positive risk, fixture hygiene.
11. **Story closeout Process Judge** — before product-done/test-review close, verify the real steps ran in order and the
   artifacts are genuine skill outputs. Any missing BLOCKER/HIGH process evidence returns the story to the required phase.
   If this is the last story in its epic, the next allowed step must be `Epic N Process Judge`, not the next epic's
   first story.
12. **Product-done audit + manual QA** — see below.
13. **Mark done** only through the evidence gate.

## Actor separation (mandatory)

The conductor is a lifecycle coordinator, not an implementing or reviewing actor. It may sequence story workers, but it
must not collapse ATDD, dev-story, code-review, verify-patch, test-review, or Process Judge into one self-reviewing
worker context.

Workers run with bounded context by default. Use `fork_context: false` or the tool's closest equivalent; pass only the
repo path, role-scoped current-context hot slice, story/spec path, allowed paths, required tests, report artifact path,
and final STOP rule.
Do not pass the parent transcript as evidence. Long outputs belong in the worker report artifact, not chat.

At each epic boundary, create an Epic Context Pack before the first story worker. The pack carries the shared
architecture/context, source reconciliation summary, golden-neighbor scan, risk list, test strategy, reusable
fixtures/helpers, exact commands, known pitfalls, and per-story touched surfaces. Per-story workers receive this pack plus
their narrow story artifact/diff/test files; author/reviewer/judge separation still happens story-by-story.

Before each story phase, derive and validate `docs/ai/ACEF_CURRENT_CONTEXT.md`. Ordinary workers do not receive the full
delivery ledger: ATDD gets ACs and target tests; development gets ATDD evidence and target paths; review gets the targeted
diff and AC matrix; verify-patch gets required actions; Story Process Judge gets a compact story ledger slice. Only Epic
Process Judge may read the full ledger. The hot slice is disposable and must reconcile to the append-only ledger through
`acef-process-validator --check current-context`.

Full BMAD requires delegation. During capability preflight or active-run bootstrap, record:

```md
## Delegation Authorization
- status: APPROVED
- scope: ACEF-required persona workers only
- allowed_personas: PM/Planner, UX Designer, Architect, Test Author/Tester, Developer, Code Reviewer/Judge,
  Verify-Patch Reviewer, Test Reviewer, Process Judge, Documentation Maintainer
- limits: one story/phase per worker; no worker-spawned subagents; no worker edits to docs/ai/ACEF_*; active worker
  scope required before implementation writes; final report then STOP
```

If this section is missing, the conductor should ask once at the lane start instead of asking again at every review or
judge phase. Generic delegation remains forbidden.

Worker identities must map to explicit personas:

| BMAD phase | Required persona identity |
|---|---|
| PRD / story intent | PM / Planner |
| UX gate | UX Designer |
| Architecture | Architect |
| Architecture conformance gate | Architect or Process Judge, independent of the architecture author |
| Epics/stories | PM / Planner, with Architect consistency check when needed |
| Readiness | Architect or Process Judge, depending on the gate |
| ATDD / test-design | Test Author / Tester |
| Dev-story | Developer |
| Code-review | Code Reviewer / Judge |
| Verify-patch | Verify-Patch Reviewer |
| Test-review | Test Reviewer |
| Product-done / workflow close | Process Judge |
| Docs drift | Documentation Maintainer |

Generic subagents are invalid for BMAD phases unless their prompt binds them to one persona and the artifact records
that identity. The conductor is not a persona worker.

Rules:
- ATDD, dev-story, code-review, verify-patch, test-review, and Process Judge must run under separate worker identities
  when the lane requires those phases.
- The actor that authored code must never review, accept, or mark done that code.
- Code review must be independent of the implementing actor, even for low-risk stories unless the human explicitly
  waives the split and a Process Judge backfills the risk.
- Guarded payment/auth/entitlement/data stories require independent review by default; no self-review waiver.
- If the conductor starts implementing or self-reviewing, halt and restart the affected story from the last clean
  gate with separate workers.
- Story ledgers must record `ATDD actor`, `Developer actor`, `Code review actor`, `Verify-patch actor`,
  `Test-review actor`, and `Process Judge actor` where those phases apply.
- Before close, represent those identities in `## Actor Separation` with `path#actor` provenance and run
  `.acef/bin/acef-process-validator --check actor-separation`.

## Accelerated cadence (safe speed mode)

ACEF may run faster without dropping the evidence chain, but only inside explicit dependency boundaries.

Safe parallelization:
- Independent stories/spikes inside the same epic may run concurrently only after their dependency graph is explicit,
  shared contracts are stabilized, and likely touched files are non-overlapping.
- Parallel workers each need their own ledger entry, persona identity, expected files, acceptance criteria, and final
  report. The conductor still verifies each worker's artifact on disk before marking anything `PASS`.
- Stories that touch the same module, shared contract, route table, migration, settings, auth, storage, payment,
  entitlement, or security boundary do not run in parallel unless the human explicitly accepts the merge/integration
  risk.
- All parallel branches converge at the same story/epic Process Judge gates. Epic N+1 still waits for Epic N Process
  Judge `PASS`.

Worker reporting:
- Every worker must emit its complete final report as its final message: artifact paths, commits, files changed, test
  commands/results, findings, deferrals, and open blockers. The conductor should not need a second "send report" prompt.
- A worker that goes idle without a final report is incomplete; the conductor records it as a process gap before asking
  for the missing report.

Worker scope fence:
- Before dispatching an implementation worker, write `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` for exactly one
  story/phase. Include `activeStory`, `phase`, `workerId`, `allowedPaths`, `maxCommits`, `canEditLedger:false`, and
  `canSpawnAgents:false`.
- `allowedPaths` must be narrow enough that the worker cannot drift into the next story. Use explicit files or tight
  globs; broad module roots are only valid when the story owns the entire module slice.
- Workers do not edit `docs/ai/ACEF_*`, do not spawn subagents, do not continue to the next story, and make at most the
  scoped commit(s). The conductor or a ledger-worker owns ledger updates.
- Parallel implementation stories require separate worktrees or non-overlapping scope manifests. Same worktree plus
  overlapping `allowedPaths` is a process halt, not speed mode.

Risk-based review tier:
- Guarded/security/auth/payment/entitlement/storage/KVKK/data-migration/routing/source-conflict stories keep separate
  reviewer and Process Judge identities, and should use the strongest available judgment model.
- Mechanical or low-risk stories may use a combined independent review-and-judge worker only if that worker is not the
  author, no guarded boundary is touched, and the ledger records the waiver.
- The author never approves or marks done its own output. Speed mode changes scheduling and model choice, not the
  author-reviewer separation rule.

## Dev-done vs product-done
- **Dev-done:** ATDD/feature tests green, acceptance criteria implemented, review reached its stop condition, test-review evidence exists.
- **Product-done:** dev-done **plus** the owning persona can actually discover and use the surface (real entry point,
  not a direct URL/service test). Only product-done may be marked `done`. A green happy-path demo is not enough.

## Epic wrappers (once per epic)
Start: test-design (levels/boundaries/risk-weighted coverage). Close: trace (AC↔test matrix) · epic test-review ·
E2E for any user-facing surface (flow-map → test-cases → browser tests, via the Layer-2 skills) · manual-QA
stabilization · product-done audit · retrospective.

Epic close must include a real-runtime smoke slice for each user-visible/runtime-wired surface class the epic claims:
real HTTP route plus content assertion, real CLI command, real queue/scheduler path, real CMS/admin/runtime render path,
or an explicit deferral/blocker. Green isolated unit/component tests do not satisfy this gate by themselves.
Epic close must also pass `acef-process-validator --check test-authenticity`; warning-as-pass, silent catch/continue,
self-referential assertions, and status-only runtime smoke are not valid done evidence.

Epic and story close must preserve the story-level chain in the canonical ledger, not only in side reports:
- if ATDD was used, record the test-only artifact/commit, expected-fail command, observed red result, and later
  implementation commit;
- record the actor identity for each phase that ran, including Planner, ATDD/Test Author, Developer, Code Reviewer,
  Verify-Patch, Test Reviewer, and Process Judge as applicable;
- a lean chain can be authorized for low-risk stories, but it still requires red-before-dev evidence and a distinct
  Process Judge identity; guarded work cannot be closed with the lean chain.

Epic close must also include an FR-capability trace:
- every FR assigned to the epic maps to at least one owning story;
- the story's deliverable is the capability the user performs, not only a supporting class, form, model, route, or
  seeder;
- each FR has a green real-path capability test or an explicit blocker/defer;
- admin/editor capabilities include an admin route/edit-screen smoke when the FR promises editability;
- manual-QA deferrals may cover polish only after automated evidence proves the entrypoint exists.

When epics/stories are generated, the conductor must also seed one durable `Epic N Process Judge [PENDING]` gate row or
artifact for every epic. This row is positioned after that epic's final story in the delivery ledger. It is not a note
and not a reminder; it is the next allowed transition at the epic boundary.

Epic boundary rule:
- The last story-level Process Judge in an epic must set `Next allowed step: Epic N Process Judge`.
- The first story in Epic N+1 must not be created, started, or dispatched until Epic N Process Judge is `PASS`.
- Epic N+1 also requires a separate **Epic Transition Approval** ledger entry with `status: APPROVED` and the exact
  `user_quote`. Generic continuation phrases such as "go on", "continue", "devam", or "tamamla" are not valid transition
  approval. Valid approval names the target epic and an approval/start verb, for example `user_quote: "Start Epic 4"` or
  `user_quote: "Epic 4'e başla"`.
- Human permission to "continue" can waive a pause for human review, but it cannot waive the process gate and cannot
  approve the next epic unless it is recorded as explicit Epic Transition Approval.
- If the next epic starts without the prior epic gate PASS, stop, mark the run as drift, and restart from the missing
  Epic Process Judge gate.
- If the next epic starts without explicit transition approval, stop, mark the run as intent/scope drift, revert or
  preserve the unauthorized work as a lead, and return to the approval checkpoint.

Epic close must end with an **Epic Process Judge** pass. The epic may not be marked product-done until the judge verifies
that drift audit (when specs exist), trace, epic test-review, E2E/user-flow evidence, manual QA ledger, product-done
audit, retrospective, and status close all exist when required. Missing gates are not prose deferrals; they return to the
missing gate or halt for a human decision.

## Operating contract (kept verbatim, stack-agnostic)
Blind session isolation between phases · artifact-mediated handoffs (no side-chat) · `MERGE/REVISE/REPLAN` ·
**Final Review Stop Condition** recorded in the story before done · model tier is a cost decision, never a gate
shortcut · do not fake skill artifacts — run the real workflow and leave real evidence on disk · a workflow claim is
invalid unless the required skill exists, was invoked, and left evidence on disk.
The conductor must name its adapter source and stack-specific command mapping before Step 0. If that mapping still
contains another project's name, stack, commands, paths, or test tools, the lane is not wired.

## Mechanical guards
A pre-review self-check + CI gate should enforce the hard rules mechanically (build / format / test / the project's
lint + done-evidence checks). The exact script is an adapter value — rewrite it for the stack, don't copy another
project's.
