# Execution Assurance V3.33 clean-row proof

V3.33 is the single clean-row successor to V3.32. It reuses the exact committed V3.32 task capsule, controlled
post-red correction, calibrated role matrix, 15-minute target, and 30-minute hard cap. The only treatment change is
candidate framework commit `8d13ee173e580fa1dcfd3866626cbf58966bbaa0`, which accepts semicolon-composed shell inspection only when every
segment is independently read-only.

Success requires an immutable automated PASS row, the same product and correction proof, collaboration PASS, one
integration invocation after a durably complete story gate, an exact formal story-close delta, Epic Process Judge
PASS, and an external artifact-only blind Judge PASS. This is one measured attempt and is fail-closed. No V3.34 is
authorized automatically if it fails.

The measured attempt is immutable and failed its process oracle. Product verification, both story reviews, the
durable story-close commit, and the Epic Process Judge passed. The conductor first executed the final integration
command with an unquoted shell metacharacter and received exit 127, then repeated the correctly quoted command and
received exit 0. The two invocations violate the frozen exactly-once integration contract. See `REHEARSAL_RESULT.md`.
