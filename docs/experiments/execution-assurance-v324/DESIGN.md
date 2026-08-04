# Execution Assurance v3.24 rehearsal

This is the one immutable successor to V3.23. It keeps failure-atomic discovery, deterministic Developer registration,
one Developer session, independent capsule reviewers, transient root-thread resume, and every circuit breaker.

Its only repair makes Developer repair receipt identity supervisor-owned. Every resume action carries one exact
`repairCommand` and `repairReceiptPath`; the same Developer executes it after accepted green evidence. Substitution or
omission is mechanical REPLAN. The measurement parser also recognizes discovery-bound red evidence as canonical.

Semantic actors remain `gpt-5.6-sol/high`; mechanical operations use no model. Adaptive routing remains shadow-only.
The run is sleep-inhibited, capped at 75 active minutes, fail-closed, and may run exactly once.
