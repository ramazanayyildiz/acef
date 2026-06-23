# ACEF Context Policy

ACEF optimizes context by reducing repeated raw reads, not by treating retrieval output as evidence.

## v1 Empirical Decision

The 30-run empirical validation matrix in `docs/experiments/empirical-validation/report.md` did **not** prove token
reduction from ACEF lightweight or guarded lanes. It did prove better quality/defect recall than baseline in that sample.

Therefore ACEF v1 policy is:

- keep ACEF for process integrity, actor separation, guarded scope, and repo-grounded validation;
- do not market or configure ACEF as token-saving by default;
- do not promote `acef-query`, Context Mode, SQLite, vector, graph, SCIP, Serena, or Codebase-Memory as default worker
  context infrastructure;
- keep retrieval providers experimental until a later benchmark proves lower real actor tokens/cost with no quality loss.

## Default Policy

The default worker context is:

- `docs/ai/ACEF_CURRENT_CONTEXT.md`
- the active Epic Context Pack
- story-specific acceptance criteria
- a work-shape-specific pattern slice
- target files or summarized diffs needed for the current phase
- short failure summaries instead of raw test dumps

Do not give every worker the full delivery ledger, full planning folder, full pattern registry, or unbounded `git diff`.

## Fresh Session Startup

Any new agent session should begin from the repo-local startup packet:

```bash
.acef/bin/acef-status --repo .
.acef/bin/acef-next --repo .
```

The required read order is:

1. `AGENTS.md`
2. `.acef/bin/acef-status --repo .`
3. `.acef/bin/acef-next --repo .`
4. `docs/ai/ACEF_CURRENT_CONTEXT.md`
5. the active ledger named by `acef-status`

This avoids importing hidden chat memory into a new session. `acef-status` is read-only and only reports the active run,
current story/phase, next allowed step, ledger/context paths, worker scope, and blockers. `acef-next` is read-only and
projects the active state into a small next-action contract: allowed paths, forbidden actions, required evidence, and
stop condition. Neither command advances state or replaces the ledger, evidence manifests, or Process Judge.

## Next Optimization Target

The next optimization round should stay inside this file/artifact model:

- shorter worker prompts;
- narrower target-file and diff reads;
- less repeated ledger and planning-artifact loading;
- better per-role Epic Context Packs;
- shorter failure summaries and final reports.

After these changes, rerun the empirical validation matrix and compare against
`docs/experiments/empirical-validation/runs/results.jsonl`.

## Role Profiles

| Role | Default context | Must not receive by default |
|---|---|---|
| ATDD Author | ACs, target test paths, relevant context pack sections, boundary cases | full ledger, full architecture, unrelated story artifacts |
| Developer | failing-test summary, target files, relevant pattern slice, golden-neighbor paths | full ledger, reviewer reports from other stories |
| Code Reviewer | diff summary, touched files, story artifact, tests, risk checklist | full repo search dumps, unrelated implementation artifacts |
| Verify-Patch | required review actions, touched files, regression commands | full original worker transcript |
| Test Reviewer | test quality checklist, test diff, runtime path notes, negative-path obligations | implementation narrative not tied to tests |
| Story Process Judge | story ledger slice, actor records, evidence manifests, gate checklist | full epic history unless needed for boundary check |
| Epic Process Judge | full ledger, epic evidence, FR-capability trace, runtime smoke evidence | N/A |

## Output Discipline

Worker final reports should be short and structured:

```text
result:
commit:
files:
commands:
risks:
next:
```

Long evidence belongs in artifacts or raw evidence files, not chat.

## Retrieval Providers

`acef-query --provider files` and `acef-query --provider context-mode` are experimental bounded-context helpers.
They are not ACEF defaults. A provider can become default only after actor-quality and token/cost evidence show:

- no stale-story leakage;
- no wrong-scope touch;
- no drop in blocker/high finding recall;
- no retry increase;
- lower real actor token or cost, not only lower returned bytes.

## Current Context

`ACEF_CURRENT_CONTEXT.md` is a generated projection. It is not a canonical state owner.

Rules:

- maximum 150 lines;
- one active story and phase;
- no neighbor-story sections;
- no raw test dumps;
- regenerate at phase transitions;
- validate before worker dispatch.
