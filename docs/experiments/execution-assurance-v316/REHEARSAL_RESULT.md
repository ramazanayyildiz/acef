# Execution Assurance v3.16 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v316` attempt ran sleep-inhibited from a clean runner and stopped after 879.8 seconds.
No replay of this immutable attempt is permitted.

## What worked

- Story 1 completed ATDD, one story-bound Developer session, Code Review, and Patch Assurance.
- Both reviewers consumed independent hash-bound capsules and returned PASS.
- The story implementation and focused discovery evidence were green.
- Story 1 delivery took 422.6 seconds.
- Four semantic actor invocations were observed, with no unexpected actors, follow-ups, or infrastructure retries.
- Coordination idle time was 2.9 seconds; subagent scheduling was not the dominant delay.

## Why it failed

The deterministic gate initially computed PASS, but the close commit failed its hooks because the supervisor command
did not carry the worker-scope surface evidence and the ledger still demanded a second hand-maintained Lean Evidence
section. The active-run bootstrap had also omitted its worker-scope pointer. The conductor then created a control-only
metadata commit after review; that changed HEAD, made the immutable capsules stale, and attempted to regenerate them
under the same IDs. Capsule replacement correctly failed closed.

This was a supervisor/conductor contract defect, not a production-code or reviewer-quality failure.

## Cost and topology evidence

| Measure | Result |
|---|---:|
| Active duration | 879.8 s |
| Story 1 delivery | 422.6 s |
| Total model cycles | 33 |
| Total tool calls | 111 |
| Total input tokens | 5,122,195 |
| Cached input tokens | 4,918,784 |
| Output tokens | 32,406 |
| Conductor input tokens | 4,321,062 |
| Child input tokens | 801,133 |
| Conductor tool calls | 82 |
| Child tool calls | 29 |

The conductor consumed about 84% of input tokens and 74% of tool calls. This validates the original diagnosis: repeated
fresh semantic workers were not the only cost; model-driven lifecycle interpretation was the larger remaining source
of context reprocessing in this failed attempt.

## Successor repair basis

The successor must, without replaying V3.16:

1. compile every derived surface into the exact deterministic gate command;
2. use the validated story-close package as the Lean evidence view instead of duplicating it in prose;
3. preserve active-run context and worker-scope pointers across same-run state updates;
4. emit an exact model-free post-PASS story transition command; and
5. block the next ATDD dispatch until its typed worker scope names the new frozen story.

Raw attempt telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
