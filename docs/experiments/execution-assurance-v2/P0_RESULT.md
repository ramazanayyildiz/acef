# P0 Full + Guarded Pair Result

Status: **NO-GO for rollout; paired attempt completed without an eligible successful pair.**

The frozen Full + Guarded task produced one scored immutable result per preregistered treatment. Both automated oracles
failed. The legacy artifact nevertheless completed the product outcome according to the treatment-blinded Judge, while
the candidate stopped fail-closed during Story 2 and left three product outcomes unfinished. The capability therefore
remains `enforced`, not `proven` or `installed`.

| Metric | Legacy | Candidate |
| --- | ---: | ---: |
| Automated oracle | FAIL | FAIL |
| Blind Judge | PASS | FAIL |
| Product outcome complete | yes | no |
| Active delivery | 26,151.6 s (7:15:51.6) | 4,632.8 s (1:17:12.8) |
| First required actor | 1,989.5 s | 984.8 s |
| Parent-level spawn attempts | 42 | 8 |
| Durable actor records | 41 | 8 |
| Tool calls | 848 | 153 |
| Input tokens | 103,900,996 | 21,889,678 |
| Cached input tokens | 101,839,872 | 21,515,776 |
| Output tokens | 260,442 | 74,403 |
| Changed paths | 182 | 54 |
| Broad-suite markers | 5 | 1 |
| Final active-run state | blocked | blocked |
| Blind Critical / High / Medium | 0 / 0 / 0 | 0 / 3 / 0 |

The candidate consumed 82.3% less active time, 78.9% less input, 71.4% less output, and 82.0% fewer tool calls. These
are fail-fast cost differences, not delivery-speed improvements: the candidate did not finish the original outcome.

## Legacy result

The blind Judge independently verified all four product outcomes with no Critical, High, or Medium finding and no test
weakening. The automated oracle still failed because the run ended `blocked` at epic test quality, no required epic
Process Judge ran, two retry actor records had phase mismatches, a child/parent result mismatch remained, and one changed
test path violated the frozen harness scope.

The run reproduced the reported cost pathology. It made 42 parent-level spawn attempts against a 25-actor minimum; 41
actors started and one attempt hit the thread limit. Nested actors are not represented by that count. Readiness, NFR,
manual-QA stabilization, trace, coverage automation, remediation, statistics, epic test review, and correct-course work
accumulated after the product changes. The final lane rationale reported that its mandatory quality threshold was
mathematically unreachable under the immutable benchmark and no-retry constraints.

## Candidate result

The candidate reached its first required actor in about half the legacy startup time and avoided the legacy readiness/NFR
fan-out. Story 1 completed after one allowed verify-patch retry. Story 2 ATDD then returned `REVISE`: the focused red test
was valid, but AC3 and AC4 did not have complete protected benchmark coverage. Because ATDD cannot retry, the run correctly
stopped at `blocked-no-atdd-retry` rather than pretending to complete.

The blind Judge confirmed that only the resolver outcome was present. Once-only middleware behavior, route-alias cleanup,
and both webhook corrections were still missing, producing three High findings. The early stop bounded waste, but it did
not preserve the legacy arm's product result.

## Decision

Do not roll out or promote the candidate architecture from this pair. Preserve the useful properties demonstrated here:
typed execution/assurance separation, bounded role retries, earlier required-actor start, and fail-closed stopping. Before
another scored pair:

1. Independently adjudicate the Story 2 ATDD `REVISE` against the frozen acceptance contract. Do not assume the gate's
   self-report proves incomplete coverage.
2. If that decision is valid, specify one bounded, test-artifact-only correction by a fresh actor that receives only the
   `REVISE` findings. It must not replay development or the full lifecycle; a second incomplete result becomes
   `REPLAN/SPLIT`.
3. Adjudicate the duplicate-lifecycle detector on this candidate transcript and land either a detector or runner fix
   before rerunning. The attempt had only eight parent spawns but still emitted duplicate lifecycle markers.
4. Keep the epic Process Judge mandatory, but prevent optional trace, coverage, statistics, and test-quality workflows
   from creating work items or new closeout chains. Mandatory thresholds and their denominator must be frozen before
   closeout so closeout cannot make its own gate unreachable.
5. Replace whole-run halt with dependency-aware quarantine: an incomplete story still makes the product gate fail, but it
   must not prevent independent stories from producing evidence. Preserve whole-run halt when a declared dependency edge
   or shared safety invariant makes continuation unsafe.
6. Enforce frozen scope before every write and exact actor phase/result identity before accepting evidence, rather than
   discovering those violations only in the final oracle.
7. Preregister the changed candidate and rerun the complete matched P0 pair. Do not compare a repaired candidate only
   against this failed legacy row as if it were the original frozen pair.

The next P0 pair should use binary acceptance gates:

- Product: all four stories reach typed `complete`; the blind product Judge returns PASS with zero Critical or High.
- Process: the automated oracle passes with one epic Process Judge, zero scope/phase/result violations, zero genuine
  duplicate lifecycles, and zero closeout-created mandatory chains.
- Budget: per story, at most one verify-patch retry and one test-artifact-only ATDD correction; a second failure becomes
  `REPLAN/SPLIT` and the pair fails promotion.
- Reachability: every mandatory threshold remains satisfiable against the frozen work inventory at every gate evaluation.
- Cost, evaluated only after the Product gate passes: active time at most 13,100 seconds, input at most 52 million tokens,
  and tool calls at most 424. A fail-fast attempt cannot win on cost.

Passing this pair would authorize the next controlled canary stage, not default rollout or `installed` maturity. Existing
installation/canary and multi-project observation requirements still apply.

This single pair is strong diagnostic evidence, not proof of speed superiority, preserved quality, or installation
readiness.
