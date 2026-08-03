# Execution Assurance v3.17 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v317` attempt stopped after 75.7 seconds without changing product code or dispatching any
semantic actor. It must not be replayed.

The conductor bootstrapped the typed run with `activePhase=readiness`, while `capsule-supervisor-v1` only recognized
the actor lifecycle beginning at ATDD. The first supervisor action therefore returned `blocked` and the run stopped as
designed. The attempt used 11 conductor tool calls, 352,512 input tokens (321,792 cached), 2,643 output tokens, and zero
child actor invocations.

This exposed two remaining sources of avoidable context work: bootstrap was still model-selected, and the compiled
supervisor had no compatibility transition for a deterministic readiness phase. The successor repair makes ATDD the
explicit initial phase, requires initial context/worker-scope pointers, forbids bootstrap help/source probes, and adds
an exact model-free readiness-to-ATDD transition for compatible hosts.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
