# Execution Assurance v3.16 rehearsal

This non-promotable rehearsal measures the first `capsule-supervisor-v1` runtime candidate against the same four-story
JakoMeet authorization hardening benchmark used by the v3 lineage. It is a single candidate run, not a replay of the
legacy arm.

The frozen hypothesis is that deterministic lifecycle reduction, one Developer session per story, hash-bound review
capsules, exact test discovery, reuse of Code Review after test-only repairs, and one focused-run proof per reviewed
tree reduce repeated context processing without deleting semantic controls.

All semantic actors are pinned to `gpt-5.6-sol/high` for this safety baseline. Mechanical work has no model. The
`gpt-5.6-terra/medium` thin-proxy idea remains shadow-only and cannot certify this run. This rehearsal therefore tests
session topology and deterministic orchestration; it does not yet claim adaptive model routing is proven.

The run is sleep-inhibited, capped at 75 active minutes, and fail-closed. One attempt is allowed. Any capsule/show/report
binding failure, undiscovered frozen test, unexpected actor, third repair cycle, budget breach, or product/process gate
failure ends the run without an automatic full replay.
