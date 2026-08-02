# Execution Assurance v3.3 Preparation

V3.3 is not yet a scored or preregistered experiment. It is a preparation workspace for the failures preserved in the
immutable v3.2 result.

The scored manifest may be frozen only after all of these checks pass:

1. The archived Story 1 PHP red source passes ATDD authenticity offline without a repair.
2. Every frozen story oracle is behavioral red at the pinned baseline and green after its scoped canonical patch.
3. Story 2's compiled ATDD constraint explicitly requires both resolver and Gate evaluation exactly once.
4. Story 4's scope includes the controller, job, and ingress service, and a story-only dry-run closes inside that scope.
5. Total wait, productive delegated execution, and coordination-idle wait are reported separately. Only coordination-idle
   wait is budgeted in `v33-measured`; the numerical 2,700-second/38% ceiling is not raised.
6. Actor prompts use the compiled lifecycle contract and bounded task reads instead of recursively loading ACEF/BMAD
   workflow documents.

`dry-run-manifest.json` is deliberately non-scored and rejects `--pilot-run`. Passing its preflight or a Story 4 dry-run
does not promote the capability beyond `enforced`.

After those preparation gates passed, `manifest.json` separately froze the scored P0 against framework implementation
commit `d339a61908ec091762318f7e63d5d953e09b240d`. The scored attempt is `P0-candidate-v33`; its artifacts and result must
remain separate from the preparation preflight and Story 4 dry-run.
