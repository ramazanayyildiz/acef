# Execution Assurance v3.2 Recovery Candidate

V3.2 is a separately preregistered successor to the immutable v3.1 P0 FAIL. It does not rewrite the v3.1 manifest,
run row, or result.

The candidate changes four observed mechanics:

1. Blind-judge admission treats each story's frozen `testPaths` as product artifacts alongside production
   `allowedPaths`. ACEF control/harness paths remain forbidden.
2. The `v32-empirical` profile keeps the 17-actor base lifecycle and every v3.1 time/token/tool/wait ceiling, while
   raising only the hard invocation cap from 21 to 25. The added four slots are bound to the measured missing work:
   two affected delta reviewers, the mandatory Epic Judge, and one infrastructure-retry buffer.
3. Every story's acceptance criteria are rendered explicitly in the actor prompt so ATDD and Development bind the
   same product contract before red/green work begins.
4. Readiness/reuse notes remain conductor working state. They are explicitly excluded from the formal story-close
   package, which must stage only the gate-bound actors, review reports, evidence manifests/raw artifacts, and any
   bound repair or conditional-Judge decision.

Promotion remains fail-closed: deterministic and blind product PASS, zero unresolved Critical/High findings, process
PASS, exact-one lifecycle integration verification, one Epic Process Judge, and every hard budget must pass. Until a
fresh P0 satisfies all of those gates, capability maturity remains `enforced`.
