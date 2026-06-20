# ACEF BMAD Guard

Portable Claude Code hook package for ACEF/BMAD lanes.

It prevents the main dispatcher/conductor from authoring BMAD artifacts or implementation code once a BMAD lane is
active. Dedicated persona workers are allowed through when their environment identifies them as workers.

## Activation

The hook is active when the current repo or one of its ancestors contains one of:

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
