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

## Story lifecycle (per story)
1. **Readiness** — the story is implementable: acceptance criteria clear, canonical references linked, domain contract
   complete, dependency order known. A soft story is sent back before any build.
2. **Reuse-before-create** — before implementation, record work shape, pattern-registry status/entry, golden neighbor
   checked, existing symbols/components/helpers searched, what was reused, and why any new pattern is needed.
   `PARTIAL` registries permit only covered mechanical/standard work shapes; guarded stories and new work shapes must
   refresh the registry or record explicit human risk acceptance first.
3. **(NFR)** — extract non-functional constraints first on state-machine / concurrency / money / security-critical work.
4. **ATDD** — failing tests land **before** implementation, as their own commit. Every test fails on HEAD first.
5. **Dev-story** — implement until the ATDD tests go green.
6. **Code-review** — multi-layer adversarial review (e.g. correctness + conformance + blind-spot + edge-case + acceptance-auditor
   lenses). Reviewer returns `MERGE` / `REVISE` / `REPLAN` (findings classed Patch / Decision / Defer / Dismiss).
   Every conformance finding becomes a code patch, pattern-registry update, do-not-copy update, proposed mechanical
   check, or explicit human deferral.
7. **Verify-patch** — after every REVISE, fresh-context verifiers re-read each patch's acceptance criteria + domain
   contract + the actual diff, and check the patch claim **and** adjacent invariants it could affect.
8. **Loop** code-review → verify-patch until **zero blocker + zero high** findings remain (read the findings, don't
   stop on a verdict string or a round count).
9. **Test-review** — score test quality (target ≥ 80/100): brittleness, duplication, false-positive risk, fixture hygiene.
10. **Story closeout Process Judge** — before product-done/test-review close, verify the real steps ran in order and the
   artifacts are genuine skill outputs. Any missing BLOCKER/HIGH process evidence returns the story to the required phase.
   If this is the last story in its epic, the next allowed step must be `Epic N Process Judge`, not the next epic's
   first story.
11. **Product-done audit + manual QA** — see below.
12. **Mark done** only through the evidence gate.

## Actor separation (mandatory)

The conductor is a lifecycle coordinator, not an implementing or reviewing actor. It may sequence story workers, but it
must not collapse ATDD, dev-story, code-review, verify-patch, test-review, or Process Judge into one self-reviewing
worker context.

Worker identities must map to explicit personas:

| BMAD phase | Required persona identity |
|---|---|
| PRD / story intent | PM / Planner |
| UX gate | UX Designer |
| Architecture | Architect |
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

## Dev-done vs product-done
- **Dev-done:** ATDD/feature tests green, acceptance criteria implemented, review reached its stop condition, test-review evidence exists.
- **Product-done:** dev-done **plus** the owning persona can actually discover and use the surface (real entry point,
  not a direct URL/service test). Only product-done may be marked `done`. A green happy-path demo is not enough.

## Epic wrappers (once per epic)
Start: test-design (levels/boundaries/risk-weighted coverage). Close: trace (AC↔test matrix) · epic test-review ·
E2E for any user-facing surface (flow-map → test-cases → browser tests, via the Layer-2 skills) · manual-QA
stabilization · product-done audit · retrospective.

When epics/stories are generated, the conductor must also seed one durable `Epic N Process Judge [PENDING]` gate row or
artifact for every epic. This row is positioned after that epic's final story in the delivery ledger. It is not a note
and not a reminder; it is the next allowed transition at the epic boundary.

Epic boundary rule:
- The last story-level Process Judge in an epic must set `Next allowed step: Epic N Process Judge`.
- The first story in Epic N+1 must not be created, started, or dispatched until Epic N Process Judge is `PASS`.
- Human permission to "continue" can waive a pause for human review, but it cannot waive the process gate.
- If the next epic starts without the prior epic gate PASS, stop, mark the run as drift, and restart from the missing
  Epic Process Judge gate.

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
