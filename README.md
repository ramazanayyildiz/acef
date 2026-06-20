# ACEF — Ayyildiz Context Engineering Framework

ACEF is a stack-agnostic SDLC operating system for AI-assisted software work.

It helps an AI agent understand your project first, route the work correctly, and run only the steps needed for that
specific case. ACEF does not replace tools like BMAD, Kiro, GSD, OpenSpec, or spec-kit — it orchestrates them through
the reality of your current project.

## Core idea

Generic AI development frameworks are useful, but they fall short on real codebases because they don't know:

- the actual repo structure
- the safe patterns to copy
- the test and CI setup
- the risky areas
- the team's real conventions

ACEF is one package that unifies **five layers** — the actual delivery engine, not just an orchestration shell:

1. **Operating model** — personas (Planner / Developer / Judge / Test Author / Doc Maintainer) + tracks (mechanical / standard / guarded). `method/OPERATING_MODEL.md`
2. **Test & flow engine** — real skills for user-flow → test-cases → tests, and bootstrapping the first test. `method/TEST_PIPELINE.md` + `skills/`
3. **BMAD v2 heavy lane** — the full story lifecycle for epics / risky work (drives BMAD-METHOD, with a hard
   installed-skill preflight). `method/BMAD_V2_LANE.md`
4. **Codemap / project adapter** — grounds everything in *your* real repo (evidence-pinned, no embeddings). `skills/map-codebase` + `skills/acef-adapter`
5. **Delivery rules (the glue)** — which layer runs for which work: small/ongoing → lightweight lane, epics → BMAD v2, with a promotion path. `method/DELIVERY_RULES.md`

A front-door agent (`acef`) ties them together and routes each request, so the user never has to pick a layer, route, or skill.

For full BMAD work, the conductor/dispatcher is only the lifecycle coordinator. It must not author PRDs, UX specs,
architecture, stories, code, tests, reviews, or done-state judgments itself. Each phase binds to a concrete worker
persona, and a worker that wrote code cannot review, verify, or mark its own work done.

## What's in this repo

```text
method/      The delivery engine — how the work actually runs
  OPERATING_MODEL.md   personas + tracks (Layer 1)
  TEST_PIPELINE.md     the test/flow skill chain (Layer 2)
  BMAD_V2_LANE.md      the heavy story lifecycle for epics (Layer 3)
  DELIVERY_RULES.md    two lanes + promotion — the glue (Layer 5)
skills/      The ACEF agent skills you install into Claude Code
  acef/ acef-adapter/ acef-router/ acef-specify/ acef-test-bootstrap/ acef-release-adapter/   orchestration
  map-codebase/                                                          codemap / repo grounding (Layer 4)
  test-user-flow-mapper/ test-case-planner/ test-browser-generator/
  test-gen/ test-generator/ test-coverage-auditor/ test-strategy/ test-risk-classifier/
  flow-document-composer/ flow-suite-composer/ storymap/ qa/ qa-only/    test & flow workhorses (Layer 2)
docs/        The developer-guide website (also published via GitHub Pages)
README.md
```

Naming convention: `acef-*` skills are ACEF-specific orchestration/core skills. Unprefixed skills such as
`map-codebase`, `test-case-planner`, and `storymap` are reusable workhorses that ACEF calls; they are intentionally
not renamed because they can be used outside ACEF too.

## Install & use

ACEF runs as a set of [Claude Code](https://docs.anthropic.com/claude-code) skills — they're Markdown instruction
files the agent follows. No build, no npm, no services.

1. **Get Claude Code** and a Claude account.
2. **Install the skills** — copy everything in `skills/` into your skills directory:
   ```bash
   cp -R skills/* ~/.claude/skills/
   ```
   (or into a project's `.claude/skills/` to scope them to one repo.)
3. **Use it** — open your own repo and run `/acef` (or just say "use acef"). It extracts your project adapter, routes
   your request, picks the lane (lightweight vs BMAD v2 per `method/DELIVERY_RULES.md`), and runs only the steps that
   case needs.

4. **Optional hard wall for BMAD lanes** — if you use Claude Code hooks, install the ACEF/BMAD guard so the dispatcher
   or conductor cannot write implementation files or BMAD artifacts during a BMAD lane:
   ```bash
   scripts/install-acef-bmad-guard
   ```
   The portable hook package lives in `claude-plugins/acef-bmad-guard/` for plugin-based installs.

The `method/` docs are the engine the agent follows (personas, tracks, lanes, the test pipeline). Read them to
understand how delivery actually runs; the agent applies them for you.

## Dependency: BMAD (large-feature flow only)

For the **large-feature route (Route B)**, ACEF uses [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (MIT)
as the heavy delivery engine. BMAD is **not** bundled here; install/wire it separately if you need Route B. Every other
route works without it.

Route B starts with a hard preflight. ACEF must resolve the real BMAD conductor/skills or commands before it proceeds.
If BMAD is missing, ACEF must stop and ask you to install/wire it or choose a different lane. A generic subagent running
a BMAD-like checklist is not BMAD.

Route B also requires actor separation. Planning, ATDD, development, code review, verify-patch, test review, and
Process Judge must record distinct valid persona actors. A generic worker is invalid unless it is explicitly bound to a
BMAD/ACEF persona in the artifact evidence.

Route B also requires seeded epic gates. When epics/stories are generated, every epic gets an `Epic N Process Judge
[PENDING]` row or artifact before implementation starts. The last story in an epic points to that gate, and the next
epic cannot start until the prior epic gate is `PASS`.

## Process gates

ACEF separates implementation review from process review:

- **Preflight artifact** (`docs/ai/ACEF_PREFLIGHT.md` by default) is required before planning, implementation, test
  generation, release, or done-state changes. It records route/lane/track, required skills, resolved paths, adapter
  freshness, test setup, API/backend source of truth, risk gates, approvals, and a `PASS` / `FAIL` / `HALT` verdict.
- **Judge** reviews the change and returns `MERGE` / `REVISE` / `REPLAN`.
- **Process Judge** verifies that the required route/lane/track, skills, phase order, and artifacts were actually used
  before a story/task is marked `done`.
- **Actor separation** is part of the gate: every story ledger must record ATDD actor, Developer actor, Code Review
  actor, Verify-Patch actor, Test Review actor, and Process Judge actor. Self-review is invalid on full BMAD work and
  cannot be waived on guarded stories.
- **Epic Process Judge** verifies epic closeout gates before an epic is product-done: drift audit when needed, trace,
  epic test-review, E2E/user-flow evidence, manual QA ledger, product-done audit, retrospective, and final status close.
- **Epic boundary** is mechanical: `continue without me` may skip waiting for a human checkpoint, but it never skips the
  seeded Epic Process Judge gate.

A workflow claim is invalid unless the required skill exists, was invoked, and left evidence on disk. Subagent output is
a lead, not gate evidence, until the conductor verifies the backing source path, command, or artifact.

## Honest status

This is a research-informed **draft**:

- the developer-guide website is ready
- the agent skills exist as draft definitions and have been only lightly exercised
- the agent skills and workhorse skills exist as draft definitions and have been only lightly exercised
- real-world dogfooding on your own repo is still required before treating any route as proven

Treat ACEF as a framework to apply and harden on your codebase, not a finished, battle-tested product.

## Website

The site lives in `docs/` and is published with GitHub Pages (Source: `main`, Folder: `/docs`).

## License

License not selected yet. BMAD-METHOD, referenced as an optional dependency, is MIT-licensed and not redistributed here.
