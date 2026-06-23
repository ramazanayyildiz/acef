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

## Mini Pilot: Detaysoft Story 4.1

Evidence: `runs/detaysoft-4-1-mini-pilot-2026-06-23.jsonl`
Manifest: `manifests/detaysoft-4-1-18-run-2026-06-23.json`
Actor prompt package: `prompts/{review,atdd,dev}-{baseline,files,context-mode}.md`
Actor run evidence: `runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl`

Shape:

```text
3 task types × 3 modes × 2 runs = 18 rows
task types: review, atdd, dev
story: 4.1
repo: detached Detaysoft worktree at commit d4ada65
```

Median context-surface results:

| Task | Mode | Provider | Median source bytes | Median returned bytes | Median reduction |
|---|---|---|---:|---:|---:|
| review | baseline | baseline | 274,966 | 274,966 | 0.0% |
| review | files | files | 241,300 | 10,416 | 95.7% |
| review | context-mode | context-mode | 241,300 | 3,497 | 98.6% |
| atdd | baseline | baseline | 274,899 | 274,899 | 0.0% |
| atdd | files | files | 241,233 | 10,349 | 95.7% |
| atdd | context-mode | context-mode | 241,233 | 3,373 | 98.6% |
| dev | baseline | baseline | 274,959 | 274,959 | 0.0% |
| dev | files | files | 241,293 | 10,409 | 95.7% |
| dev | context-mode | context-mode | 241,293 | 3,506 | 98.5% |

Interpretation:

- The mini pilot confirms large context-surface reduction across all three worker shapes.
- It still does not prove billing reduction because token/cost fields are null.
- It still does not prove worker quality because no live actor performed the tasks in this pilot; quality fields remain
  placeholders.
- Next evidence step is actor-based A/B/C runs that fill finding recall, retries, false positives, and task result.
- The first actor prompt matrix is ready for Story 4.1 review, ATDD, and dev tasks across all three modes, but no actor
  result rows have been recorded yet.
- The manifest now makes actor coverage explicit. Current actor coverage is 6/18. The review task is fully populated:
  baseline and files review rows recalled the known Story 4.1 control findings without stale-story leakage or wrong-scope
  touch. Files mode preserved recall while returning ~95.7% less context for this reviewer fixture.
- Both context-mode review rows are intentionally recorded as `result=fail`: they returned ~98.6% less context but lost
  the explicit review-chain/process-drift findings, dropping average known-finding recall from 4 to 2. That repeatable
  quality regression means Context Mode should not become the default reviewer context from this evidence.
- All current rows are marked `runner_type=main-codex-self-run`, so they are useful progress but weaker than fresh
  external/subagent runs. The experiment is still intentionally not adoptable.

Summarizer verdict:

```bash
scripts/acef-context-experiment-report \
  --input docs/experiments/context-retrieval/runs/detaysoft-4-1-mini-pilot-2026-06-23.jsonl \
  --manifest docs/experiments/context-retrieval/manifests/detaysoft-4-1-18-run-2026-06-23.json
```

Expected interpretation for the mini-pilot file: not adoptable yet; evidence level is `context-surface`.

Actor coverage command:

```bash
scripts/acef-context-experiment-report \
  --input docs/experiments/context-retrieval/runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl \
  --manifest docs/experiments/context-retrieval/manifests/detaysoft-4-1-18-run-2026-06-23.json
```

Expected interpretation for actor rows: not adoptable yet; coverage is `6/18 actor rows`, with two context-mode review
recall failures.
