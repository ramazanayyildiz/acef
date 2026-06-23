# ACEF Context Retrieval Actor Run

Repo: /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-story52-dev-experiment
Story: 5.2
Role: developer
Task type: dev
Mode: baseline

## Objective

Perform this task using only the provided experiment context. This is an ACEF context-retrieval experiment, not a delivery gate.

## Hard Rules

- Do not read the full delivery ledger unless the mode is `baseline` and the ledger is listed.
- Do not perform broad `rg`, `cat`, or directory-wide source reading.
- Do not touch files outside the stated task unless required to inspect the named context files.
- Keep the final answer short and include the metric values needed by the recording command.
- If the context is insufficient, report `result=invalid` and name the missing evidence rather than guessing.

## Task Fixture

```markdown
# Context Retrieval Experiment Task: Dev Slice

task_type: dev
story: fixture-story
role: developer

## Goal

Implement a small, well-scoped ACEF story slice from failing tests and bounded context.

## Required Precondition

A dev-slice experiment is valid only when the actor starts from a clean isolated worktree at the real pre-dev point:

- the story ATDD/failing tests already exist;
- the focused story test is red for the expected missing implementation;
- the implementation commit for that story is not present in the worktree;
- the prompt names the base ref, failing test command, and allowed implementation paths.

If any of these are missing, record `result=invalid` instead of pretending a post-implementation tree measures developer
quality.

## Worker Input Contract

- Read the failing-test summary and target files named by the context bundle.
- Do not read unrelated epic history.
- Do not patch tests unless the story phase explicitly authorizes a test correction.
- Keep output short; write detailed evidence to the run artifact.

## Known Failure Classes

- Framework-fighting code that satisfies tests but breaks real runtime behavior.
- Story-scope leakage into a future story.
- Broad refactor unrelated to the current failing tests.
- Hidden dependency on generated build artifacts or local-only state.

## Success Signal

The focused test goes green without wrong-scope changes, stale-story leakage, or hollow green behavior.
```

## Dev-Slice Precondition Evidence

Base ref: 136c516
Focused red command: php artisan test tests/Feature/Story52ReferencesAwardsTest.php --compact

Allowed implementation paths:
- app/Twill/Capsules/References/**
- app/Twill/Capsules/Awards/**
- bootstrap/providers.php
- config/twill.php
- routes/web.php
- resources/views/pages/reference-list.blade.php
- resources/views/pages/award-list.blade.php

The actor must verify this precondition before implementation. If the base ref, red command, or allowed paths are
missing or contradicted by repo state, return `result=invalid` and do not edit implementation files.

## Experiment Context

Mode `baseline` permits the controlled broad context source list below.
Read only these files plus the fixture; do not perform broad repo search.

- _bmad-output/implementation-artifacts/5-2-atdd-references-awards.md
- docs/ai/ACEF_detaysoft-cms_DELIVERY_AUDIT.md
- docs/ai/epic-5-context-pack.md
- docs/ai/pattern-registry.json

## Required Final Report

Return these fields:

```text
result=<pass|fail|invalid>
tests_passed=<true|false>
input_tokens=<number-or-null>
cached_input_tokens=<number-or-null>
output_tokens=<number-or-null>
cost=<number-or-null>
runner_type=<external-agent|subagent|main-codex-self-run|manual>
known_findings_recalled=<n>
review_findings_count=<n>
false_positive_count=<n>
retry_count=<n>
stale_story_leak=<true|false>
wrong_scope_touch=<true|false>
short_summary=<one paragraph>
```

## Recording Command

After the actor report is reviewed, save it to a text file and record the row with:

```bash
/Users/ramazanayyildiz/CODE/acef/scripts/acef-context-record-actor-report \
  --repo '/Users/ramazanayyildiz/CODE/OPA/detaysoft2026-story52-dev-experiment' \
  --story '5.2' \
  --role 'developer' \
  --task-type 'dev' \
  --mode 'baseline' \
  --fixture '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/tasks/dev-slice.md' \
  --output '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/runs/detaysoft-5-2-dev-actor-runs-2026-06-23.jsonl' \
  --report <actor-report.txt>
```
