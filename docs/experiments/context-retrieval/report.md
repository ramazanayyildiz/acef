# ACEF Context Retrieval Experiment Report

Status: template

## Purpose

Measure whether bounded ACEF context retrieval reduces real worker context cost without lowering delivery quality.

## Compared Modes

| Mode | Meaning |
|---|---|
| `baseline` | Controlled old-style broad context: active ledger, current context, epic pack, pattern registry, and story artifacts. |
| `files` | `acef-query context --provider files`. |
| `context-mode` | `acef-query context --provider context-mode`. |

## Pilot Command Shape

```bash
scripts/acef-context-experiment \
  --repo /Users/ramazanayyildiz/CODE/OPA/detaysoft2026 \
  --story 4.1 \
  --role reviewer \
  --task-type review \
  --mode files \
  --fixture docs/experiments/context-retrieval/tasks/review.md \
  --runs 1
```

## Required Metrics

Each JSONL row records:

- context surface: `source_bytes`, `returned_bytes`, `reduction_pct`
- quality: `tests_passed`, `known_findings_recalled`, `false_positive_count`, `retry_count`
- safety: `stale_story_leak`, `wrong_scope_touch`
- cost placeholders: `input_tokens`, `cached_input_tokens`, `output_tokens`, `cost`

Token and cost fields remain `null` until a client usage export or token accounting adapter is added.

## Decision Threshold

Adopt a retrieval mode as worker default only if:

- median returned context/input token reduction is at least 25%
- stale-story leakage is 0
- wrong-scope touch is 0
- blocker/high finding recall does not drop
- retry count does not materially increase

## Current Result

No full A/B/C actor measurement has been run yet. Existing dogfood proves bounded retrieval behavior, not token billing.

Smoke run on Detaysoft Story 4.1 reviewer context, recorded in `runs/2026-06-23.jsonl`:

| Mode | Provider | Source bytes | Returned bytes | Reduction |
|---|---|---:|---:|---:|
| baseline | baseline | 272,767 | 272,767 | 0.0% |
| files | files | 239,101 | 10,416 | 95.6% |
| context-mode | context-mode | 239,101 | 3,522 | 98.5% |

This smoke validates the measurement harness and context-surface reduction only. It does not prove billing reduction or
worker quality; those require repeated actor runs with finding recall and retry metrics.
