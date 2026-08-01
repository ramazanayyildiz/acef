# Preregistration Amendment 007

Pre-P0 adversarial review found durability and fidelity gaps in the long-running pilot harness. Concurrent recovery could
launch the same actor twice; a started actor without an exit receipt could be replayed despite indeterminate side effects;
timeout killed only the direct process; finalization could duplicate a row after a crash; and resumed scoring was not
bound to the original manifest, task/oracle, request, runner, and results destination.

The runner now uses external atomic launch/finalization claims, durable request/start/exit receipts with hashes and launch
nonces, whole-process-group TERM/KILL and quiescence, staged reusable integration-verification receipts, immutable result
reconciliation by `attemptRunId`, and input-hash validation. A main actor that started but produced no exit receipt is
invalidated for adjudication and is never replayed; only a never-started prepared request is safe to launch. Verification
is separately declared read-only/idempotent and may recover from a dead supervisor after its old process group is reaped.

The automated oracle additionally requires every ACEF story's minimum Full lifecycle vector, complete scope attribution,
no attributable duplicate lifecycle, and policy-valid treatment state (`lane: full-bmad` for legacy; `workflowId:
full-bmad` plus `assuranceProfile: guarded` for candidate). Static installed framework/rule paths are no longer exempt
from scope enforcement. Seeded RED checks must be behavioral assertion failures, cached framework checkouts must remain
clean at their pinned commit, and broad-suite counting is shell-segment aware.

These are measurement and fail-closed corrections made before any scored P0 result. Frozen product behavior, source and
framework commits, model, acceptance tests, allowed production paths, time caps, and decision thresholds are unchanged.
