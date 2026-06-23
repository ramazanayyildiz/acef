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
- The first baseline ATDD row derived a behavior-first red-test slice from the broad context. It is recorded with
  `tests_passed=false` because ATDD should be red on a pre-implementation tree; it did not mutate the active Detaysoft app.
  The second baseline ATDD row repeated the same behavior-first mapping, so the baseline ATDD cell is now complete.
- Both files-mode ATDD rows derived the core AC tests with ~95.7% returned-context reduction, but recall is lower than
  baseline because the detailed real-runtime smoke and negative-leak guard text was not present in the bounded bundle.
- Both context-mode ATDD rows are recorded as `result=fail`: they returned ~98.6% less context, but repeatedly omitted
  the detailed testing requirements and previous-story intelligence needed to avoid weak ATDD. This mirrors the
  context-mode reviewer failure pattern.
- The first baseline dev row is recorded as `result=invalid` and does **not** count toward actor coverage: the detached
  Detaysoft worktree is already post-Story-4.1, and the prompt does not provide a clean pre-implementation base ref plus
  failing-test state. A real dev-slice experiment needs an isolated worktree checked out at the red-test point, or a
  deliberately small unfinished fixture. Recording it as a pass would overstate evidence.
- Candidate replacement for real dev measurement: Detaysoft Story 5.2 has a usable commit cut-line (`2f8f570` adds
  `tests/Feature/Story52ReferencesAwardsTest.php`, `136c516` records dev scope, `fbd54f4` lands implementation). A valid
  dev A/B/C run should use an isolated worktree at the red-test/dev-scope point and keep the active implementation branch
  untouched.
- Story 5.2 dev setup is now prepared as that replacement: isolated worktree
  `/Users/ramazanayyildiz/CODE/OPA/detaysoft2026-story52-dev-experiment` at `136c516`, Composer dependencies installed,
  `.env` + SQLite test DB initialized locally, and `php artisan test tests/Feature/Story52ReferencesAwardsTest.php
  --compact` confirmed the expected RED state (8 failed, 33 assertions). Dev-only prompts live under
  `prompts/story-5-2-dev/`; the dev-only manifest expects 6 rows.
- Story 5.2 dev baseline run 1 is now recorded from the isolated worktree. It produced a real green implementation
  (`php artisan test tests/Feature/Story52ReferencesAwardsTest.php --compact` = 8 passed / 202 assertions), touched only
  the bounded References/Awards slice, and is recorded with wrapper-observed Codex usage (`input_tokens=153606`). This is
  useful baseline evidence, not an adoption signal: the dev-only manifest is still 1/6 rows, with files and context-mode
  dev runs missing.
- Story 5.2 dev files-mode run 1 is now recorded from the same isolated worktree. It also produced a green focused suite
  (8 passed / 202 assertions), but is correctly recorded as `result=fail` because it touched out-of-scope logo-grid block
  files (`app/View/Components/Twill/Blocks/Logos.php`, `resources/views/components/sections/logo-grid.blade.php`) while
  trying to complete the integration. The run returned 96.6% fewer context bytes (`7,226` vs `243,595`) but wrapper-observed
  actor input tokens only dropped from `153606` to `126331` (~17.8%), below the 25% adoption threshold, and safety failed
  with `wrong_scope_touch=true`. This is the clearest evidence so far that returned-byte reduction is not the same thing as
  end-to-end token or delivery-quality improvement.
- Story 5.2 dev files-mode run 2 repeated the same prompt from the reset isolated worktree and succeeded within the allowed
  path set. It used `122779` actor input tokens, got the focused suite green, and reported `retry_count=3`. This makes the
  files-mode result mixed rather than simply bad: it can complete the slice with lower token use than baseline, but the
  2-run cell still has one safety leak and relatively high retry variance.
- Story 5.2 dev context-mode run 1 is also recorded. It returned the smallest context bundle (`3,355` bytes, 98.4%
  reduction) and stayed inside the allowed path set while getting the focused suite green (8 passed / 202 assertions), but
  wrapper-observed actor input tokens increased to `189593` (~23.4% higher than baseline). The actor had to read the
  focused test, partial capsule files, route/config files, component views, and Twill vendor internals, then recover from a
  patch-context miss and style fixes. This is a successful implementation run, but it argues against making Context Mode a
  default dev context from current evidence: tiny retrieval can push cost into extra tool reads, retries, and transcript
  chatter.
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

Expected interpretation for actor rows: not adoptable yet; coverage is `12/18 actor rows` even if the file has 13 total
rows, because the first dev-baseline attempt is invalid and excluded from actor coverage. Current evidence shows
context-mode recall failures in both review and ATDD, plus lower ATDD recall for files mode.

Story 5.2 dev replacement command:

```bash
scripts/acef-context-experiment-report \
  --input docs/experiments/context-retrieval/runs/detaysoft-5-2-dev-actor-runs-2026-06-23.jsonl \
  --manifest docs/experiments/context-retrieval/manifests/detaysoft-5-2-dev-6-run-2026-06-23.json
```

Expected interpretation for Story 5.2 dev rows: not adoptable until the 6-row dev-only manifest is complete. Current
coverage is 4/6. The baseline row is `actor+token` evidence and passes; files mode now has one safe pass and one safety
failure, with lower actor tokens but no clean safety record; the context-mode row passes safety but uses more actor input
tokens than baseline despite the smallest returned context.
