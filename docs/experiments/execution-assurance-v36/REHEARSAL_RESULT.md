# Execution Assurance v3.6 rehearsal result

Status: **FAIL — immutable non-scored rehearsal; capability remains `enforced`.**

`REHEARSAL-v36` exercised framework commit `2b4f0b8ff496a2a7b9ccf278fca68c1fd76e1b7f` against the unchanged four-story
v3.5 product contract. The clean preflight passed task binding, collaboration canary, environment probe, and all four
baseline-red/reference-green validations. Stage 0 passed 6/6. The executable rehearsal then stopped during Story 1
reviewer completion and did not run a blind Judge because the manifest was explicitly non-scored and non-promotable.

## Measured result

- Active delivery: 930.9 seconds (15 minutes 30.9 seconds).
- Actor invocations: 7; infrastructure retries: 0; repair cycles: 0.
- Input tokens: 5,090,440; tool calls: 125.
- Harness wait: 305.7s (32.84%), all productive delegated execution; true coordination idle: 0.0s.
- Story timestamps: S1 739.9s, S2 ATDD 191.3s, and S4 blocked return 737.9s. The epic was incomplete.
- Broad lifecycle suite: 0/1; Epic Process Judge: 0/1; deterministic PASS story gates: 0.
- Scope violations: 0; frozen expectation failures: 0.

## What the v3.6 repair proved

The exact v3.5 deterministic-close anomaly is now covered by a repository regression: a clean editable test-only ATDD
commit may use a different immutable verification test for the recognized red/green runner command. The complete
repository suite passed 30/30.

The real rehearsal also passed the repaired portion of the chain. Story 1 produced a clean test-only red commit, the
frozen `BenchmarkAuthzResolverFailClosedTest` failed, Development made a production-only commit, and the exact command
then passed. The old requirement that runner output name the editable ATDD file did not block evidence acceptance.

All other protections remained active: arbitrary interpreter self-failure, missing failure output, production-bearing
red trees, dirty evidence, invalid ancestry, unauthentic assertions, and weakened original test content remain rejected.

## Rehearsal failure

The two concurrent Story 1 reviewers wrote semantically understandable but schema-invalid reports:

- Code Review returned `REVISE` with `severity: high` and `status: open` rather than `HIGH`/`OPEN`. It found a real
  authorization concern: a trailing operator such as `system_admin_access &` could still be normalized instead of
  failing closed.
- Patch Assurance returned `PASS` with informational `info`/`closed` findings, while the report schema permits only
  `LOW|MEDIUM|HIGH|CRITICAL` and `OPEN|RESOLVED|DISMISSED|DEFERRED`.

Both one-shot `review-completion` commands correctly rejected the invalid reports. Because the reviewer contract makes
that command final and prohibits a correction call, neither actor could canonicalize harmless enum spelling. The
conductor therefore recorded no valid reviewer completion, blocked the active run, and the S4 ATDD actor returned the
global mechanical stop. This was fail-closed and fast, but it prevented the legitimate HIGH from entering the bounded
Developer-repair lifecycle.

## Decision

V3.6 is not a scored candidate and is not promoted. A separately frozen successor should:

1. canonicalize case-only reviewer enum aliases at the trusted report parser boundary (`high` → `HIGH`, `open` →
   `OPEN`);
2. define non-blocking informational completion vocabulary deterministically (`info`/`closed` → `LOW`/`RESOLVED`) or
   require PASS reports to omit informational findings;
3. preserve strict rejection for unknown severities/statuses, HIGH dismissal, empty REVISE findings, malformed report
   identity, and report/hash/tree mismatch;
4. prove that the Story 1 HIGH reaches one bounded Developer repair rather than global REPLAN; and
5. repeat a non-scored four-story rehearsal before any new scored manifest is frozen.

Capability maturity remains `enforced`, not `proven` or `installed`.
