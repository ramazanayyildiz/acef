# Execution Assurance v3.26 rehearsal

This is the one immutable successor to V3.25. It keeps the measured capsule-supervisor contract unchanged: 17
independent `gpt-5.6-sol/high` semantic actors, one story Developer session with bounded repair follow-up, model-free
mechanical state, focused story verification, one epic integration suite, and one independent Epic Process Judge.

Its only candidate repair is the deterministic ATDD harness precheck. The supervisor gives each ATDD actor an exact
in-scope precheck before the red commit, and evidence binding repeats the guard failure-atomically. The measured PHP
nested-arrow/by-reference observation trap can no longer become immutable red evidence.

The measured 320 tool-call ceiling and every V3.25 time, token, cycle, actor, retry, and repair limit remain frozen.
The run is sleep-inhibited, capped at 75 active minutes, fail-closed, and may run exactly once.
