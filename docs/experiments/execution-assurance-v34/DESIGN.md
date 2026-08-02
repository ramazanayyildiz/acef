# Execution Assurance v3.4 Typed-Handoff Recovery Preparation

V3.4 is a separately bound successor preparation for the immutable v3.3 P0 FAIL. It does not rewrite any v3.3
manifest, run row, judgment, verdict, or result.

The successor may be scored only after these mechanics are green:

1. A four-actor-v3 ATDD `evidence-run` refuses to execute or persist evidence unless HEAD is a new clean test-only
   commit descended from the ATDD actor's input commit.
2. Semantically identical `ACTOR_RESULT=PASS` and `ACTOR_RESULT: PASS` spellings produce the same typed result; the same
   normalization applies to REVISE/FAIL/BLOCKED/REPLAN and to child-parent result reconciliation.
3. Reviewer completion path/hash/blob/tree are parsed from the exact `acef-state review-completion` command stdout in
   the child transcript, never from hand-copied final prose.
4. `functions.exec`-wrapped `exec_command` calls remain visible to command-trace and write-scope validation, including
   quoted JSON keys used by the wrapper.
5. Review reports use the deterministic path `docs/ai/reports/<exact-task-name>.json`; the conductor creates the actor
   record from that path rather than any prose field.
6. Reviewer shell reads are one literal command per call. Dynamic command variables, batching, separators, pipelines,
   redirections, substitutions, and mutation-capable Git commands remain fail-closed.

The v3.3 wait/context/reference improvements and all existing product/process/cost ceilings remain unchanged. Passing
this preparation does not promote capability maturity beyond `enforced`; a separately frozen scored P0 and blind
judgment must still pass.
