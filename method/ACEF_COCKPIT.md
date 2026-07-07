# ACEF Cockpit Direction

> **Status: DIRECTION — not yet built.** The `acef-cockpit`, `acef-cockpit-status`, and related commands described in this document do not exist yet. This file records the intended design; no `acef-cockpit*` script is present in `scripts/`.
>
> **Reassessed 2026-07-07.** V1 narrowed to the read-only state viewer. Context compiler and tool proxy deferred out of
> v1; execution shell is bought (Nimbalyst/Conductor-class tools), not built. See "2026-07-07 Reassessment" below.

ACEF can grow a user-facing application, but the first product should not be a new AI runtime.

The first product should be:

```text
ACEF Cockpit
-> context compiler
-> bounded tool proxy
-> evidence viewer
-> existing agent CLIs
```

The cockpit runs, scopes, observes, and records work. ACEF remains the authority for gates, evidence, actor separation,
scope, and state.

## 2026-07-07 Reassessment

The original document conflated three products. Evidence produced after it was written re-dispositions them:

| Piece | Original plan | Current disposition |
|---|---|---|
| State viewer (`acef-cockpit-status` JSON + terminal dashboard) | v1 slice | **Build.** Still the first shippable slice. |
| Context compiler + tool proxy | v1 foundation | **Deferred out of v1.** The token-cost motivation was superseded by v2 measurements (+20%/+24% codex, ≈0% opencode; see README "ACEF v2 Status"), and context-mode tooling already provides bounded tool output. Revisit only if a future benchmark shows context waste is again the binding constraint. |
| Execution shell (worktrees, terminals, agent launching) | pilot, maybe build | **Buy, not build.** Nimbalyst/Conductor-class tools already provide this. Per the boundary rule they get UI and execution only — no gate/state authority. |

What changed since the original draft:

1. **V2 honest-down.** The original success criteria were token/cost-shaped; the v2 measurements demoted that axis.
2. **Second observation cycle (O2).** The dominant observed failure class is dev-done-vs-product-done: gate reports
   claiming completion that persona walks refute. That is a visibility and evidence-freshness problem, and it is what
   the state viewer must be designed around. The v1 JSON contract now carries product-done fields for this reason.
3. **Product risk model.** `method/PRODUCT_RISK_MODEL.md` produces `DECISION`/`UNVERIFIED` dispositions; these are
   pending human decisions and belong in the human decisions panel from day one.

V1 succeeds if the operator can answer, without grepping or asking an agent to reconstruct state: what is running, what
is the next allowed step, what awaits my decision, and which "done" claims lack product-done evidence.

## Non-Negotiable Boundary

External tools can provide UI, worktrees, terminals, transcripts, sandboxing, token metrics, or agent execution.

They must not own:

- gate verdicts;
- evidence truth;
- actor separation;
- active scope;
- epic/story transition authority;
- durable ACEF state.

ACEF decides. The cockpit displays and executes.

## MVP Shape

V1 (reassessed) is a read-only state viewer: `acef-cockpit-status` derives one bounded JSON object per repo from
existing canonical files and renders a terminal table. It writes nothing durable; the moment the cockpit owns state it
violates the boundary above.

The original fuller loop is retained as a post-v1 shape only, and its context-compiler/tool-proxy steps are deferred
(see reassessment) while agent launching belongs to the external execution shell:

```text
task/story selected
-> isolated worktree created
-> actor + worker-scope sidecars generated
-> current context + epic context pack generated
-> bounded prompt produced
-> Claude/Codex/OpenCode/Goose launched
-> raw output stored to files
-> short summaries returned to the model
-> tests/validators/guards run
-> evidence, gate, and report artifacts shown
```

It is not a general autonomous agent manager.

## Human Visibility Layer

The cockpit must solve the operator's real pain before it grows execution features: many projects and many agents run at
once, and the human cannot easily see who is doing what, which subagents exist, what stage each story is in, where the
plan lives, whether notes were captured, or what the next allowed step is.

The first useful screen is a mission-control view:

- active projects/repos, branches, dirty/clean state, ahead/behind;
- active ACEF run per repo: epic/story, lane/track, last passed gate, next allowed step, required human approval;
- worker/subagent cards: actor id, role, story, phase, status, allowed scope, start/end time, report path, commit id;
- subagent provenance: who spawned it, what it was allowed to do, whether it wrote files, whether it committed;
- plan and note surfaces: active ledger, current context, epic context pack, story artifact, known-open items, blockers;
- human decisions panel: exact approval quotes, deferrals, push approvals, scope changes, and timestamp/source;
- timeline: tool/worker/gate events collapsed into readable checkpoints, with raw transcripts stored outside chat.

The cockpit should make "what is happening right now?" answerable without opening the chat transcript, grepping the
ledger, or asking the agent to reconstruct state from memory.

## What To Borrow

Borrow ideas, not authority.

| Source | Useful idea | ACEF boundary |
|---|---|---|
| Baton / Nimbalyst / Vibe Kanban | worktree cockpit, agent visibility, diff review | UI only; no gate/state authority |
| Watchfire | sandbox, transcripts, token/cost logging, per-task worktrees | execution shell only |
| Archon | deterministic workflow definitions and approval gates | ACEF remains the workflow contract |
| Multica | task board, assignment UX, managed-agent visibility | no Multica squads/autopilot as ACEF state |
| Agent Kanban | actor identity and provenance ideas | no worker-created subtasks or auto-merge |
| Goose / OpenHands / WrongStack | open runtime hooks and tool control | later runtime option, not v1 cockpit |
| Obsidian Atlas / vault skills | session start/end, breadcrumb, topic, todo, project status, activity feed, decision capture | personal knowledge workflow only; ACEF still owns delivery state |

## Obsidian Atlas Audit Notes

Local inspection found the relevant Atlas surfaces in the user's Obsidian/Claude setup:

- Atlas agent: `~/.claude/agents/atlas.md` — PM/brainstorm/co-architect, not an execution bot. Its session flow reads
  Backlog, Questions & Notes, latest Session Log, then suggests priorities; session end updates Backlog, Changelog, and
  Session Log.
- Atlas Partner: `~/.claude/agents/atlas-partner.md` — read-only thinking partner with append-only journals under
  `~/.claude/partner/`.
- Vault-local Claude skills:
  `/Users/ramazanayyildiz/Library/Mobile Documents/iCloud~md~obsidian/Documents/Ram/.claude/skills/`.

Observed skill families useful for ACEF Cockpit design:

- session control: `session-start`, `session-end`, `session-breadcrumb`, `session-topic`, `session-todo`;
- project visibility: `project-status`, `activity-feed`, `project-creator`;
- capture and knowledge hygiene: `quick-note`, `triage-notes`, `anchor-list`;
- review/research lenses: `review-tool`, `review-pipeline`, `research`, `think`;
- bookmark/content pipelines: `sync-bookmarks`, `x-bookmarks`, `yt-playlists`, `youtube-summary`, `enrich-bookmarks`.

ACEF should not copy the vault workflow wholesale. The useful extraction is the UX pattern: explicit session start/end,
current topic, human-readable breadcrumbs, cross-project activity feed, and durable decision capture. These become cockpit
views backed by ACEF state files and evidence artifacts, not free-form memory.

## What Not To Borrow

Do not import these behaviors into ACEF:

- auto task generation;
- autopilot loops;
- worker-spawns-worker behavior;
- auto-merge before ACEF review/gate;
- shared persistent memory as evidence;
- runtime-owned gate/state model;
- permission bypass as a default execution mode.

## Context Compiler

> **Deferred out of v1 (2026-07-07 reassessment).** Kept as design record for a possible later phase.

The context compiler prepares bounded worker input:

```text
active run state
story/phase
role profile
allowed paths
current context
epic context pack
relevant pattern slice
target files or diff summary
failure summary
```

It should prevent repeated ingestion of full ledgers, full planning folders, full pattern registries, and full test dumps.

The compiler output is convenience context, not evidence. Evidence still comes from files, commands, tests, validators,
and runtime behavior.

## Tool Proxy

> **Deferred out of v1 (2026-07-07 reassessment).** context-mode tooling already provides bounded tool output in the
> operator's current setup; rebuild inside ACEF only if a benchmark shows the gap matters.

The tool proxy should reduce raw output before it reaches the model.

Default rules:

- store raw command output in evidence files;
- return bounded summaries to the model;
- limit search result counts;
- include file path, line number, and a few surrounding lines;
- reject unbounded full-repo dumps by default;
- record tool calls, bytes, token metrics when available, and hashes.

## Worker Result Substrate

The first Cockpit-displayable substrate is filesystem-only:

- execution contracts record declared, observed, and mechanically enforced limits separately;
- worker results return summary, answer key, verdict, usage metrics, artifact path/hash, and optional transcript
  path/hash;
- long output and transcripts stay outside chat; transcripts stay outside Git;
- deterministic roll-ups group results by answer key and expose consensus, conflicts, open questions, and the next
  recommended action.

This is enough for a future Cockpit to display worker provenance without adding SQLite, vectors, graphs, automatic
fleets, or a custom ACEF runtime.

## First Sprint Contract

Start with a CLI cockpit, not a web UI.

The first shippable slice is:

\`\`\`text
acef-cockpit-status --repo /path/to/repo
acef-cockpit-status --all
acef-cockpit
\`\`\`

\`acef-cockpit-status --repo\` should emit one bounded JSON object:

\`\`\`json
{
  "repo": "/path/to/repo",
  "branch": "feature/example",
  "git": {
    "dirty": false,
    "ahead": 0,
    "behind": 0
  },
  "acef": {
    "active": true,
    "ledger_path": "docs/ai/ACEF_example_DELIVERY_AUDIT.md",
    "current_context_path": "docs/ai/ACEF_CURRENT_CONTEXT.md",
    "epic_context_pack_path": "docs/ai/epic-4-context-pack.md",
    "last_passed_gate": "Epic 3 Process Judge PASS",
    "next_allowed_step": "Human checkpoint before Epic 4",
    "lane": "Full BMAD v2",
    "track": "per-story"
  },
  "worker": {
    "active_scope_path": "docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json",
    "actor_id": "codex-story-4-1-dev",
    "role": "developer",
    "story": "4.1",
    "phase": "implementation",
    "allowed_paths": []
  },
  "human": {
    "pending_approval": true,
    "approval_needed_for": "Start Epic 4",
    "last_decision": "Epic 3 approved, stop before Epic 4"
  },
  "product_done": {
    "persona_walk_evidence": null,
    "persona_walk_date": null,
    "self_certified_only": true,
    "stale_evidence": []
  },
  "decision_queue": [
    {
      "source": "product-risk",
      "item": "redemption-window check missing on exclusive path",
      "disposition": "DECISION",
      "ref": "docs/ai/risk/example-product-risk-pass.md"
    }
  ],
  "artifacts": {
    "planning": "_bmad-output/planning-artifacts",
    "latest_worker_report": null,
    "latest_rollup": null
  }
}
\`\`\`

The `product_done` block exists because of the O2 finding that gate self-certification and product-done diverge:
`self_certified_only: true` means every completion claim for the current story/epic rests on gate reports with no
persona-walk artifact; `stale_evidence` lists gate claims whose cited evidence predates the code they certify. The
`decision_queue` aggregates `DECISION`/`UNVERIFIED` dispositions from product-risk artifacts and any other pending
human calls the canonical files record.

\`acef-cockpit-status --all\` should read a repo registry and return one status object per repo. The registry may be
project-local or user-local, but it must only list repos; it must not become a second source of delivery truth.

\`acef-cockpit\` should render the same data as a compact terminal dashboard:

\`\`\`text
repo | branch | dirty | epic/story | phase | next allowed step | pending approval | active worker
\`\`\`

The terminal dashboard is intentionally boring. If the JSON is correct, a web UI can be built later without changing the
state model.

## Repo Registry

The cockpit may use a small registry such as:

\`\`\`json
{
  "repos": [
    {
      "name": "detaysoft2026",
      "path": "/Users/ramazanayyildiz/CODE/OPA/detaysoft2026"
    },
    {
      "name": "acef",
      "path": "/Users/ramazanayyildiz/CODE/acef"
    }
  ]
}
\`\`\`

Allowed locations, in priority order:

1. repo-local \`docs/ai/ACEF_COCKPIT_REPOS.json\` when the repo owns a project group;
2. user-local \`~/.acef/cockpit-repos.json\` for a personal multi-project view.

The registry is navigation metadata only. Ledger, current context, worker scope, and gate state remain in each target
repo.

## Human Decisions Panel

The cockpit should extract human decisions from canonical ACEF files, not chat memory.

Minimum extracted fields:

- exact approval text when present;
- approved scope;
- denied or deferred scope;
- push permission;
- current stop condition;
- next human checkpoint.

When the data is ambiguous, the cockpit should display \`unknown\` or \`approval_required\`; it must not infer approval from
phrases such as \`go on\`, \`continue\`, or \`tamamla\`.

The panel also surfaces the `decision_queue`: `DECISION` and `UNVERIFIED` dispositions from product-risk artifacts
(`method/PRODUCT_RISK_MODEL.md`) are pending human decisions and must appear here, not only inside feature docs.

## Worker Timeline

The cockpit should show worker activity as a timeline, not as a raw transcript dump.

Each worker event should reduce to:

\`\`\`json
{
  "actor_id": "codex-story-4-1-reviewer",
  "role": "reviewer",
  "story": "4.1",
  "phase": "independent_review",
  "status": "pass",
  "started_at": null,
  "ended_at": null,
  "commit": null,
  "report_path": "docs/ai/workers/story-4-1-review.md",
  "scope_path": "docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json"
}
\`\`\`

Raw transcripts may be stored outside Git and linked by hash. They should not be printed into normal model context.

## Out Of Scope For V1

Do not build these until the CLI cockpit proves useful:

- custom web application;
- SQLite state store;
- vector or graph database;
- direct model API runtime;
- multi-agent scheduler;
- auto-spawning workers;
- auto-merge or auto-push;
- replacing existing Claude/Codex/OpenCode clients;
- context compiler (deferred — see reassessment);
- tool proxy (deferred — context-mode covers it today);
- execution shell / worktree launcher (bought — Nimbalyst/Conductor-class tools).

The v1 cockpit is a state viewer and context/proxy foundation. It is not a new orchestrator.

## Code Search Policy

`grep`, `git grep`, and `rg` are not bad. Unbounded output is bad.

Use the narrowest query type that answers the question:

```text
tracked text search      -> git grep
fast general text search -> rg
structural pattern       -> ast-grep
definition/reference     -> LSP or SCIP
changed surface          -> git diff --name-only
history search           -> git log -S / -G
```

Bounded examples:

```bash
git grep -n -I -m 20 'RefundService' -- app/
rg -n -m 20 --glob '*.php' 'RefundService' app/
git diff --name-only HEAD~1
git log -S 'deprecatedCall' -- app/
```

Potential ACEF interface:

```bash
acef-query code --text RefundService
acef-query code --pattern 'deprecatedCall($A)'
acef-query code --changed HEAD~1
acef-query symbol --references RefundService
```

Each command should return at most bounded file references and small snippets by default. Full output belongs in an
evidence file.

## Why Not Custom Runtime First

Closed harnesses such as Claude Code, Codex, and OpenCode still own parts of their internal session history, tool
definitions, and global prompt payload. ACEF can reduce what it feeds them, but cannot fully control their context
economy from outside.

Full context and tool-surface control requires:

- direct model API usage;
- an open runtime such as Goose/OpenHands;
- or a custom ACEF runtime.

That is a later phase. Build the cockpit first; measure; then decide whether runtime control is worth the cost.

## Pilot Order

Revised 2026-07-07:

1. Update this spec with the reassessment (done).
2. Build `acef-cockpit-status --repo` against the acef repo plus one live target repo, deriving everything from
   existing canonical files.
3. Build the `acef-cockpit` terminal table over the same JSON.
4. Pilot Nimbalyst/Conductor as the execution shell alongside the status CLI; note which UX elements matter before any
   ACEF-owned UI work.
5. Evaluate Archon workflow definitions for reusable ideas.
6. Revisit the context compiler and tool proxy only if a benchmark shows context waste is again the binding constraint.
7. Consider Goose/OpenHands/direct API only after that benchmark, not before.

## Success Criteria

Revised 2026-07-07 — v1 is a visibility product, so the criteria are operator-shaped, not token-shaped:

- the operator can answer "what is running, on which repo/branch, at which epic/story/phase" from the cockpit alone;
- the next allowed step and any pending human approval are visible without grepping the ledger or asking an agent to
  reconstruct state;
- every completion claim is visibly marked as persona-walk-backed or `self_certified_only`;
- stale evidence (gate claims older than the code they certify) is surfaced, not discovered in review;
- `DECISION`/`UNVERIFIED` product-risk dispositions appear in one queue across repos;
- the JSON contract survives a second consumer (terminal table today, any web UI later) without state-model changes.

The deferred context-compiler/tool-proxy phase keeps the original benchmark-shaped criteria (lower actor tokens/cost,
no drop in pass rate or known-defect recall, zero scope violations) if it is ever picked up.
