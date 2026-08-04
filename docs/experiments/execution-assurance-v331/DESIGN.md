# Execution Assurance V3.31 nested correction proof

V3.31 is the only successor to the immutable V3.30 product FAIL. It retains the frozen framework commit
`f2e5b0193f1efc5b39319ad4d69b2de68813a82d`, the same middleware-idempotency scope, role matrix, 15-minute target,
and 30-minute hard cap.

The editable regression now exercises the protected behavior structurally. The outer middleware invocation delegates
to a second invocation of the same middleware from inside its next closure; that inner invocation delegates to the
final downstream handler once. `Gate::forUser()` and `Gate::allows()` are each expected once. The only controlled
initial defect is `RouteRequirementResolver::resolve('invoices.index')->twice()` instead of `once()`.

The correction actor may change only the resolver expectation from `twice()` to `once()`. It must preserve the exact
test identity, nested control flow, Gate expectations, and final-handler expectation before binding the replacement
behavioral red. The original Developer session must then continue from that replacement evidence.

Success requires exactly one correction binding, one continuation of the original Developer, accepted discovered
green evidence, concurrent Code Review and Patch Assurance, one deterministic story-close package, one integration
verification, one Epic Process Judge, and one external artifact-only blind Judge with no HIGH or CRITICAL finding.
The attempt is single-run and fail-closed. Another design failure triggers replan rather than another rehearsal.

The measured attempt is immutable. It proved the nested product contract and received an artifact-only blind-Judge
PASS, but it exposed a durable process-ordering defect. The story PASS gate was committed only after integration and
the Epic Judge, and the close commit incorrectly included the two pre-dispatch capsules. The final disposition is
`PRODUCT_PASS_PROCESS_FAIL`; see `REHEARSAL_RESULT.md`.
