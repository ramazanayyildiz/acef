# Execution Assurance v3.19 rehearsal

This is the one immutable successor to V3.18. It uses the same four-story JakoMeet benchmark and changes only the
compiled execution contract: bootstrap and each worker scope have exact commands, additive ATDD must test executable
behavior rather than source shape, and a mechanical gate failure with both semantic reviewers PASS terminates as
REPLAN without a Developer follow-up.

Semantic safety actors remain `gpt-5.6-sol/high`; bookkeeping and transitions are model-free. One Developer session is
retained per story. Independent ATDD and reviewers remain fresh because their separation is part of the assurance
claim. Adaptive lower-cost routing remains shadow-only.

The run is sleep-inhibited, capped at 75 active minutes, fail-closed, and may run exactly once. V3.16–V3.18 remain
immutable evidence and are not replayed.
