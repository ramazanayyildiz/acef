# ACEF Context Retrieval Actor Run

Repo: /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment
Story: 4.1
Role: reviewer
Task type: review
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
# Context Retrieval Experiment Task: Review

task_type: review
story: fixture-story
role: reviewer

## Goal

Review a completed ACEF story slice using only the context mode assigned by the experiment.

## Worker Input Contract

- Read the provided context bundle.
- Read only the changed files or diff paths named by the bundle.
- Do not read the full delivery ledger unless the experiment mode explicitly provides it.
- Return a short finding summary and quality metrics.

## Known Finding Classes

- Requirement satisfied by artifact existence instead of exercised capability.
- Runtime path diverges from isolated test path.
- Scope leakage into another story or epic.
- Framework-fighting workaround that makes tests green without real product behavior.

## Success Signal

The reviewer recalls blocker/high findings already present in the control answer key without adding broad false positives.
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

After the actor report is reviewed, save it to a text file and record the row with:

```bash
/Users/ramazanayyildiz/CODE/acef/scripts/acef-context-record-actor-report \
  --repo '/Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment' \
  --story '4.1' \
  --role 'reviewer' \
  --task-type 'review' \
  --mode 'baseline' \
  --fixture '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/tasks/review.md' \
  --output '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl' \
  --report <actor-report.txt>
```
