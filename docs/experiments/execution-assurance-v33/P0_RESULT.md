# Execution Assurance v3.3 P0 Result

Final result: **FAIL**. Capability maturity remains **`enforced`**, not `proven`.

This result is immutable. Any repair must use a separately bound successor manifest; it must not rewrite the v3.3
manifest, pilot row, blind judgment, or derived verdict.

## Frozen outcome

- Attempt: `P0-candidate-v33`
- Framework: `d339a61908ec091762318f7e63d5d953e09b240d`
- Automated result: FAIL
- Blind product judgment: FAIL
- Product done: false
- Promotion eligible: false
- Scope violations: 0
- Test weakening: false
- Active delivery: 2,507.1 seconds
- Actor invocations: 12 (11 fresh actors plus one Developer repair follow-up)
- Aggregate input tokens: 11,858,949
- Tool calls: 228

The blind Judge found one HIGH: Story 3 legacy-alias cleanup was not implemented. It found no Critical, no scope
violation, and no test weakening.

## Story outcome

1. **Story 1 — product green, process invalid.** ATDD, Development, Code Review, and Patch Assurance ran. Patch
   Assurance correctly caught rewritten pre-existing assertions, and a bounded test-only repair resolved that finding.
   Deterministic close still rejected the story because the original red manifest was recorded before its test-only
   commit, so the manifest's repository binding was irreparably stale.
2. **Story 2 — product green, phase receipt invalid.** The corrected ATDD contract required resolver `once()` and Gate
   evaluation once, and Development turned the focused oracle green. The Developer's final line used
   `ACTOR_RESULT: PASS` instead of the exact `ACTOR_RESULT=PASS`; the phase was quarantined because a completed actor
   cannot receive an infrastructure retry.
3. **Story 3 — not executed.** It depends on Story 2 and was dependency-quarantined. This is the blind Judge's HIGH
   product gap.
4. **Story 4 — product green, reviewer receipts invalid.** ATDD covered the controller, job, and ingress service; the
   three-path production patch passed 4 tests and 5 assertions. Both reviewers reported PASS, but their completion
   payload paths differed from the report paths actually written on disk. The mechanical contract forbids retrying an
   invalid completion payload, so no story gate was accepted.

Because no valid epic close was reachable, the conductor correctly skipped the one broad integration command and Epic
Process Judge. The automated oracle therefore also reports incomplete story timing, zero broad-suite invocations, and
the missing mandatory actor rows caused by quarantine.

## Wait and cost result

The v3.3 wait split disproved the old interpretation of harness wait as idle overhead:

- Total wait: 1,496.9 seconds (59.71%)
- Productive delegated execution during wait: 1,492.1 seconds (59.51%)
- Coordination-idle wait: 4.8 seconds (0.19%)

Against the also-incomplete v3.2 P0, v3.3 used 32.0% less active time, 50.5% fewer aggregate input tokens, 26.2%
fewer tool calls, and three fewer invocations. These are useful cost observations, not a speed-success claim, because
neither run completed the original outcome. Child input fell from 10,186,175 to 4,319,241 tokens; the remaining major
context cost is the conductor.

## Required successor repairs

Before another scored candidate is frozen:

1. Make red-evidence creation atomic and order-safe: the test-only commit must exist before the evidence manifest is
   bound, and ATDD acceptance must reject stale commit/tree metadata immediately instead of waiting for story close.
2. Stop treating a hand-written final prose token as the authoritative actor result. Persist the typed result through a
   tool-generated receipt; final prose may report it but must not be able to invalidate an otherwise completed phase by
   punctuation alone.
3. Make `review-completion` emit the canonical report path/hash/tree payload directly from the written artifact and have
   the harness consume that receipt, rather than asking reviewers to copy path fields into prose.
4. Diagnose the oracle's additional S1 reviewer trace failures (`unsafe or unobservable shell mutation` and completion
   command attribution) before changing policy. Do not waive or suppress them without a transcript-backed parser test.
5. Keep the v3.3 context and wait improvements: bounded compiled prompts, reference validation, productive/idle wait
   separation, dependency quarantine, affected-only re-review, and the existing hard ceilings all behaved as intended.
