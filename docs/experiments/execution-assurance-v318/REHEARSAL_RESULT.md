# Execution Assurance v3.18 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v318` attempt ran for 1,848.9 seconds. It crossed the V3.16 story-close boundary and the
V3.17 bootstrap boundary, completed three story implementations, and stopped before Story 4. It must not be replayed.

## Progress and timing

| Story | Result | Active time | Actor topology |
|---|---|---:|---|
| Resolver fail-closed | deterministic PASS, cycle 0 | 455.2 s | ATDD + one Developer + two concurrent reviewers |
| Middleware idempotency | deterministic PASS, cycle 0 | 383.1 s | ATDD + one Developer + two concurrent reviewers |
| Legacy alias cleanup | green + two reviewer PASS, deterministic REVISE | 485.2 s | ATDD + one Developer + two concurrent reviewers |
| Webhook ingress | not started | — | none |

No semantic reviewer retry was used. The original Story 3 Developer received one follow-up only after the gate anomaly
and correctly refused to fabricate a repair.

## Why Story 3 failed

The added ATDD regression read PHP route files and scanned `token_get_all()` output for a string. Production removal
and both focused tests were green; Code Review and Patch Assurance both returned PASS. The deterministic gate still
set `atddTestOnlyRed=false` because source/file/token scans are implementation-shape tests, not executable behavioral
evidence. The gate therefore returned REVISE as designed.

The conductor then spent extra calls diagnosing an immutable mechanical failure and invoked the Developer even though
both semantic reviewers had passed. The successor must forbid source-shape ATDD in the compiled contract and route
`reviewers PASS + mechanical gate FAIL` directly to REPLAN.

## Cost evidence

| Measure | Result |
|---|---:|
| Total input tokens | 10,066,976 |
| Cached input tokens | 9,585,152 |
| Output tokens | 67,332 |
| Model cycles | 114 |
| Tool calls | 211 |
| Conductor input tokens | 6,765,948 |
| Conductor tool calls | 110 |
| Child input tokens | 3,301,028 |
| Child tool calls | 101 |

The three completed story paths averaged 441 seconds each. That is materially below the historical multi-hour story
behavior, but conductor bootstrap and anomaly interpretation still consumed too much context. The successor therefore
prints exact active-run and per-story worker-scope commands and removes the mechanical-failure Developer loop.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
