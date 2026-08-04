# Execution Assurance v3.21 rehearsal

This is the one immutable successor to V3.20. It keeps exact bootstrap, behavioral-only ATDD, atomic
ATDD-to-Development scope rebinding, one Developer session, independent capsule reviewers, and the mechanical-gate
circuit breaker. Its only repair is deterministic pre-dispatch registration: the supervisor compiles the complete
canonical Developer actor command and the conductor executes it once before spawning that exact actor ID.

Semantic actors remain `gpt-5.6-sol/high`; mechanical operations use no model. Adaptive routing remains shadow-only.
The run is sleep-inhibited, capped at 75 active minutes, fail-closed, and may run exactly once.
