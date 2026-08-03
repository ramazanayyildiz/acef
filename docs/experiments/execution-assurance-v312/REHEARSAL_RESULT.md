# Execution Assurance v3.12 rehearsal result

Status: **immutable non-scored FAIL; capability remains `enforced`.**

`REHEARSAL-v312` was the one attempt authorized by the separately committed rehearsal manifest. It ran against exact
candidate commit `c1840b9f0427c6536ab1d463f91e39f431f8b973`. Clean preflight passed, all six Stage 0 traps passed, and the
complete 30-entrypoint repository suite had already passed in 280 seconds. The immutable attempt row is
`docs/experiments/execution-assurance-v312/runs/rehearsal.jsonl`.

## Result

- Automated oracle: **FAIL**
- Process oracle: **FAIL**
- Product done: **false**
- Blind Judge: **not launched** (`pending`)
- Active delivery: **3,830.6 seconds**
- Actor invocations: **17/17**, with zero follow-ups, zero retries, and zero repair cycles
- Story delivery: S1 619.5s, S2 595.5s, S3 799.1s, S4 776.9s
- Harness wait: 2,130.7s (55.62%); delegated execution 2,122.9s (55.42%); coordination idle 7.8s (0.20%)
- Team cost: 23,229,205 input tokens, 143,688 output tokens, and 438 tool calls

The candidate achieved its narrow repair objective. All four ATDD actors created genuine test-only red commits, and
the one literal `runtime-test` command atomically created each canonical ATDD actor plus its bound red evidence. Every
Development actor then produced a scoped green commit and evidence. Story 1 and Story 2 both completed concurrent
Code Review and Patch Assurance, atomic reviewer handoff, and a deterministic cycle-0 PASS gate without repair.

The attempt still failed closed on two later Patch Assurance handoffs:

1. Story 3 Patch Assurance wrote a PASS report with identity/input data nested under `binding` instead of the required
   top-level v3 fields. Its one `review-completion` invocation rejected the report, so no immutable reviewer actor or
   story gate was created.
2. Story 4 Patch Assurance wrote the correct top-level report, but its one completion command mistyped the canonical
   artifact path (`acef_s4-webhook...` instead of `acef_s4_webhook...`). The command exited 1, so no reviewer actor or
   story gate was created.

The conductor correctly did not retry either one-shot reviewer and quarantined both stories. It invoked the frozen
three-part integration command once and the command exited 0, covering three authz benchmarks, two webhook benchmarks,
and 39 platform-authz tests. However, collaboration attribution observed `0/1` exact lifecycle invocations because the
transcript wrapped the frozen argv inside `/bin/zsh -lc "sh -c ..."`. Therefore the successful shell result is useful
diagnostic product evidence but does not satisfy the immutable exact-argv lifecycle gate.

The independent epic Process Judge returned `REPLAN/SPLIT`. The typed gate writer correctly refused to manufacture an
epic gate while two story gates were missing. A final control-only commit for the blocked state was also rejected by
the repository guard because no epic gate existed, exposing a separate durability gap for terminal FAIL/blocked
closeout.

## Decision

V3.12 is not promotable and does not change maturity. The next candidate must eliminate free-form reviewer report and
artifact-path construction, attribute the harness-launched lifecycle command without shell-shape ambiguity, and permit
a typed terminal non-PASS closeout that cannot be confused with a PASS gate. The v3.12 attempt is not replayed.
