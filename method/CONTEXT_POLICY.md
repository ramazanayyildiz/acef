# ACEF Context Policy

ACEF optimizes context by reducing repeated raw reads, not by treating retrieval output as evidence.

## Default Policy

The default worker context is:

- `docs/ai/ACEF_CURRENT_CONTEXT.md`
- the active Epic Context Pack
- story-specific acceptance criteria
- a work-shape-specific pattern slice
- target files or summarized diffs needed for the current phase
- short failure summaries instead of raw test dumps

Do not give every worker the full delivery ledger, full planning folder, full pattern registry, or unbounded `git diff`.

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

