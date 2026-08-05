# Execution Assurance V3.34 shell-safe integration proof

V3.34 is the explicitly authorized successor to immutable V3.33. It reuses the exact committed V3.32 task capsule,
controlled post-red correction, calibrated role matrix, 15-minute target, and 30-minute hard cap. The only treatment
change is candidate framework commit `7fb5776b93a3e707909b74c2b3ad9123db7b5cef`, which replaces the unsafe final
integration display with one typed, shell-safe, exactly-once `run-integration` action.

Success requires an immutable automated PASS row, one integration invocation with a successful typed exit receipt,
the same product and correction proof, collaboration PASS, a durably complete story gate before integration, Epic
Process Judge PASS, and an external artifact-only blind Judge PASS. This is one measured attempt and is fail-closed.

The measured attempt is immutable. The shell-safe integration repair passed live with exactly one quoted invocation
and exit 0; product, correction, reviews, durable lifecycle, budgets, Epic Judge, and blind Judge also passed. The
original row failed because the ATDD actor stored its exact evidence command in one non-interpolated immutable
`String.raw` constant and used object shorthand, which the transcript extractor did not recognize. A bounded static
parser repair makes exact-transcript collaboration reanalysis fully green. See `REHEARSAL_RESULT.md`.
