# ACEF BMAD v2 Lane — the heavy lane (Layer 3)

The heavy delivery lane for **epics / large features / core-behavior / risky-and-large** work. It runs the full
story lifecycle with hard gates. Small/ongoing work does **not** use this lane — it uses the lightweight lane
(Layer 5 → Layer 1) and promotes here only when it grows (see `DELIVERY_RULES.md`).

## Dependency
This lane is driven by **BMAD-METHOD** (https://github.com/bmad-code-org/BMAD-METHOD, MIT) — an installable agent
framework. ACEF does not bundle it; install it where you want the heavy lane. ACEF orchestrates it and normalizes its
output; the discipline below is the operating contract around it. (The lane has been run in production on Laravel and
on TypeScript/Next stacks; the per-stack test/build commands are adapter values.)

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
9. **Product-done audit + manual QA** — see below.
10. **Mark done** only through the evidence gate.

## Dev-done vs product-done
- **Dev-done:** ATDD/feature tests green, acceptance criteria implemented, review reached its stop condition, test-review evidence exists.
- **Product-done:** dev-done **plus** the owning persona can actually discover and use the surface (real entry point,
  not a direct URL/service test). Only product-done may be marked `done`. A green happy-path demo is not enough.

## Epic wrappers (once per epic)
Start: test-design (levels/boundaries/risk-weighted coverage). Close: trace (AC↔test matrix) · epic test-review ·
E2E for any user-facing surface (flow-map → test-cases → browser tests, via the Layer-2 skills) · manual-QA
stabilization · product-done audit · retrospective.

## Operating contract (kept verbatim, stack-agnostic)
Blind session isolation between phases · artifact-mediated handoffs (no side-chat) · `MERGE/REVISE/REPLAN` ·
**Final Review Stop Condition** recorded in the story before done · model tier is a cost decision, never a gate
shortcut · do not fake skill artifacts — run the real workflow and leave real evidence on disk.

## Mechanical guards
A pre-review self-check + CI gate should enforce the hard rules mechanically (build / format / test / the project's
lint + done-evidence checks). The exact script is an adapter value — rewrite it for the stack, don't copy another
project's.
