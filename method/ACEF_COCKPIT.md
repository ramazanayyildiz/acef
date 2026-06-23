# ACEF Cockpit Direction

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

The first cockpit should do the smallest useful loop:

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

This is a cockpit plus context compiler plus tool proxy. It is not a general autonomous agent manager.

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

The tool proxy should reduce raw output before it reaches the model.

Default rules:

- store raw command output in evidence files;
- return bounded summaries to the model;
- limit search result counts;
- include file path, line number, and a few surrounding lines;
- reject unbounded full-repo dumps by default;
- record tool calls, bytes, token metrics when available, and hashes.

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

1. Define the ACEF Cockpit spec.
2. Pilot Baton/Nimbalyst-style worktree cockpit UX.
3. Pilot Watchfire-style execution shell and transcript/token recording.
4. Evaluate Archon workflow definitions for reusable ideas.
5. Build a minimal ACEF tool proxy for bounded search, diff, and test-output summaries.
6. Rerun the empirical validation matrix against the v1 baseline.
7. Consider Goose/OpenHands/direct API only if external cockpit plus proxy cannot reduce cost or prevent drift.

## Success Criteria

The cockpit direction is justified only if a follow-up benchmark shows:

- lower real actor input tokens or cost;
- no drop in pass rate;
- no drop in known-defect recall;
- zero scope violations;
- no increase in invalid runs;
- fewer repeated raw reads or test-output dumps.
