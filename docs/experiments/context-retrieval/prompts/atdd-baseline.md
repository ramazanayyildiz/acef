# ACEF Context Retrieval Actor Run

Repo: /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment
Story: 4.1
Role: atdd
Task type: atdd
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
# Context Retrieval Experiment Task: ATDD

task_type: atdd
story: fixture-story
role: atdd

## Goal

Write acceptance tests for a narrow ACEF story from the supplied ACs and context bundle.

## Worker Input Contract

- Read the story ACs and relevant context only.
- Do not infer APIs from memory; ground on golden-neighbor paths if provided.
- Tests must exercise real runtime paths where the story requires runtime behavior.
- Do not implement production code.

## Known Failure Classes

- Tests assert fake framework APIs or introspection-only behavior.
- Tests hit the wrong URL when a redirect is the product contract.
- Tests prove a helper exists but not that the user-visible capability works.

## Success Signal

The ATDD slice is red for the right reason and maps ACs to real behavior, not merely class or method existence.
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
  --role 'atdd' \
  --task-type 'atdd' \
  --mode 'baseline' \
  --fixture '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/tasks/atdd.md' \
  --output '/Users/ramazanayyildiz/CODE/acef/docs/experiments/context-retrieval/runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl' \
  --report <actor-report.txt>
```
