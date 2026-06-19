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

## Single source of truth
For an initiative, the single source of truth is the task artifact + the PR. Agents do **not** communicate via
side-chats — they write updates into (1) the task artifact and (2) the PR description and review comments. If a fact
matters for review, merge, or future maintenance, it lives in the artifact or PR, never only in chat.

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

## Status flow

`planned → in-progress → reviewing → done`, with `reviewing → in-progress` (REVISE) and `reviewing → planned` (REPLAN).
Mechanical tasks may go `in-progress → done` on passing validation (no Judge). Standard/guarded require a Judge decision.

## Required task blocks (short, factual, copy-paste)

- **Task Header** (Planner): Track · Status · Owner · Scope (in/out) · Expected files · Acceptance criteria · Test plan · Non-goals · Risks.
- **Test Author Report** (guarded): test files · failure modes targeted · boundary cases.
- **Developer Report**: what changed · files changed · exact test commands · pass/fail + full failing output (no paraphrase) · open questions (max 2, only if blocking).
- **Judge Decision**: `MERGE`/`REVISE`/`REPLAN` · 3–7 actionable reasons · follow-ups · a lessons entry (or "none") · on MERGE, close the task in the artifact.
- **Docs Drift Note** (when needed): docs updated · why · what was not changed.

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
