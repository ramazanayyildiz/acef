# Execution Assurance v3.19 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v319` attempt stopped after 977.3 seconds. It must not be replayed.

Exact bootstrap succeeded on the first active-run and worker-scope commands, eliminating the V3.18 option-probing
sequence. Story 1 reached deterministic PASS, but its first Developer call correctly refused to write because the
typed worker scope still named the ATDD actor after the phase changed to Development. The conductor later recovered
the application and evidence binding, which made the attempt process-tainted even though the Story 1 product gate
passed.

Story 2 then produced a genuine product red and also an independent closure-capture failure in the new test. The ATDD
actor returned terminal REVISE after red evidence had already been bound. The supervisor saw the repository red record
and proposed Development, while the transcript/harness required ATDD adjudication. The conductor stopped on that
state disagreement before product writes for Story 2.

## Measurements

| Measure | Result |
|---|---:|
| Active duration | 977.3 s |
| Story 1 delivery | 535.4 s |
| Story 2 partial ATDD | 205.5 s |
| Actor invocations | 5 |
| Total input tokens | 3,951,967 |
| Cached input tokens | 3,693,568 |
| Output tokens | 34,794 |
| Model cycles | 52 |
| Tool calls | 99 |
| Conductor input tokens | 2,526,784 |
| Conductor tool calls | 52 |

## Successor repair basis

1. ATDD-to-Development phase transition must atomically update both active-run phase and worker-scope phase/workerId.
2. The ATDD actor must run focused verification directly before the immutable evidence command and repair every test
   harness defect inside the same turn; only product-caused failures may be bound as red evidence.
3. Exact bootstrap, behavioral-only ATDD, session topology, and the mechanical-gate circuit breaker remain unchanged.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
