# Execution Assurance v3.24 Rehearsal Result

## Verdict

`REHEARSAL-v324` is an immutable **FAIL** and is not promotable.

The product outcome passed: all four frozen stories reached discovered green evidence, deterministic story PASS gates,
and independent Code Review plus Patch Assurance PASS. The one frozen integration command also passed all 48 tests.
The process outcome failed at epic close, so Product Done was false and the blind external Judge was not launched.

## Timing and cost

- Active delivery: **2,436.2 seconds (40m 36.2s)**; target 3,600s, hard cap 4,500s.
- Story delivery: s1 424.5s, s2 396.0s, s3 507.1s, s4 548.4s; every story stayed below 900s.
- Aggregate input: 15,088,918 tokens; 14,455,040 cached; budget 18,000,000.
- Aggregate output: 87,565 tokens; 144 model cycles; 286 tool calls.
- Conductor: 10,834,098 input tokens and 159 tool calls. It remained the dominant context/tool consumer.
- Harness wait: 1,204.4s, of which 1,194.7s was delegated actor execution and only 9.7s was coordination idle.
- Actor inventory: exactly 17 base invocations, no retries, no repair cycles, no infrastructure retries.
- Budget miss: tool calls were 286/240. Time, story time, tokens, model cycles, and actor count met their gates.

## What the run proved

- Failure-atomic ATDD discovery worked for all four stories, including the Story 3 identity that stopped v3.22.
- Each story used one ATDD identity and one Developer identity; no Developer follow-up or replacement session was needed.
- Reviewer roles remained independent and bound to role-specific hash capsules.
- Every story used focused tests; the broad integration command ran exactly once at epic close.
- The product verification passed: authz benchmark 3/3, webhook benchmark 6/6, and platform-authz 39/39.

## Why the run failed

1. `ACEF_ACTIVE_RUN.json` reached epic close while `ACEF_CURRENT_CONTEXT.md` still named s1/ATDD. The one-shot Epic
   Process Judge correctly returned REVISE and no terminal epic gate was written.
2. The experiment validator incorrectly required immutable ATDD/Developer prerequisites and later reviewer/gate
   artifacts to have been introduced in one commit. Runtime capsule creation necessarily requires a committed review
   snapshot first, so the real two-commit package was falsely rejected even though each close commit contained the
   exact reviewer/capsule/gate delta.
3. Story 4 Patch Assurance repeated the same read-only `capsule-show` command once. The capsule/report binding was
   still valid, but the harness treated the duplicate read as a process-integrity failure rather than measured waste.
4. The preregistered 240-tool budget was below the measured 286 calls despite all other cost gates passing.

## Successor repair

- Synchronize Current Context mechanically from typed active-run/worker-scope state on bootstrap and every transition;
  block epic dispatch behind an exact `context-sync` action when drift is detected.
- Make the supervisor own the Epic Judge registration and its exact terminal PASS/FAIL/REPLAN/BLOCKED commands.
- Validate the immutable review-input prerequisite and exact reviewer/capsule/gate close delta as two bound layers;
  retain compatibility with the older one-commit fixture.
- Require one unique capsule identity but count identical repeated `capsule-show` reads as efficiency waste, not a
  safety-integrity failure.
- Recalibrate the successor tool budget from this measured run without changing actor models, effort, or safety-role
  independence.

No v3.24 run identity will be replayed.
