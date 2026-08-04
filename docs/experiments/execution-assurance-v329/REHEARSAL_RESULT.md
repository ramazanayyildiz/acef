# V3.29 live correction proof result

V3.29 is an immutable failed attempt. It finished in 796.6 active seconds (13m16.6s), below the 15-minute target and
30-minute hard cap. The controlled post-red route did execute: the first red was bound, the original Developer stopped
before mutation with a canonical correction request, one fresh correction actor changed only the editable test, a
replacement red was bound, and the original Developer session was resumed exactly once.

The attempt did not become product-done. The initial ATDD actor introduced two semantic contradictions, while the
preregistered stimulus and correction authorization named only one. It correctly set the resolver expectation to
`twice()`, but also set `Gate::forUser()` to `twice()`. The correction actor was permitted to change only the resolver
expectation to `once()`. After resumption, the Developer proved that a valid request-scoped production guard passed the
protected benchmark but could not satisfy the remaining bad Gate expectation. It restored the red tree and returned
`REPLAN/SPLIT` rather than weakening the test or committing an invalid implementation.

That is the correct fail-closed outcome for this attempt. No Code Review, Patch Assurance, integration closeout, Epic
Judge, or external blind Judge was launched because accepted green evidence did not exist. The immutable scorer row
therefore records `FAIL`, `verificationExitCode=2`, and `product-done=false` even though its explicit correction-count
gate observed exactly one correction.

V3.29 also exposed two transcript-contract gaps. The supervisor-generated replacement evidence command shell-quotes
each argv token, while the scorer accepted only the unquoted equivalent. The correction actor was required to commit
its test but was not given separate exact staging and commit commands, so it used a combined `git add && git commit`
command that the bounded-shell policy rejected. The successor fixes normalize safe shell-equivalent argv, provide
separate supervisor-owned stage/commit commands, and reconcile a correction actor as canonical ATDD phase evidence.

The capability remains `enforced`, not `proven`. V3.30 must use an exact stimulus requiring resolver `twice()`, nested
next-handler `twice()`, `Gate::forUser()` `once()`, and `Gate::allows()` `once()`. It must then complete correction,
same-session development, concurrent review, deterministic close, integration verification, and independent judgment.

The durable metric and hash bindings are in `RUN_SUMMARY.json`. External `/tmp` workspaces are disposable and must not
be treated as the durable result.
