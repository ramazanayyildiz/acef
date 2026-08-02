# Execution Assurance v3.2 P0 Result

The preregistered `P0-candidate-v32` attempt is an immutable **FAIL**. It is diagnostic evidence, not a promoted
result.

## Outcome

- Automated oracle: FAIL
- Process oracle: FAIL
- Product oracle command: FAIL (`verificationExitCode=2`)
- Product done: false
- Blind product judgment: FAIL
- Scope violations: 0
- Actor invocations: 15/25
- Active delivery: 3,685.5 seconds
- Input tokens: 23,934,551
- Tool calls: 309
- Harness wait: 2,121.2 seconds / 57.56% (limit: 38%)

Story 1 reached a green product result and its final Code Review and Patch Assurance verdicts were PASS. Its
deterministic close nevertheless remained `REVISE` because `atddTestOnlyRed=false`. The production call in the
legitimate `Platform\Authz` namespaced test was not recognized by the authenticity check. Two bounded repair cycles
could not satisfy authenticity and exact red-to-green source continuity simultaneously, so the story was correctly
quarantined without a third repair.

Story 2 exposed an ATDD contract defect: its double-traversal test required the resolver to run twice while the frozen
benchmark and acceptance criterion required authorization to run once. Development returned `REVISE` without a
production commit. Story 2 was quarantined and dependent Story 3 did not run. Story 4 produced a valid red test, but
Development did not produce either required production change and returned without a closable story result.

The single final integration command was invoked once and exited `2` in its first authz segment. Resolver fail-closed
passed; middleware idempotency and legacy alias cleanup failed, so the webhook and package-suite segments were not
reached. Consequently, the measured broad-suite count was `0/1`, lifecycle timestamps were incomplete, and the run
remained blocked rather than complete.

The blinded Judge was admitted successfully, proving that v3.2 fixed the v3.1 `testPaths` packet-validation defect.
With the treatment and transcript withheld, it independently returned FAIL with three HIGH findings: middleware
idempotency was not implemented, legacy aliases remained in all frozen route surfaces, and neither webhook production
fix was implemented. It found no scope violation or test weakening.

## Disposition

V3.2 remains `enforced`, not `proven`. Its append-only pilot, judgment, and derived verdict records must not be
rewritten. Before another scored candidate, fix and test the framework-level ATDD authenticity rule for namespaced
production calls, correct the frozen Story 2 ATDD contract, and ensure Story 4 Development can distinguish the allowed
job classifier change from the read-only neighboring ingress service. The 57.56% harness-wait share also requires an
explicit speed intervention; raising budgets again would not establish the intended cost improvement.
