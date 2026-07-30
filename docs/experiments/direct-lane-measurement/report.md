# ACEF Direct Lane Measurement v1

Generated: 2026-07-30T12:08:34.411Z

## Decision

The preregistered direct-lane proof threshold did not fully pass. Keep the capability at `enforced` and use the failed thresholds to refine the lane.

## Scope

- 30 total external-agent runs; 24 direct-eligible comparison runs; 6 promotion-trap runs.
- Real repositories: Browser RTS and Detaysoft CMS, executed only in disposable clones.
- Lanes: baseline, direct, lightweight. Clients: Codex and OpenCode.

## Data Quality Review

- Raw scoring: 23 PASS, 7 FAIL, 0 invalid.
- Oracle-reviewed scoring: 27 PASS, 3 FAIL, 0 invalid.
- 7 row(s) received documented analytical reclassification without changing the raw JSONL.
- The Detaysoft locale behavioral test passed for baseline and lightweight, but the preregistered exact `setLocale('tr')` string check rejected the valid config-driven implementation. Those four rows are reviewed as product PASS.
- Direct process failures remain FAIL even when product behavior passed: false promotion and missed provider promotion are workflow failures.
- Token accounting differs by client. Primary token/runtime thresholds therefore use the preregistered median of paired task/client percentage deltas, not a median that mixes client token scales.

## Eligible-Task Results

| Lane | Runs | Pass | Escaped defects | Scope violations | Median input | Median seconds | Median tool calls | Context misses |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 8 | 8/8 | 0 | 0 | 88348 | 36.2 | 5 | 1 |
| direct | 8 | 6/8 | 0 | 0 | 327434.5 | 114.6 | 28 | 2 |
| lightweight | 8 | 8/8 | 0 | 0 | 83565 | 29.6 | 6.5 | 0 |

## Client Diagnostics

| Client | Lane | Pass | Median input | Median seconds | Median tool calls |
| --- | --- | --- | --- | --- | --- |
| codex | baseline | 4/4 | 160534 | 37.8 | 4.5 |
| codex | direct | 3/4 | 755603 | 115.2 | 18 |
| codex | lightweight | 4/4 | 186112 | 42.8 | 5.5 |
| opencode | baseline | 4/4 | 28310.5 | 31.1 | 7 |
| opencode | direct | 3/4 | 47188.5 | 103.9 | 30.5 |
| opencode | lightweight | 4/4 | 36132 | 25.2 | 6.5 |

## Direct Deltas

- Paired median input reduction versus baseline (8 pairs): -190%
- Paired median runtime overhead versus baseline (8 pairs): +175.1%
- Paired median runtime improvement versus lightweight (8 pairs): -203.3%
- Direct contract closeouts: 6/8
- Correct provider promotions: 1/2
- Direct context-miss rate: 25%

## Oracle-Valid Sensitivity

This excludes only `detaysoft-unprefixed-turkish-default-boundary` and leaves 18 eligible runs.

| Lane | Runs | Pass | Median input | Median seconds | Median tool calls |
| --- | --- | --- | --- | --- | --- |
| baseline | 6 | 6/6 | 89739.5 | 36.2 | 5 |
| direct | 6 | 6/6 | 320920.5 | 99.4 | 24.5 |
| lightweight | 6 | 6/6 | 76357 | 28.5 | 5.5 |

- Direct input delta versus baseline: +190%
- Direct runtime delta versus baseline: +175.1%
- Direct runtime delta versus lightweight: +249.1%

## Preregistered Thresholds

| Threshold | Verdict |
| --- | --- |
| exactly_30_valid_runs | PASS |
| quality_non_inferior | FAIL |
| direct_contract_100pct | FAIL |
| promotion_accuracy_100pct | FAIL |
| scope_violations_zero | PASS |
| context_miss_below_10pct | FAIL |
| input_reduction_at_least_25pct | FAIL |
| runtime_overhead_at_most_30pct | FAIL |
| faster_than_lightweight | FAIL |

## Evidence

- Raw rows: `runs/results.jsonl`
- Unadjusted generated report: `report-raw.md`
- Unadjusted machine summary: `summary-raw.json`
- Machine summary: `summary.json`
- Preregistered design: `DESIGN.md`
- Data-quality review: `DATA_QUALITY_REVIEW.md`
- Raw transcripts remain outside Git; each row records transcript and verification hashes.
