# ACEF Direct Lane Measurement v1

Generated: 2026-07-30T12:03:39.914Z

## Decision

The preregistered direct-lane proof threshold did not fully pass. Keep the capability at `enforced` and use the failed thresholds to refine the lane.

## Scope

- 30 total external-agent runs; 24 direct-eligible comparison runs; 6 promotion-trap runs.
- Real repositories: Browser RTS and Detaysoft CMS, executed only in disposable clones.
- Lanes: baseline, direct, lightweight. Clients: Codex and OpenCode.

## Eligible-Task Results

| Lane | Runs | Pass | Escaped defects | Scope violations | Median input | Median seconds | Median tool calls | Context misses |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 8 | 6/8 | 2 | 0 | 88348 | 36.2 | 5 | 1 |
| direct | 8 | 6/8 | 2 | 0 | 327434.5 | 114.55 | 28 | 2 |
| lightweight | 8 | 6/8 | 2 | 0 | 83565 | 29.549999999999997 | 6.5 | 0 |

## Direct Deltas

- Input reduction versus baseline: -270.6%
- Runtime overhead versus baseline: +216.4%
- Runtime improvement versus lightweight: -287.6%
- Direct contract closeouts: 6/8
- Correct provider promotions: 1/2
- Direct context-miss rate: 25%

## Preregistered Thresholds

| Threshold | Verdict |
| --- | --- |
| exactly_30_valid_runs | PASS |
| quality_non_inferior | PASS |
| direct_contract_100pct | FAIL |
| promotion_accuracy_100pct | FAIL |
| scope_violations_zero | PASS |
| context_miss_below_10pct | FAIL |
| input_reduction_at_least_25pct | FAIL |
| runtime_overhead_at_most_30pct | FAIL |
| faster_than_lightweight | FAIL |

## Evidence

- Raw rows: `runs/results.jsonl`
- Machine summary: `summary.json`
- Preregistered design: `DESIGN.md`
- Raw transcripts remain outside Git; each row records transcript and verification hashes.
