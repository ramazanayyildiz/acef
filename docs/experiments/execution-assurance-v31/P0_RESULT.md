# Execution Assurance v3.1 P0 Result

The preregistered `P0-candidate-v31` attempt is an immutable **FAIL**. It is recovery evidence, not a promoted result.

## Outcome

- Automated oracle: FAIL
- Process oracle: FAIL
- Product oracle command: PASS (`verificationExitCode=0`)
- Product done: false
- Blind product judgment: not admitted; packet validation failed closed before judgment
- Scope violations: 0
- Actor invocations: 21/21
- Active delivery: 5,229.2 seconds
- Input tokens: 39,143,603
- Tool calls: 443
- Harness wait: 1,706.3 seconds / 32.63%

Story active times were 1,267.9s, 478.4s, 720.6s, and 699.2s. The first three stories reached deterministic PASS.
Story 4 reached green, then Code Review found one valid Medium defect in over-broad SQLite unique-constraint matching.
The original Developer repaired it, but that used invocation 21. Required delta Code Review, final Patch Assurance,
the single lifecycle integration command, and the mandatory Epic Process Judge could not run without exceeding the
frozen budget.

The lifecycle oracle also found that Story 1-3 close commits included auxiliary readiness/reuse reports that were not
part of their gate-bound packages. Finally, blind-judgment admission exposed a harness defect: packet validation treated
frozen story `testPaths` as non-product paths even though the packet generator correctly included them in the product
diff. The Judge therefore did not inspect or decide the product.

## Disposition

V3.1 remains `enforced`, not `proven`. Its result row at `runs/pilot.jsonl` is append-only and must not be rewritten.
A separate v3.2 candidate may fix the packet allowlist, explicitly exclude readiness notes from story-close packages,
render exact acceptance criteria, and preregister an empirically sufficient actor cap before a new P0.
