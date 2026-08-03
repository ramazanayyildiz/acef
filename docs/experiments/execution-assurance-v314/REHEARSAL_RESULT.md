# Execution Assurance v3.14 rehearsal result

Status: **immutable non-scored FAIL; capability remains `enforced`.**

`REHEARSAL-v314` was the one attempt authorized by the separately committed rehearsal manifest. It ran against exact
candidate commit `e1e40a84cbcbcf54c7bf40640a387dc00eeef66c`. Clean preflight passed, all six Stage 0 traps passed, and the
complete 30-entrypoint repository suite had already passed in 264 seconds. The immutable attempt row is
`docs/experiments/execution-assurance-v314/runs/rehearsal.jsonl`.

## Result

- Automated oracle: **FAIL**
- Process oracle: **FAIL**
- Product done: **false**
- Blind Judge: **not launched** (`pending`)
- Active delivery: **4,068.3 seconds**
- Actor invocations: **24**, including three Developer follow-ups, zero infrastructure retries, and two S1 repair cycles
- Story delivery: S1 1,511.7s, S2 418.2s, S3 525.8s, S4 1,141.2s
- Harness wait: 2,398.8s (58.96%); delegated execution 2,390.0s (58.75%); coordination idle 8.8s (0.22%)
- Team cost: 31,098,108 input tokens, 166,738 output tokens, and 565 tool calls
- Frozen integration command: **exit 0**; three authz benchmarks, two webhook benchmarks, and 39 platform-authz tests

The candidate proved its story-scope and close-sequencing repairs. All four stories opened under `scopeUnit: story`;
the V3.13 epic-scope leak did not recur. Stories 2 and 3 closed at deterministic cycle 0, and every observed next-story
transition followed a committed prior-story close package. Canonical report creation also worked on the successful
reviewers. The terminal Epic Process Judge persisted a fail-closed `REPLAN` after Story 4 could not obtain a valid gate.

The attempt still failed for four measured reasons:

1. The reviewer interface required canonical base64 finding objects but gave reviewers no single-command way to create
   them. S1 Code Review used an unapproved helper and invoked `review-result` twice after its first severity was rejected.
   Both S4 reviewers used the obsolete `--findings-base64` shape and omitted `status=OPEN`; their one-shot commands were
   correctly rejected. S2 Code Review also ran an unallowlisted ad-hoc `php -r` semantic check.
2. The S1 repair receipt bound the Developer repair commit, while deterministic close required `receipt.postCommit` to
   equal the later review-transition HEAD. The conductor generated an extra Developer follow-up/receipt to bridge that
   control-only commit. The transcript oracle correctly rejected the unbound extra work.
3. The frozen integration command really exited 0, but the conductor returned only `r.output` from its tool wrapper.
   The child-session receipt therefore contained test text without an explicit `exit_code`, so lifecycle evidence could
   not prove success. Block-aware decoding was correct but insufficient without a typed exit field.
4. Story 4 contained a genuine product-evidence failure: the additive ATDD methods were defined in sibling classes that
   PHPUnit did not discover from the frozen filename. Both independent reviewers found the same HIGH issue. This is not
   an ACEF false positive and must remain a product-done stop.

## Decision

V3.14 is not promotable and does not change maturity. A successor may simplify the reviewer finding CLI, bind repair
receipts to the final application tree across control-only review transitions, require a typed lifecycle exit receipt,
and align reviewer prompt vocabulary with the transcript allowlist. It must not weaken the Story 4 discovery finding or
rewrite this consumed attempt.
