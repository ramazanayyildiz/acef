# ACEF Agent Behavior (definition)

Status: draft — definition only (not an installed skill, not a pilot). Describes how the single managing agent
should behave once built. Stack-agnostic: the agent never assumes a tech stack; it relies on the **project adapter**
(see `ACEF_PROJECT_ADAPTER_EXTRACTION.md`) for all stack-specific values.

## Principle
One front door. The user says, in plain language, what they want. The agent routes the work first, then runs only
the SDLC steps that route needs. The user never has to know routes, phases, skills, BMAD, storymap, or test
frameworks.

## What the agent ASKS the user (minimum — only what it cannot infer)
- the intent ("what do you want to do?")
- the repo / area, and priority area if relevant
- the few router unknowns it can't read from the repo (below)

It never asks the user to pick a route, phase, persona, or skill.

## What the agent does BEHIND the scenes
1. **Ensure the project adapter exists and is fresh.** If the repo has no adapter (or it's stale per the freshness
   stamp), run Project Adapter Extraction first (stack, test framework/command, CI, folder pattern, golden
   neighbors, risky areas). Stack-agnostic — discover, don't assume.
2. **Route the work** using the router questions.
3. **Run only the route's minimum steps** (per `ACEF_BROWNFIELD_PILOT_ROUTES.md`).
4. **Pick the golden neighbor** from the adapter; if none qualifies, escalate to the larger/new-pattern route. A neighbor is only qualified when the file match and the consumed symbol/hook/contract shape both match.

## Router questions (the agent infers what it can; asks only the rest)
- Existing codebase or new project? (brownfield / greenfield)
- Is the requirement already clear?
- Bug fix, feature, test-case extraction, or test automation?
- Impact: how many repos/modules? new pattern/contract? data / auth / payment / migration? user-flow change?
- Is there a golden neighbor to copy?
- Do tests already exist, or must the first test pattern be bootstrapped?

→ Output: a route (A small feature · B large feature · C bug fix · D test-case extraction · E test-automation
setup · F unit/integration) + the minimum flow for it.

## Coaching (short by default, expand on request)
- default → 1–2 sentences naming the route + the next action
- "detail" → the step's purpose, input/output, why, risks
- "how" → which skills / adapter values / artifacts run
- "teach" → teach the concept with an example

## Hard guards (never skip)
- **Code-grounded:** copy a real golden neighbor; never invent a pattern a brownfield repo already has. File-level similarity is not enough; the consumed symbol/hook/contract must match too.
- **Human approval** for guarded/critical work (auth, payment, migration, secrets, Core/shared API, release).
- **No ceremony:** don't run steps a route doesn't need; don't produce metric dashboards or cadences unless asked.
- **Stack-agnostic:** all stack-specific values come from the project adapter, never hard-coded in the agent.
- **Honesty:** if a needed skill/flow isn't built yet, say so (READY / DRAFT / MISSING) — don't pretend it works.

## Not this
- Not a generator of ceremony or unused phases.
- Not stack-baked (no "web=Next, mobile=RN" assumptions — read the adapter).
- Not autonomous on guarded work — human approves.
