# Execution Assurance v3.23 rehearsal

This is the one immutable successor to V3.22. It keeps exact bootstrap, deterministic Developer pre-registration,
one Developer session, independent capsule reviewers, bounded repair, transient root-thread resume, and every existing
circuit breaker.

Its only framework repair is failure-atomic ATDD discovery. The ATDD actor directly verifies frozen identities before
commit; the exact red-evidence command binds the same discovery contract; and the state writer performs discovery before
creating an actor or evidence artifact.

Semantic actors remain `gpt-5.6-sol/high`; mechanical operations use no model. Adaptive routing remains shadow-only.
The run is sleep-inhibited, capped at 75 active minutes, fail-closed, and may run exactly once.
