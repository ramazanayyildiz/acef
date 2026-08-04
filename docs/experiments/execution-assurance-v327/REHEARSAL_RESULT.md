# Execution Assurance v3.27 Rehearsal Result

## Verdict

`REHEARSAL-v327` is an immutable **FAIL** and is not promotable. The calibrated role matrix was applied successfully:
the conductor and Code Review used `gpt-5.6-sol/medium`, while ATDD, Development, and Patch Assurance used
`gpt-5.6-sol/high`. Story 1 and Story 2 closed PASS. Story 3 reached product green and independent PASS/PASS reviews,
then the deterministic close gate correctly rejected it because Development had changed the ATDD test after the red
evidence commit. Story 4 and Epic closeout did not run.

The outer attempt exited normally in 2,282.7 active seconds rather than timing out. No valid blind external judgment
was persisted. Its first launch exposed that the external Judge inherited the medium conductor runtime instead of the
high terminal-Judge runtime; the launch was aborted before ingestion and the successor harness now resolves it from
`actorRuntimeProfiles.epic-process-judge`.

## Calibration and routing result

- V327-CAL-001 completed in about four minutes, below its 15-minute cap.
- Both blinded candidates found the held-out empty-operand HIGH. The blind comparison scored medium 30/30 and high
  28/30, with no unsupported HIGH findings.
- The live rehearsal provided additional, non-calibration evidence: medium Code Review found Story 1's real
  `malformed-empty-operands` HIGH; the original high-effort Developer repaired it, and fresh medium/high reviewers
  passed the repaired tree.
- The qualification remains narrow: OpenAI Code Review may use medium. No other semantic role and no other provider is
  downgraded without its own frozen calibration.

## Timing and cost

- Active delivery: **2,282.7 seconds (38m 02.7s)**, below the 45-minute target and 60-minute hard cap, but incomplete.
- Completed story timing: s1 728.2s, s2 538.4s, and s3 597.4s. Story 4 has no completion timestamp.
- Aggregate input: 13,082,632 tokens; 12,422,144 cached. Aggregate output: 77,552 tokens.
- Model cycles: 126/220. Tool calls: 231/320. Broad suites: 0 because deterministic story close stopped first.
- Conductor: 9,209,373 input tokens, 8,948,224 cached, 32,234 output, and 120 tool calls.
- Harness wait was 1,014.2s, but 1,006.4s was productive delegated execution and only 7.8s was coordination idle. The
  current 300s/5% wait budget therefore measures delegation as waste and needs to budget coordination idle separately.
- Fifteen invocations were observed before the stop. Developer repair reused Story 1's original session; it did not
  create another fresh Development context.

## What passed

- Stage 0 passed all six deterministic traps. Preflight passed the clean-runner, policy hash, collaboration canary,
  reference validation, and environment checks.
- Story 1 produced authentic red/green evidence, one medium Code Review HIGH, one bounded repair in the original
  Developer session, and fresh retry PASS/PASS reviews.
- Story 2 produced authentic red/green evidence and first-cycle PASS/PASS reviews.
- Story 3's product patch and focused tests passed, and both semantic reviewers passed the final tree.
- No scope violation, infrastructure retry, broad-suite duplication, or conductor resume occurred.
- The frozen role receipts show Code Review at medium and ATDD, Development, and Patch Assurance at high.

## Why the run stopped

The Story 3 editable regression expected Laravel's gathered middleware to expand the `web` group into a literal
alias. Development discovered that semantic harness defect after red evidence had already been bound and repaired the
test in its allowed scope. That made the final test tree differ from the test-only red commit. The deterministic close
gate computed `atddTestOnlyRed=false` and returned REVISE with the note that red evidence must bind a failing test-only
commit preceding Development. The supervisor then issued mechanical REPLAN; the conductor correctly did not override
the gate, start Story 4, run the broad suite, or launch Epic closeout.

This is the desired integrity refusal, but it exposes a missing recovery transition. ACEF has an ATDD correction
artifact schema, yet capsule-supervisor-v1 does not currently provide a bounded post-red semantic-harness correction
path that invalidates the old red evidence, returns ownership to an independent ATDD actor, produces a replacement
test-only red commit, and only then resumes Development. That transition must be implemented and adversarially tested
before another full rehearsal.

## Successor work

1. Add a fail-closed `atdd-correction` supervisor transition for a Development-discovered semantic harness defect.
   It must preserve the frozen test envelope and test identity, supersede rather than mutate the old red evidence, use
   an independent ATDD correction actor, and forbid production changes until replacement red evidence is bound.
2. Route the external blind Judge through the terminal `epic-process-judge` runtime. This repair is now covered by the
   focused experiment regression test; legacy manifests without actor profiles retain their prior fallback.
3. Split wait telemetry into productive delegated execution and actual coordination idle. Budget the latter; report
   the former as useful parallel work rather than a speed failure.
4. Freeze a successor rehearsal. Do not retry or relabel V3.27.

Capability maturity remains `enforced`, not `proven` or installed in target repositories.
