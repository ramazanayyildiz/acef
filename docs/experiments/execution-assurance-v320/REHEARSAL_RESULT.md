# Execution Assurance v3.20 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v320` attempt stopped after 587 seconds. It must not be replayed.

The attempt confirmed the V3.19 successor repairs. Exact bootstrap completed without option probing, Story 1 ATDD
completed, and the ATDD-to-Development transition atomically rebound both active-run phase and typed worker scope to
the canonical Developer identity. The Developer then implemented the product fix and reached a focused green of 16
tests and 58 assertions.

The run still failed closed before typed green evidence. The Developer actor record did not exist before dispatch and
the child received an underspecified registration command, so the state writer rejected it with missing required
options. The Developer correctly returned terminal REVISE instead of probing command variants or fabricating evidence.
The successor repair moves this responsibility out of the model: the deterministic supervisor compiles the exact
canonical registration command, and the conductor executes it once before spawning the same actor ID.

## Measurements

| Measure | Result |
|---|---:|
| Active duration | 587.0 s |
| Story 1 partial delivery | 445.4 s |
| Actor invocations | 2 |
| Total input tokens | 2,020,294 |
| Cached input tokens | 1,858,304 |
| Output tokens | 20,814 |
| Model cycles | 37 |
| Tool calls | 58 |
| Conductor input tokens | 973,460 |
| Conductor tool calls | 23 |

## Successor repair basis

1. Development dispatch must include one exact, supervisor-compiled registration command for the canonical Developer
   ID, session, story, phase, model, and effort.
2. The conductor must execute that command once before spawn; the Developer must never create, probe, replace, or
   rewrite its actor record.
3. Exact bootstrap, atomic phase/scope rebinding, behavioral-only ATDD, one Developer session, independent reviewers,
   and the mechanical circuit breaker remain unchanged.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
