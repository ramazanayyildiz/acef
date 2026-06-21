# ACEF BMAD Guard

Portable Claude Code hook package for ACEF lightweight and BMAD lanes.

It prevents the main dispatcher/conductor from authoring BMAD artifacts or implementation code once a BMAD lane is
active. Dedicated persona workers are allowed through when their environment identifies them as workers.

It also enforces epic boundaries for story-start commands. If a command such as `bmad-create-story`, `create-story`, or
`dispatch-story` targets Epic N+1, the hook requires Epic N Process Judge to be `PASS` first. The target epic can be
provided with `ACEF_TARGET_EPIC`, `ACEF_EPIC_NUMBER`, `BMAD_EPIC_NUMBER`, `--epic N`, or story names such as `E2-1`.

It also enforces the ACEF step-ledger-before-tool-use rule for phase/story commands. Before running commands such as
`acef-adapter`, `map-codebase`, `bmad-create-story`, `bmad-dev-story`, `bmad-code-review`, `verify-patch`,
`test-review`, or `process-judge`, the delivery ledger must already contain that command/step with `IN PROGRESS`.

For implementation writes, it also enforces the first P1 conformance gate before worker bypass: the repo needs a
readable `docs/ai/pattern-registry.json`, the delivery ledger must cite a reuse/golden-neighbor probe from the
registry, and any do-not-copy entry mentioned in the ledger must be explicitly avoided or rejected.

## Activation

The hook is active when the current repo or one of its ancestors contains one of:

- `.acef-lane`
- `.acef-lightweight-lane`
- `.acef-bmad-lane`
- `.bmad`
- `_bmad`
- `_bmad-output`

The hook allows BMAD installation/runtime paths such as `.bmad`, `_bmad`, and `.claude/skills/bmad-*`.

## Plugin Install

Install or enable this directory as a Claude Code plugin. The plugin uses `${CLAUDE_PLUGIN_ROOT}`, so it does not
depend on a local username or checkout path.

## Direct Installer

For users who clone ACEF and do not use plugin installation:

```sh
scripts/install-acef-bmad-guard
```

That copies the hook to `~/.claude/hooks/acef-bmad-hard-wall.mjs` and merges the `PreToolUse` hook into
`~/.claude/settings.json`.

Restart Claude Code after installation. Hooks are loaded at session start.

## Worker Bypass

Dedicated BMAD/persona workers must expose one of these environment markers:

- `ACEF_BMAD_WORKER=1`
- `ACEF_ROLE` containing a specific worker/persona role such as `pm-worker`, `ux-worker`, `architect-worker`,
  `test-author`, `tester`, `developer`, `dev-story`, `code-reviewer`, `verify-patch`, `test-reviewer`,
  `process-judge`, or `documentation-maintainer`
- `CLAUDE_AGENT_NAME`, `CLAUDE_SUBAGENT_NAME`, or `AGENT_NAME` containing one of those role markers

Names containing `conductor`, `dispatcher`, `orchestrator`, or `coordinator` are never treated as implementation
workers.

If a real BMAD worker is blocked, fix the worker identity marker. Do not disable the hard wall for the dispatcher or
conductor.

## Epic Boundary Evidence

The hook accepts a prior epic gate when one of the standard artifacts contains `Epic N Process Judge` and
`Verdict: PASS` or `Status: PASS`, for example:

- `docs/ai/ACEF_EPIC_N_PROCESS_JUDGE.md`
- `docs/ai/epic-N-process-judge.md`
- `_bmad-output/epic-N-process-judge.md`
- a delivery ledger under `docs/ai/` or `_bmad-output/`

## Step Ledger Evidence

Before phase/story commands run, the hook searches `docs/ai/` and `_bmad-output/` for a delivery-ledger entry that
mentions the command and has `IN PROGRESS`, `STARTED`, or `PASS`. Missing evidence denies the command with a reminder
to start the ledger row first.

## P1 Conformance Evidence

Before source/test/package writes in an active ACEF/BMAD lane, the hook searches delivery ledgers under `docs/ai/` and
`_bmad-output/`. It denies the write when:

- `docs/ai/pattern-registry.json` is missing or unreadable;
- no reuse-before-create / golden-neighbor evidence exists;
- the reuse evidence does not cite a registry probe term or golden-neighbor path;
- a do-not-copy entry is mentioned without an explicit avoided/rejected context.
