# P0-r2 candidate result — complete but not product-done

Date: 2026-08-02
Attempt run: `P0-candidate-r2-r2` (attempt `P0-candidate-r2`, ordinal 2)
Treatment: Full + Guarded, six-actor-v2 candidate
Result: `FAIL`

The clean, non-steered rerun completed its conductor process and final integration command, but did not satisfy the
process/product oracle. This is a valid candidate result, not a harness invalidation.

## Measured result

| Metric | Value |
|---|---:|
| Active delivery | 11,174.7 seconds (186.2 minutes) |
| Input tokens | 56,626,888 |
| Cached input tokens | 55,935,488 |
| Output tokens | 127,544 |
| Tool calls | 437 |
| Expected / observed actors | 25 / 26 |
| Final integration verification | exit 0 |
| Product done | false |
| Automated oracle | failed |
| Blind judge | pending; not promotion-eligible |
| Duplicate lifecycle | false |
| Closeout-created mandatory chains | 0 |
| Scope violations | 0 |

Story 4's production patch was only two changed lines and its development phase took roughly four minutes. It remained
open because Patch/Test Review found that the explicit dispatch-error branch lacked an executable regression test, while
the frozen story envelope did not allow tests to be added and the review phase was non-retryable. The candidate correctly
quarantined the story instead of converting a green integration command into `PASS`.

## Cost attribution

ACEF value and ACEF cost must be separated from runtime/harness faults:

- ACEF/BMAD contract cost: mandatory six actors per story, no-op Verify-Patch actors, repeated review closeout, and a
  mandatory Process Judge for every story produced fixed work even when implementation was tiny.
- Contract design failure: the story envelope froze production paths without reserving a non-protected test envelope,
  making the review finding unrepairable inside the same story.
- Harness/agent cost (not ACEF policy): one worker attempted internal helper fan-out and was fenced; another used wrong
  `mark-story-done` command names/arguments; state reconstruction and collaboration waits added runtime.
- Source-readiness cost: project rules conflicted with the story on route aliases and protected benchmark locations.
  These conflicts were discovered late instead of being dispositioned once during readiness.
- Evidence-model cost: historical ATDD-red evidence was treated as stale after implementation, and heavy pre-commit
  demanded a final Process-Judge gate before bootstrap commits could exist. This caused refresh churn and hook bypasses.

## Decision

The six-actor-v2 candidate is not promoted. Its result motivates a separate, immutable v3 treatment: four mandatory
actors per story, parallel Code Review/Patch Assurance, deterministic story close, conditional Story Process Judge,
one close package, explicit test envelope, bounded repair, one epic integration suite, and separate harness-wait budgets.
The legacy arm is not rerun; the next measurement compares the new candidate against preserved historical evidence.
