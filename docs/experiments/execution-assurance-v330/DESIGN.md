# Execution Assurance V3.30 live correction proof

V3.30 is the only successor to the immutable V3.29 FAIL. It freezes framework commit
`f2e5b0193f1efc5b39319ad4d69b2de68813a82d` and retains the same single middleware-idempotency story, role matrix,
15-minute target, and 30-minute hard cap.

The controlled initial test is now exact. Resolver `resolve()` is deliberately `twice()`; the nested next handler is
correctly `twice()`; `Gate::forUser()` and `Gate::allows()` are each correctly `once()`. No other semantic defect is
permitted. The correction actor may change only resolver `twice()` to `once()` and must use the supervisor's separate
literal precheck, stage, commit, and replacement-evidence commands.

The transcript scorer normalizes safe shell-quoted argv to the same canonical command while continuing to reject
unquoted separators, substitutions, redirections, and dynamic commands. The correction actor's evidence-owned record
remains canonical ATDD phase evidence; its distinct lifecycle purpose is bound by the V2 correction record.

Success requires exactly one correction binding, exactly one follow-up to the original Developer, accepted discovered
green evidence, concurrent Code Review and Patch Assurance, one deterministic story-close package, one integration
verification, one Epic Process Judge, and one external blind Judge. The run is single-attempt and fail-closed.
