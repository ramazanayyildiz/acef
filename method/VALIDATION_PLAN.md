# ACEF Validation Plan

ACEF is valuable only if it improves delivery quality without making normal work too expensive.

## Freeze

Do not add new retrieval/storage backends until the current policy is measured on real tasks.

Not admitted by default:

- vector databases;
- graph databases;
- SCIP;
- Serena;
- Codebase-Memory MCP;
- large MCP gateway stacks.

## Measurement Round

Run at least 30 real tasks:

```text
10 native or baseline agent runs
10 ACEF lightweight runs
10 ACEF guarded/full runs
```

Coverage:

- at least 3 repositories;
- at least 2 technology stacks;
- at least 2 agent clients;
- bug fix, small feature, and guarded/security-relevant work.

## Metrics

Record:

- input, cached input, and output tokens;
- cost when available;
- wall-clock time;
- extra file reads and search calls;
- retries;
- human interventions;
- review findings by severity;
- escaped defects;
- gate false positives and negatives;
- context misses;
- scope violations;
- artifact preparation time;
- implementation quality: `sound`, `questionable`, or `hollow_green`;
- context recovery: extra reads, searches, retries, recovery tokens.

## Acceptance Thresholds

ACEF can be called empirically proven for a lane only when:

- median total input token reduction is at least 25%;
- blocker/high defect escape is not worse than baseline;
- guarded-run scope violations are 0;
- context-miss retries affect fewer than 10% of runs;
- lightweight wall-clock overhead is below 30%;
- final evidence binds to the right tree/commit in 100% of runs.

## Typed-State Acceptance Matrix

Before the 30-run measurement round, each installed client must pass this deterministic matrix in an isolated clone or
worktree:

| Contract | Positive case | Required negative case |
|---|---|---|
| Actor separation | six distinct story-phase actors | duplicate or missing phase is rejected |
| Worker scope | active run, actor, story, phase, and base ref reconcile | mismatched story/actor is rejected |
| Evidence | real argv command, raw output hash, actor and Git provenance reconcile | tampered raw output is rejected |
| Gate | Process Judge PASS cites successful evidence | failed or missing evidence cannot satisfy PASS |
| Epic approval | exact human quote names and starts/approves the target epic | generic `go on`/`continue` is rejected |

Run the built-in coverage first:

```bash
node scripts/test-acef-state
node scripts/test-acef-typed-state-validator
node scripts/test-install-acef-tools
```

Then install into a disposable clone of a real ACEF project and repeat the record/validate loop. Do not write dogfood
sidecars into an active product worktree. Record the source commit, disposable path, commands, positive verdicts, and
at least one intentional negative catch in `docs/dogfood-typed-state-YYYY-MM-DD.md`.
