# ACEF — Ayyildiz Context Engineering Framework

ACEF is a stack-agnostic SDLC operating system for AI-assisted software work.

It helps an AI agent understand your project first, route the work correctly, and run only the steps needed for that
specific case. ACEF does not replace tools like BMAD, Kiro, GSD, OpenSpec, or spec-kit — it orchestrates them through
the reality of your current project.

## ACEF v1 Status

ACEF v1 is evidence-backed for **quality and process control**, not for token-cost reduction.

The v1 empirical validation matrix ran 30 external-agent tasks across three repositories, three stacks, two clients,
and three lanes. It showed that ACEF lightweight/guarded lanes improved pass rate and known-defect recall, but increased
median input-token usage versus baseline. Therefore ACEF v1 keeps the current safe context policy and does not promote
SQLite, vector, graph, SCIP, Serena, Codebase-Memory, or Context Mode-backed retrieval as defaults.

Current optimization target:

- shorter worker prompts;
- narrower file and diff reads;
- less repeated ledger/artifact loading;
- better per-role Epic Context Packs.

The next benchmark should repeat the same 30-run comparison after those prompt/context-policy improvements and compare
against `docs/experiments/empirical-validation/runs/results.jsonl`.

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
4. **Codemap / project adapter** — grounds everything in *your* real repo and extracts the pattern registry for conformance, including local generation docs, skills, stubs, and the registration/discoverability/runtime evidence that defines a complete work shape (evidence-pinned, no embeddings). `skills/map-codebase` + `skills/acef-adapter`
5. **Delivery rules (the glue)** — which layer runs for which work: small/ongoing → lightweight lane, epics → BMAD v2, with a promotion path. `method/DELIVERY_RULES.md`

A front-door agent (`acef`) ties them together and routes each request, so the user never has to pick a layer, route, or skill.

For full BMAD work, the conductor/dispatcher is only the lifecycle coordinator. It must not author PRDs, UX specs,
architecture, stories, code, tests, reviews, or done-state judgments itself. Each phase binds to a concrete worker
persona, and a worker that wrote code cannot review, verify, or mark its own work done.

## What's in this repo

```text
method/      The delivery engine — how the work actually runs
  OPERATING_MODEL.md   personas + tracks (Layer 1)
  CONTEXT_RETRIEVAL.md optional bounded retrieval adapters and acef-query
  CONTEXT_POLICY.md    role-specific context budgets and worker input policy
  STATE_MACHINE_CONTEXT.md proposed acef next state-machine pushed context contract
  ACEF_COCKPIT.md      product direction for cockpit + context compiler + tool proxy
  TYPED_STATE.md       JSON sidecars for machine-readable ACEF state
  TRUST_MODEL.md       what ACEF guards do and do not guarantee
  VALIDATION_PLAN.md   empirical thresholds before calling ACEF proven
  STABILIZATION_ROADMAP.md  phased plan for context diet, typed state, parser, evidence, and measurement
  docs/research/tooling-admission.md measured admission notes for future tools/backends
  TEST_PIPELINE.md     the test/flow skill chain (Layer 2)
  BMAD_V2_LANE.md      the heavy story lifecycle for epics (Layer 3)
  ADAPTER_MEMORY.md    snapshot vs adapter memory vs run ledger state
  PATTERN_REGISTRY.md  machine-readable conformance registry contract
  RULE_ENFORCEMENT_MAP.md  which rules are machinery/shard/JIT vs documentation-only
  DELIVERY_RULES.md    two lanes + promotion — the glue (Layer 5)
skills/      The ACEF agent skills you install into Claude Code
  acef/ acef-adapter/ acef-router/ acef-specify/ acef-test-bootstrap/ acef-release-adapter/   orchestration + adapter memory
  map-codebase/                                                          codemap + pattern registry / repo grounding (Layer 4)
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
2. **Install the skills** — local-first is preferred. Copy the core ACEF skills into the repo you are working on:
   ```bash
   scripts/install-acef-skills --repo /path/to/your/repo
   scripts/install-acef-tools --repo /path/to/your/repo
   ```
   This installs the default local set for Claude, Codex, and OpenCode:
   `acef`, `acef-adapter`, `acef-router`, `acef-test-bootstrap`, and `map-codebase`.
   For OpenCode, the same installer also writes repo-local slash command wrappers under `.opencode/commands/`
   (`/acef`, `/acef-adapter`, `/acef-router`, `/acef-test-bootstrap`, `/map-codebase`). OpenCode skills live under
   `.opencode/skills/`, but slash commands are a separate `.opencode/commands/*.md` mechanism.
   The tools installer adds repo-local helper CLIs under `.acef/bin/`, including `acef-status`, `acef-process-validator`,
   `acef-codex-guard`, `acef-query`, `acef-context-experiment`, `acef-context-experiment-report`,
   `acef-context-actor-prompt`, `acef-context-actor-prompt-batch`, and `acef-context-record-actor-report`.
   It also installs shared parser support under `.acef/bin/lib/` and typed-state schemas under `.acef/schemas/`.
   Use `--tool codex|claude|opencode` to target one tool, or `--all-core` to copy every skill in this repo.

   Global install is still possible, but should stay minimal:
   ```bash
   cp -R skills/* ~/.claude/skills/
   ```
   Prefer repo-local `.claude/skills/`, `.codex/skills/`, and `.opencode/skills/` for project-specific ACEF work.
3. **Use it** — open your own repo and run `/acef` (or just say "use acef"). It extracts your project adapter, routes
   your request, picks the lane (lightweight vs BMAD v2 per `method/DELIVERY_RULES.md`), and runs only the steps that
   case needs.
   For concrete work, ACEF first creates a target-run ledger, sets `ACEF_ACTIVE_LEDGER` or
   `docs/ai/ACEF_ACTIVE_LEDGER`, and writes a `Session Handoff` before worker fan-out or deep planning.
   A fresh agent should start from repo truth, not chat memory:
   ```bash
   .acef/bin/acef-status --repo .
   ```
   Read order for a new session is: `AGENTS.md` -> `.acef/bin/acef-status --repo .` ->
   `docs/ai/ACEF_CURRENT_CONTEXT.md` -> the active ledger named by the status output. `acef-status` is read-only; it
   reports the active run, current story/phase, next allowed step, current-context path, ledger path, worker scope, and
   blockers without advancing state.

4. **Optional hard wall for BMAD lanes** — install the ACEF/BMAD guard locally in each repo so the dispatcher or
   conductor cannot write implementation files or BMAD artifacts during an ACEF lane:
   ```bash
   scripts/install-acef-bmad-guard --repo /path/to/your/repo
   ```
   This writes the full guard engine to `/path/to/your/repo/.acef/hooks/acef-bmad-hard-wall.mjs` and installs a
   repo-local OpenCode plugin at `/path/to/your/repo/.opencode/plugins/acef-bmad-hard-wall.js`.
   For Claude Code and Codex, which need a user-level hook entry, install the tiny dispatcher once per machine:
   ```bash
   scripts/install-acef-bmad-guard --repo /path/to/your/repo --global-dispatcher
   ```
   The dispatcher only forwards to a repo-local `.acef/hooks/acef-bmad-hard-wall.mjs` when one exists; repos without a
   local ACEF hook are allowed. The portable hook package lives in `claude-plugins/acef-bmad-guard/` for plugin-based
   Claude installs.
   Lightweight runs should create `.acef-lightweight-lane` or `.acef-lane`; full BMAD runs use `.acef-bmad-lane` or
   BMAD runtime markers.
   To scope hook conformance checks to the current run, set `ACEF_ACTIVE_LEDGER` or write the active ledger path into
   `docs/ai/ACEF_ACTIVE_LEDGER`.
   For implementation workers, also write `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` before dispatch. It binds the worker
   to one story/phase, narrow `allowedPaths`, one commit budget, no ledger edits, and no subagent spawning.
   Prefer the installed typed-state writer over hand-authored JSON:
   ```bash
   .acef/bin/acef-state actor --repo . --id dev-4-1 --story "Story 4.1" --phase development \
     --role developer --client codex --context-profile developer
   .acef/bin/acef-state worker-scope --repo . --story "Story 4.1" --phase development \
     --worker-id dev-4-1 --allow 'app/**' --allow 'tests/**'
   ```
   The same CLI captures hashed runtime evidence, Process Judge gate verdicts, and exact human approval receipts.
   See [`method/TYPED_STATE.md`](method/TYPED_STATE.md).
   Generate `docs/ai/ACEF_CURRENT_CONTEXT.md` at each phase transition and run
   `.acef/bin/acef-process-validator --check current-context`. This file is a maximum-150-line, role-specific hot slice;
   the append-only ledger remains authoritative. Ordinary workers do not receive the full ledger, Story Process Judge
   receives only its story slice, and Epic Process Judge may read the full ledger.

## Codex support

ACEF is tool-agnostic, so Codex can run the same method docs, ledgers, adapters, validators, and hook guard. Install
the guard into the target repo, then install the global dispatcher once if Codex needs a `PreToolUse` entry:

```bash
scripts/install-acef-bmad-guard --repo /path/to/repo
scripts/install-acef-bmad-guard --repo /path/to/repo --global-dispatcher
```

Codex `PreToolUse` then checks `exec_command`, `apply_patch`, and file-write tools before they land, but only in repos
that carry the local `.acef/hooks/acef-bmad-hard-wall.mjs` engine.

Use the CLI guard as the explicit certification/backstop before accepting worker output, before commits, or from a git
hook/CI wrapper:

```bash
.acef/bin/acef-codex-guard --repo /path/to/repo --role worker --story 3.5 --base-ref HEAD
```

The Codex guard reads the same `docs/ai/ACEF_ACTIVE_LEDGER` and `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` files as the
Claude hook. It fails if a worker edits `docs/ai/ACEF_*`, changes files outside `allowedPaths`, exceeds `maxCommits`,
or works under the wrong `activeStory`.

For practical Codex use:

1. Start an ACEF run normally and create the ledger + active ledger pointer.
2. Before dispatching an implementation worker, write `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json`.
3. Let the Codex `PreToolUse` guard block out-of-scope writes during the run.
4. After the worker returns, run `.acef/bin/acef-codex-guard ...` and the relevant `.acef/bin/acef-process-validator`
   checks before accepting the output.
5. For stronger enforcement, call `.acef/bin/acef-codex-guard` from a repo-local `pre-commit` hook.

Full BMAD also needs run-level delegation authorization. Record `## Delegation Authorization` once in the ledger:
delegation is approved only for ACEF-required persona workers, with one story/phase per worker, no worker-spawned
subagents, no worker ledger edits, active worker scope before implementation writes, and final report then STOP. This
satisfies tools that require explicit user authorization before spawning independent reviewers without turning
delegation into a blank check.

## OpenCode support

OpenCode can load ACEF's normal `AGENTS.md` rules and `SKILL.md` files directly. Its supported skill locations include
`.opencode/skills/<name>/SKILL.md`, `~/.config/opencode/skills/<name>/SKILL.md`, and Claude-compatible
`.claude/skills/<name>/SKILL.md` / `~/.claude/skills/<name>/SKILL.md`.

OpenCode slash commands are separate from skills. A skill can be available without `/acef` existing. Run
`scripts/install-acef-skills --repo <repo> --tool opencode` to install both:

- `.opencode/skills/<name>/SKILL.md` for skill discovery;
- `.opencode/commands/<name>.md` for slash commands such as `/acef`.

Run the installer in the target repo to copy the ACEF guard plugin into `.opencode/plugins/`. The plugin adapts
OpenCode's `tool.execute.before` event to the repo-local `.acef/hooks/acef-bmad-hard-wall.mjs` engine. It checks
OpenCode `write`, `edit`, `apply_patch`, and `bash` calls before they land.

If you want one OpenCode user-level plugin for all repos, run the installer with `--global-dispatcher`; the global
plugin still dispatches to each repo's local `.acef/hooks` engine.

OpenCode still needs the same ACEF run files as the other tools:

1. Create a lane marker such as `.acef-lightweight-lane` or `.acef-bmad-lane`.
2. Set `docs/ai/ACEF_ACTIVE_LEDGER`.
3. For implementation workers, write `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json`.
4. Restart OpenCode after installing or updating the plugin.

The `method/` docs are the engine the agent follows (personas, tracks, lanes, the test pipeline). Read them to
understand how delivery actually runs; the agent applies them for you.

## Lean runtime

ACEF defaults to lean reporting. Evidence remains durable on disk; chat gets compact summaries only:

- artifact path
- verdict
- key evidence command/path
- next allowed step
- decision needed from the human

Optional bounded retrieval is available through:

```bash
.acef/bin/acef-query context --repo /path/to/repo --story 5.2 --role developer
```

`acef-query` uses Context Mode when its CLI is available, but indexes only the active ledger, matching Epic Context
Pack, current-context file, and matching story artifacts under a content-hashed source label. It falls back to a
deterministic file slice when Context Mode is absent or fails. Context Mode remains optional: retrieval output is a
candidate input, never a gate verdict or source of truth.

Measure retrieval modes before changing worker defaults:

```bash
.acef/bin/acef-context-experiment --repo /path/to/repo --story 5.2 --role reviewer --task-type review --mode files
```

The experiment compares controlled `baseline`, `files`, and `context-mode` modes and records JSONL metrics under
`docs/experiments/context-retrieval/runs/`. Byte reduction is not billing proof; token/cost fields require client usage
data.

Do not paste full PRDs, story specs, ledgers, broad `rg` output, or long logs into chat unless the user asks for detail.

The `acef` front-door skill is intentionally compact. It routes and names which reference files to load just-in-time;
the detailed operating rules live in `skills/acef/references/` and `method/` so every run does not pay for the full
method body upfront.

## Process validators

ACEF ships a stack-agnostic process validator for cheap mechanical gates:

```bash
.acef/bin/acef-process-validator --repo /path/to/repo --check clean-tree
.acef/bin/acef-process-validator --repo /path/to/repo --check preflight
.acef/bin/acef-process-validator --repo /path/to/repo --check claims --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check adapter-freshness --adapter docs/codebase-map.md
.acef/bin/acef-process-validator --repo /path/to/repo --check pattern-registry
.acef/bin/acef-process-validator --repo /path/to/repo --check reuse-before-create --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check do-not-copy --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check partial-workshape --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check finding-promotion --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check graduation-reconciliation --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check vertical-slice --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check guarded-test-floor --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check actor-separation --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check worker-scope --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check evidence-manifest --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check gate-verdict --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check source-reconciliation --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check epic-context-pack --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check current-context --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check session-handoff --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md
.acef/bin/acef-process-validator --repo /path/to/repo --check epic-boundary --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md --target-epic 2
.acef/bin/acef-process-validator --repo /path/to/repo --check epic-transition-approval --ledger docs/ai/ACEF_feature_DELIVERY_AUDIT.md --target-epic 2
```

These checks are the first step in moving ACEF rules out of agent memory and into machinery.
Run `clean-tree` before certification, Process Judge, or external verifier handoff so a verifier never certifies commit
N while the builder has uncommitted N+1 edits layered on top.
The P1 conformance checks are deliberately mechanical: the registry must satisfy the contract, the ledger must record
which local neighbor/probe was checked before creation, and do-not-copy entries cannot be cited as reusable patterns.
The Claude Code guard hook also runs those P1 checks before implementation writes in active ACEF/BMAD lanes.
The hook also enforces the worker scope fence: implementation workers cannot write outside their active story manifest,
edit `docs/ai/ACEF_*`, spawn subagents, or commit without citing the active story.
When story tests depend on third-party framework APIs, run a grounding spike first and record the proven contract before
ATDD. Green tests built on fake descriptors, vendor overrides, monkey patches, or test-only framework shims are not
evidence; they are a REPLAN signal.
When behavior depends on a runtime entrypoint, include a real-runtime smoke: hit the real HTTP route, command, queue,
scheduler, CMS/admin runtime, or template path and assert meaningful content or a negative guard. Status-only checks and
isolated helper/component tests do not prove the production path.
Every FR assigned to an epic must trace to an owning story and an exercised capability. A supporting artifact such as a
form definition, model, seeder, or route file is not enough. Vertical-slice evidence uses `source/path#probe` and
`test/path#probe`; the production source must contain the entrypoint probe and the test must contain the runtime probe
plus an assertion.
For `PARTIAL` registries, the ledger must declare `track:` and `workShape:`; uncovered or guarded work requires
explicit human risk acceptance.
For P2 self-hardening, each ledgered `Conformance finding:` must record a `Disposition:`: patch, registry update,
do-not-copy update, mechanical check, or explicit human deferral/risk acceptance.
If a disposition promises graduation to registry/do-not-copy/mechanical enforcement, it must also record `Reconciled:`
with an existing file path or `enforcedBy:` value.
For session continuity, every active delivery ledger must include `## Session Handoff` with current step, last passed
gate, next allowed step, active lane/track, and ledger path. Guarded or blocked handoffs must state what not to continue
without.

Quick verify:

```bash
node scripts/test-acef-process-validator
node .acef/bin/acef-process-validator --repo . --check clean-tree
node scripts/smoke-acef-hook-active-ledger
node scripts/smoke-acef-opencode-plugin
```

GitHub Actions runs the regression test from `.github/workflows/validate.yml`.

Current capstone review: `docs/capstone-review-2026-06-21.md`.
Typed-state real-project evidence: `docs/dogfood-typed-state-detaysoft-2026-06-23.md`.

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
  seeded Epic Process Judge gate. Starting Epic N+1 also requires explicit `Epic Transition Approval` with an exact
  human quote naming the target epic; generic continuation phrases (`go on`, `continue`, `devam`, `tamamla`) are not
  valid transition approval.

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
