# ACEF Context Retrieval Actor Run

Repo: /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment
Story: 4.1
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

## Experiment Context

Mode `baseline` permits the controlled broad context source list below.
Read only these files plus the fixture; do not perform broad repo search.

- _bmad-output/implementation-artifacts/4-1-blogs-blogcategories-capsules.md
- docs/ai/ACEF_detaysoft-cms_DELIVERY_AUDIT.md
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
known_findings_recalled=<n>
review_findings_count=<n>
false_positive_count=<n>
retry_count=<n>
stale_story_leak=<true|false>
wrong_scope_touch=<true|false>
short_summary=<one paragraph>
```

## Recording Command

After the actor report is reviewed, record the row with:

```bash
/Users/ramazanayyildiz/CODE/acef/scripts/acef-context-experiment \
  --repo '/Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment' \
  --story '4.1' \
  --role 'developer' \
  --task-type 'dev' \
  --mode 'baseline' \
  --fixture '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/tasks/dev-slice.md' \
  --output '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl' \
  --result <pass|fail|invalid> \
  --tests-passed <true|false> \
  --input-tokens <number-or-null> \
  --cached-input-tokens <number-or-null> \
  --output-tokens <number-or-null> \
  --cost <number-or-null> \
  --known-findings-recalled <n> \
  --review-findings-count <n> \
  --false-positive-count <n> \
  --retry-count <n> \
  --stale-story-leak <true|false> \
  --wrong-scope-touch <true|false>
```
