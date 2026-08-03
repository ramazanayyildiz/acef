# Execution Assurance v3.18 rehearsal

This is the one immutable successor to the pre-actor V3.17 bootstrap failure. It reuses the exact V3.16 four-story
JakoMeet benchmark. The only repair is the compiled bootstrap contract: initial state starts at ATDD with bound context
and worker-scope pointers, while a host that enters deterministic readiness receives an exact model-free transition.

Semantic actors remain `gpt-5.6-sol/high`; mechanical work has no model. One Developer session is retained per story,
and independent ATDD/reviewer sessions remain safety boundaries. Adaptive model routing stays shadow-only.

The run is sleep-inhibited, capped at 75 active minutes, fail-closed, and may run exactly once. Earlier attempts are
immutable evidence and are not replayed.
