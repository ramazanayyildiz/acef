# Execution Assurance v3.21 rehearsal result

Status: **FAIL (transient harness interruption, not promotable)**

The single frozen `REHEARSAL-v321` attempt stopped after 1,059.8 seconds. It must not be replayed.

The V3.20 framework repair worked. Story 1 completed its full lifecycle in 387.7 seconds: behavioral ATDD, canonical
pre-registered Developer, focused green evidence, parallel Code Review and Patch Assurance from one shared input tree,
and a deterministic PASS gate. No repair cycle or conditional Process Judge was needed.

Story 2 also completed ATDD and Development, reached 20 passing focused tests with 31 assertions, committed one shared
review input, and dispatched both independent reviewers. Code Review completed PASS. Patch Assurance consumed its
hash-bound capsule, then the root `gpt-5.6-sol/high` conductor received `Selected model is at capacity. Please try a
different model.` The parent process terminated and interrupted that child before its final review-result command.

This was not a product failure or an ACEF gate verdict. It exposed a measurement-harness gap: the outer actor finalized
any root client exit as FAIL, even when the transcript proved an exact transient capacity error and a resumable root
thread. The successor harness may resume that same root thread at most once, inside the original remaining time budget,
and records the resume in the immutable actor receipt. It does not start a fresh conductor or replay completed work.
Any child interrupted without a final answer remains subject to the existing typed zero-write infrastructure receipt
and `_infra_retry1` rule.

## Measurements

| Measure | Result |
|---|---:|
| Active duration | 1,059.8 s |
| Story 1 delivery | 387.7 s |
| Accepted actor invocations | 8 |
| Total input tokens | 1,139,166 |
| Cached input tokens | 929,280 |
| Output tokens | 14,542 |
| Model cycles | 47 |
| Tool calls | 105 |
| Repair cycles | 0 |

## Successor repair basis

1. Only the exact root-client model-capacity signature may trigger an automatic conductor resume.
2. Resume must bind the same Codex thread, clone, scored attempt, and remaining original timeout; maximum one resume.
3. The immutable receipt and result telemetry must expose every conductor resume.
4. Completed actors/stories cannot be replayed. An interrupted child uses the already frozen typed infrastructure retry
   rule, including zero-write proof and the `_infra_retry1` identity.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
