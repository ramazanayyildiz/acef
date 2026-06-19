# ACEF Delivery Rules — Two Lanes + Promotion (Layer 5, the glue)

This is the **integration layer**: it doesn't add a new tool, it says **which layer runs for which work**, so the
operating model (Layer 1), the test/flow skills (Layer 2), the BMAD v2 lane (Layer 3), and the codemap/adapter
(Layer 4) work together as one system.

## Always first: ground (Layer 4)
Before any work, extract/refresh the **project adapter** (`acef-adapter` + `map-codebase`): stack, commands, tests,
CI, golden neighbors, risk surface, with a freshness stamp. No route runs on a stale adapter. ("Understand the repo
first, then work" — the codemap idea.)

## Two lanes

| Lane | Use for | Engine |
|---|---|---|
| **Lightweight lane** | small / scoped / ongoing work | the operating model (Layer 1): track → personas → Judge, evidence in the artifact + PR, borrowing review discipline without a full story lifecycle |
| **Full BMAD v2** | epics, large features, core-behavior change, multi-module, or anything risky-and-large | the heavy story lifecycle (Layer 3) |

The lightweight lane *is* Layer 1 run for day-to-day work. Full BMAD v2 is the heavy lane for big/risky work. Most
ongoing work lives in the lightweight lane.

Full BMAD v2 has a hard capability preflight: the real BMAD workflow must be installed/wired and its required skills or
commands must resolve to paths before the lane starts. If BMAD is missing, ACEF stops and asks for installation/wiring or
a lane decision. A generic subagent running a BMAD-like checklist is not valid BMAD.

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
- **Process Judge gates** — story/task close and epic close must prove the required steps, skills, and artifacts were
  actually used before status changes to `done`.
- **Done = user-visible** — for user-facing work, prove the owning persona can reach and use the surface, not just a green unit test.
- **Drift = stop condition** — if specs, artifact, and code disagree, resolve the source-of-truth conflict before merging.
- **Guarded test floor** — for guarded-track work a verification checklist is a **supplement, not a substitute**: require at least one symbol-grounded test on the auth / payment / entitlement / data boundary (bootstrap the framework with approval if the repo has none). A zero-test repo does not license shipping guarded work untested; the human-approval gate confirms a test was written, not just a checklist.

## Explicitly OUT (reference-only)
- **Heavy phase-gated PM governance** (full charter / WBS / RTM / RAID / phase-gate document suites) — for large
  programs; not a default for ongoing work. Borrow a single pattern (plan-integrity) if useful, not the whole layer.
- **Pre-SDLC** (idea capture / discovery / council) — a separate front, outside this execution model.

## Per-stack values
All concrete commands, test frameworks, branch names, model tiers, and "done" checks are **adapter values** filled in
per repo (Layer 4) — they are not part of this method. The method (lanes, tracks, personas, gates, promotion) is the
same on any stack.
