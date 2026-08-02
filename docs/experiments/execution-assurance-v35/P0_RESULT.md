# Execution Assurance v3.5 P0 result

Status: **FAIL — immutable automated and blind result; capability remains `enforced`.**

Attempt `P0-candidate-v35` tested framework commit `82b5f73a42e7a135f007217c99b7909a5b67989f` against the
unchanged four-story product contract. Stage 0 passed 6/6 and the clean scored preflight passed task binding,
collaboration canary, environment probe, all four baseline-red/reference-green validations, and the hidden generic
MySQL compatibility oracle. The timed attempt stopped at the first story's deterministic close gate. The automated
oracle returned FAIL, and the separately launched artifact-only blind Judge independently returned FAIL with three
HIGH findings for the three undelivered stories.

## Measured result

- Active delivery: 1,160.1 seconds (19 minutes 20.1 seconds); below the 9,000-second target and 10,800-second ceiling.
- Story 1 delivery: 583.9 seconds; below its 2,100-second target. Stories 2–4 did not start, so the complete-epic speed
  target was not met even though the partial attempt was fast.
- Actor invocations: 4/17 base actors; infrastructure retries: 0; repair cycles: 0.
- Input tokens: 5,476,737/50,000,000; tool calls: 130/520.
- Harness wait: 313.8s (27.05% of active time), split into 312.2s of productive delegated execution and 1.6s of true
  coordination idle (0.14%). The attempt was not delayed by an idle conductor.
- Broad lifecycle suite: 0/1 and Epic Process Judge: 0/1 because Story 1 did not reach deterministic PASS close.
- Scope violations: 0; frozen expectation failures: 0; test weakening: false.

Relative to the incomplete v3.4 attempt, v3.5 used 76.6% less active time, 88.3% fewer input tokens, 80.4% fewer tool
calls, and 81.8% fewer actor invocations. Those reductions are fail-fast measurements, not a successful end-to-end
speed improvement: v3.5 delivered only one implementation and closed no story.

## What v3.5 repaired

The measured v3.4 failure modes did not recur before the stop:

1. The ATDD actor produced a clean test-only commit and genuine focused red evidence.
2. Development produced a production-only commit and the same focused command turned green.
3. Code Review and Patch Assurance inspected the same implementation tree concurrently and both returned typed PASS
   on their first invocation.
4. No reviewer retry, repair cycle, infrastructure retry, scope escape, test weakening, duplicate reviewer pass, or
   generic-MySQL product regression occurred.

These are material enforced improvements, but the scored candidate did not complete the epic and cannot be promoted.

## Automated failure

Story 1 implemented the required fail-closed route-expression behavior and passed both independent reviewers. Its
deterministic close gate nevertheless returned `REVISE` with no unresolved reviewer findings. The mechanical note was:

> focused benchmark red output cannot identify the changed frozen unit-test path; ATDD red evidence must bind a
> failing test-only commit that precedes Development

The repository evidence shows that the ATDD actor did create test-only commit `0173abd7`, followed by production-only
Development commit `65fa5c14`, and the accepted red/green evidence was bound to that sequence. The remaining defect is
therefore in deterministic close's red-evidence/path-continuity interpretation, not in the product implementation or
review result. Because a failed mechanical check cannot be overridden, the run correctly stopped rather than inventing
a PASS or proceeding with a tainted close.

That early stop left the active run incomplete, produced no PASS story-close package, omitted Story 2–4 timestamps,
and prevented the exact-one broad suite and mandatory Epic Process Judge. The automated and process oracles therefore
failed and `productDone` remained false.

## Blind product failure

The artifact-only blind Judge received the frozen product contract and product diff, not the automated verdict or
process transcript. It independently returned FAIL with three HIGH findings:

- `S2_MIDDLEWARE_IDEMPOTENCY_MISSING`: the request-scoped run-once guard was not implemented.
- `S3_LEGACY_ALIAS_CLEANUP_MISSING`: the required route alias cleanup was absent; the frozen test still found 97
  aliased routes.
- `S4_WEBHOOK_INGRESS_CORRECTNESS_MISSING`: controller/job/service and webhook regression coverage were absent.

The Judge reported no scope violation and no test weakening. Its result confirms that the early mechanical stop caused
a genuinely incomplete product outcome rather than only an accounting failure.

## Decision

V3.5 is not promoted and does not authorize rollout. Its automated and blind artifacts remain immutable. A separately
prepared successor must, at minimum:

1. reproduce the Story 1 close anomaly as a deterministic repository test using the exact test-only-red then
   production-only-green commit sequence;
2. make red-evidence path continuity derive from Git ancestry and the frozen test envelope rather than requiring the
   test runner's failure text to name the changed test path;
3. preserve fail-closed behavior when the red command is not a test failure, the red commit changes production, the
   critical frozen assertions are weakened, or ancestry is invalid;
4. run a non-scored four-story preparation after the mechanical repair; and
5. freeze any new scored attempt separately, without modifying this result or reusing its run identity.

Capability maturity remains `enforced`, not `proven` or `installed`.
