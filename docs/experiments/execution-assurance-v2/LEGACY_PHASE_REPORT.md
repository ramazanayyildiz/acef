# Legacy ACEF Full-BMAD phase timing report

## Executive summary

The 7:15:51.6 legacy run was not dominated by implementation. Active-turn reconstruction attributes 224.9 minutes
(51.6% of elapsed time) to story assurance and epic closeout, 116.4 minutes (26.7%) to conductor-only work, 52.0 minutes
(11.9%) to readiness and risk design, and 42.7 minutes (9.8%) to the ATDD-plus-development build path. Dedicated
development actor sessions account for 13.2 minutes (3.0%).

The practical conclusion is that the legacy cost pathology came from lifecycle multiplication and orchestration, not
from slow code generation. This result is suitable for process decisions with caveats; it is not a precise CPU-time or
human-attention accounting.

## Wall-time allocation

| Stage | Allocated wall time | Share |
|---|---:|---:|
| Story assurance | 118.1 min | 27.1% |
| Conductor-only / orchestration | 116.4 min | 26.7% |
| Epic closeout | 106.9 min | 24.5% |
| Readiness and risk design | 52.0 min | 11.9% |
| Build path (ATDD + development) | 42.7 min | 9.8% |

Story assurance combines code review, verify-patch, story test review, and story Process Judge. Epic closeout combines
manual-QA stabilization, traceability, coverage automation/remediation, epic test review, and correct-course. Conductor-
only time is any wall-clock segment in which no parent-visible worker was active; it can include inspection, debugging,
commits, ledger maintenance, validation, and dispatch coordination.

## Largest control categories

| Category | Actors | Allocated wall time | Share |
|---|---:|---:|---:|
| Story test review | 4 | 41.0 min | 9.4% |
| Traceability | 2 | 36.1 min | 8.3% |
| Epic test review | 1 | 34.9 min | 8.0% |
| Code review | 5 | 34.5 min | 7.9% |
| ATDD | 4 | 29.5 min | 6.8% |
| Process Judge | 4 | 27.9 min | 6.4% |
| Readiness | 5 | 23.2 min | 5.3% |
| NFR | 1 | 18.8 min | 4.3% |
| Coverage automation | 2 | 16.5 min | 3.8% |
| Verify-patch | 5 | 14.6 min | 3.4% |
| Development | 4 | 13.2 min | 3.0% |

The first required contracted actor started 33.2 minutes after the run began. Six explicitly named retry actors consumed
40.7 overlap-adjusted minutes. Including the first attempts they superseded, identifiable retry cycles consumed 72.7
minutes, or 16.7% of elapsed time. This is a conservative figure because not every remediation loop used a `retry`
suffix.

## Story assurance detail

Corrected active worker time for story assurance is 118.1 minutes:

| Control | Active time | Share of assurance | What it did |
|---|---:|---:|---|
| Story test review | 41.0 min | 34.7% | Scored determinism, isolation, maintainability, and performance; reran selected tests and wrote a test-quality artifact. |
| Code review | 34.5 min | 29.2% | Gathered the diff/spec, ran Blind Hunter, Edge Case Hunter, and Acceptance Auditor layers when enabled, triaged findings, and wrote review state. |
| Process Judge | 27.9 min | 23.7% | Audited 14 process questions, actor/persona separation, phase order, artifacts, evidence hashes, focused evidence, and product-done status; persisted a typed gate. |
| Verify patch | 14.6 min | 12.4% | Re-read patch claims and diffs, answered fix/regression/reproducer questions, reran focused evidence, and wrote a verifier artifact. |

Story totals were S1 24.5 minutes, S2 34.7 minutes, S3 22.4 minutes, and S4 36.4 minutes. S2 was expensive because
both code review and verify-patch returned `REVISE` once and used retry actors. S4 was expensive because code review,
verify-patch, and test review launched nested specialists. Across the 18 parent-visible assurance turns, the child logs
contain 500 tool dispatches and 14 nested reviewer spawn attempts.

There is a concrete misuse in the legacy orchestration: `bmad-verify-patch` says it runs after an applied review patch,
but it ran for S1, S3, and S4 even though their code-review verdicts were clean PASS. Those three runs used 9.5 minutes,
65% of all verify-patch time, without a review patch to verify.

## Test execution versus test-workflow overhead

The tests themselves were not a major cost in this legacy pilot. Across 70 recursively discovered parent and nested
sessions, 30 recognizable test execution batches consumed 84.0 seconds of recorded tool wall time. The longest single
batch was 11.0 seconds. Product-done audit commands added 3.7 seconds.

Within story assurance, recognizable test execution consumed only 24.2 seconds: code review 6.6 seconds, story test
review 6.4 seconds, Process Judge 6.1 seconds, and verify-patch 5.1 seconds. Story test review therefore spent nearly all
of its 41.0 minutes loading workflow material, reading tests/evidence, coordinating specialist reviewers, scoring quality,
and writing artifacts—not waiting for the test runner.

This command-level measurement is conservative: it recognizes direct PHPUnit/Pest-style commands and ACEF evidence-run
wrappers visible in the session records. A test hidden behind an unrecognized custom script would not be counted. It is
still sufficient to rule out test process runtime as the main explanation for this seven-hour pilot.

## Measurement method

The reconstruction reads the immutable `P0-legacy` pilot row, then follows its recorded parent session. All 41
`sub_agent_activity: started` records were matched to a child session. The parent made 42 spawn attempts; one did not
become a durable child. Active work is measured as 42 `task_started` → `task_complete` turns. One child session was reused
later for a coverage-assessment turn; idle time between those turns is excluded. The analysis divides each wall-clock
segment equally across concurrently active turns. Simply summing active turns produces 322.2 minutes and overstates
actor-covered wall time by 2.6 minutes; active-turn union time is 319.6 minutes. Maximum observed concurrency is two.

The official active-delivery value is 26,151.6 seconds. The recorded start/end timestamps span 26,162.7 seconds, an
11.1-second difference. Allocations use the timestamp span because it is the boundary available for interval
reconstruction; the report retains the official value as the headline total.

## Data-quality assessment

Status: **share with caveats**.

- All 41 parent-visible child sessions and 42 active task turns were available; none were missing.
- One session was reused for a later coverage task. Measuring whole session spans would incorrectly attribute 31.1 extra
  minutes to story test review, so the corrected analysis uses active task turns.
- Nested actors are not represented in the parent timeline, matching the limitation already stated in the frozen result.
- The legacy row has no `harnessWait` field, so harness delay cannot be separated from conductor-only time.
- It has no product-done timestamp, so time after functional completion cannot be calculated exactly.
- The pilot row still says product incomplete and blind Judge pending, while the frozen result reports product complete
  and blind Judge PASS. Timing uses the machine row; final outcome status should use `P0_RESULT.md`.
- Actor span is elapsed session time, not CPU utilization or continuous model generation. A long actor may include waits
  for parent interaction or external commands.

## Process implications

The evidence supports four targeted changes:

1. Collapse code review, patch verification, story test review, and story Process Judge into one assurance lifecycle with
   escalation only when a typed finding requires it.
2. Run trace, coverage, epic test review, and correct-course as one closeout batch, not as serial independent workflows.
3. Persist explicit phase start/end, active-vs-wait, test-command duration, and product-done markers in future measurements.
4. Treat 26.7% conductor-only time as an optimization target: reduce broad rereads, ledger rewrites, commit-hook mismatch,
   and repeated dispatch/status polling.

## Reproducibility

Run:

```bash
python3 docs/experiments/execution-assurance-v2/legacy_phase_analysis.py
```

The companion notebook is `docs/experiments/execution-assurance-v2/LEGACY_PHASE_ANALYSIS.ipynb`. It executes the same
standard-library reconstruction and presents stage, category, actor, retry, and quality tables.

Sources:

- `docs/experiments/execution-assurance-v2/runs/pilot.jsonl`
- `docs/experiments/execution-assurance-v2/P0_RESULT.md`
- The parent and child Codex session files referenced by the immutable pilot row
