# Execution Assurance v3.13 rehearsal result

Status: **immutable non-scored FAIL; capability remains `enforced`.**

`REHEARSAL-v313` was the one attempt authorized by the separately committed rehearsal manifest. It ran against exact
candidate commit `b899c980d7204132a8d08bdea0d0bdeace279fad`. Clean preflight passed, all six Stage 0 traps passed, and the
complete 30-entrypoint repository suite had already passed in 266 seconds. The immutable attempt row is
`docs/experiments/execution-assurance-v313/runs/rehearsal.jsonl`.

## Result

- Automated oracle: **FAIL**
- Process oracle: **FAIL**
- Product done: **false**
- Blind Judge: **not launched** (`pending`)
- Active delivery: **2,802.8 seconds**
- Actor invocations: **17/17**, with zero follow-ups, zero infrastructure retries, and zero repair cycles
- Story delivery: S1 461.6s, S2 479.6s, S3 472.7s, S4 646.3s
- Harness wait: 1,421.1s (50.70%); delegated execution 1,413.6s (50.44%); coordination idle 7.5s (0.27%)
- Team cost: 15,500,327 input tokens, 106,532 output tokens, and 298 tool calls
- Frozen integration command: **exit 0**; three authz benchmarks, two webhook benchmarks, and 39 platform-authz tests

The candidate proved its three narrow state-writer repairs. Story 3 and Story 4 Patch Assurance both used the canonical
`review-result` operation, produced correctly named top-level-bound report and actor records atomically, and closed at
deterministic cycle 0. The prior nested-binding and mistyped-path failures cannot be reproduced through that API. The
Epic Process Judge also persisted a typed `REPLAN` gate with Story 1 marked `MISSING` and Stories 2–4 marked `PASS`, so
terminal non-PASS closeout no longer deadlocks on missing story gates. Exact shell-wrapper command attribution improved
from 0/1 to 1/1 and the frozen command exited 0.

The attempt still failed closed for four reasons:

1. The conductor opened Story 1's concurrent reviewers under generic active phase `review`. `review-result` accepted
   only recognized v3 reviewer phases, so both one-shot completions were mechanically rejected. The conductor correctly
   did not retry or synthesize reviewer records, leaving Story 1 without a deterministic gate.
2. Several otherwise successful reviewers batched read-only inspection with `awk`, pipelines, or `&&`. Their report and
   actor handoffs were correct, but the transcript safety oracle classified those calls as unsafe or unobservable. The
   compiled prompt's separate-read instruction was not strong enough to make this reliable.
3. The lifecycle integration parser recognized the exact wrapped command and its timestamps, but serialized the
   `custom_tool_call_output` block array instead of using the existing block-aware output decoder. The escaped
   `"exit_code":0` therefore produced a false-negative successful-receipt check even though the command exited 0 in the
   immutable transcript.
4. The pre-commit hook evaluated the staged Story 2 close package as though it belonged to the already active Story 3.
   The exact immutable Story 2 layer required a one-commit hook bypass; the next Story 3 transition used the normal hook.

## Decision

V3.13 is not promotable and does not change maturity. The next candidate must make generic shared review an admitted
canonical phase, decode structured tool output before exit-receipt validation, make reviewer inspection mechanically
single-command/read-only rather than relying on prose, and bind staged close-package validation to the gate's own story
instead of the subsequently active story. The v3.13 attempt is not replayed.
