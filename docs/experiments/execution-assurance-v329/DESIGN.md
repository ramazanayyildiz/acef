# Execution Assurance V3.29 live correction proof

V3.29 is a single-purpose successor to V3.28. It freezes candidate commit
`9b2d04418b810077aa154fe9a47f156bb363d42e` and tests the one remaining unproven behavior: a Developer detecting a
semantically defective but executable bound red before mutation, one fresh ATDD correction actor replacing it, and
the same Developer session resuming against the corrected red.

The product fixture is reduced to the independent middleware-idempotency story. The initial ATDD stimulus is
preregistered: the editable test must incorrectly expect two resolver calls while correctly expecting one Gate
authorization. The unmodified product therefore supplies a genuine red through the Gate expectation. The Developer
must identify the explicit contradiction with the frozen once-only contract before touching production or tests.
The correction actor may change only the editable test's resolver expectation from twice to once. The corrected test
must remain red until the original Developer implements the request-scoped guard.

This is a controlled mechanism proof, not evidence that ACEF should manufacture defects in normal delivery. The
experiment scorer requires exactly one typed post-red correction binding; zero or more than one fails the process
oracle even if the final product passes. The frozen base topology is four story actors plus one Epic Judge. Correction
adds one fresh ATDD actor and one follow-up invocation of the original Developer, not a replacement Developer.

The V3.27 role matrix is unchanged. Conductor and Code Review use `gpt-5.6-sol/medium`; ATDD, Development, Patch
Assurance, conditional Process Judge, Epic Process Judge, and the external blind Judge use `gpt-5.6-sol/high`.
The target is 15 active minutes and the hard cap is 30 active minutes. The run is single-attempt, sleep-inhibited,
fail-closed, and non-retryable as a whole.
