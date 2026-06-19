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

If any required BMAD capability is missing, return:

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
2. **(NFR)** — extract non-functional constraints first on state-machine / concurrency / money / security-critical work.
3. **ATDD** — failing tests land **before** implementation, as their own commit. Every test fails on HEAD first.
4. **Dev-story** — implement until the ATDD tests go green.
5. **Code-review** — multi-layer adversarial review (e.g. correctness + blind-spot + edge-case + acceptance-auditor
   lenses). Reviewer returns `MERGE` / `REVISE` / `REPLAN` (findings classed Patch / Decision / Defer / Dismiss).
6. **Verify-patch** — after every REVISE, fresh-context verifiers re-read each patch's acceptance criteria + domain
   contract + the actual diff, and check the patch claim **and** adjacent invariants it could affect.
7. **Loop** code-review → verify-patch until **zero blocker + zero high** findings remain (read the findings, don't
   stop on a verdict string or a round count).
8. **Test-review** — score test quality (target ≥ 80/100): brittleness, duplication, false-positive risk, fixture hygiene.
9. **Story closeout Process Judge** — before product-done/test-review close, verify the real steps ran in order and the
   artifacts are genuine skill outputs. Any missing BLOCKER/HIGH process evidence returns the story to the required phase.
10. **Product-done audit + manual QA** — see below.
11. **Mark done** only through the evidence gate.

## Dev-done vs product-done
- **Dev-done:** ATDD/feature tests green, acceptance criteria implemented, review reached its stop condition, test-review evidence exists.
- **Product-done:** dev-done **plus** the owning persona can actually discover and use the surface (real entry point,
  not a direct URL/service test). Only product-done may be marked `done`. A green happy-path demo is not enough.

## Epic wrappers (once per epic)
Start: test-design (levels/boundaries/risk-weighted coverage). Close: trace (AC↔test matrix) · epic test-review ·
E2E for any user-facing surface (flow-map → test-cases → browser tests, via the Layer-2 skills) · manual-QA
stabilization · product-done audit · retrospective.

Epic close must end with an **Epic Process Judge** pass. The epic may not be marked product-done until the judge verifies
that drift audit (when specs exist), trace, epic test-review, E2E/user-flow evidence, manual QA ledger, product-done
audit, retrospective, and status close all exist when required. Missing gates are not prose deferrals; they return to the
missing gate or halt for a human decision.

## Operating contract (kept verbatim, stack-agnostic)
Blind session isolation between phases · artifact-mediated handoffs (no side-chat) · `MERGE/REVISE/REPLAN` ·
**Final Review Stop Condition** recorded in the story before done · model tier is a cost decision, never a gate
shortcut · do not fake skill artifacts — run the real workflow and leave real evidence on disk · a workflow claim is
invalid unless the required skill exists, was invoked, and left evidence on disk.

## Mechanical guards
A pre-review self-check + CI gate should enforce the hard rules mechanically (build / format / test / the project's
lint + done-evidence checks). The exact script is an adapter value — rewrite it for the stack, don't copy another
project's.
