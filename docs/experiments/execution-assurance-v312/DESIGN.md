# Execution Assurance v3.12 atomic ATDD evidence handoff

Status: **implementation and complete repository verification pass; separately frozen rehearsal completed FAIL.**

V3.11 failed closed before Development. Its ATDD actor created the genuine test-only red commit and invoked the exact
`runtime-test` evidence command, but `acef-state evidence-run` rejected the write because the lifecycle scheduled the
ATDD actor record only after the child returned. The transition fence correctly prevented follow-up and later phases,
but the actor/evidence dependency was contradictory.

V3.12 makes the ATDD transition atomic:

- for an active four-actor-v3 run, the one canonical `runtime-test` evidence command may create the missing canonical
  ATDD actor and its evidence in one fail-closed operation;
- actor creation is allowed only for the active story, canonical identity, clean worktree, and a new test-only commit;
- invalid kinds, dirty trees, reused immutable IDs, and non-canonical identities leave no actor or evidence residue;
- the compiled prompt no longer asks either the child or conductor to persist a separate v3 ATDD actor; and
- collaboration validation requires exactly one attributable canonical ATDD evidence command in the child transcript.

The complete 30-entrypoint repository suite passed in 280 seconds and capability-change validation passed. Capability
maturity remains `enforced`; this implementation evidence does not make it `proven`.

## Rehearsal rule

The rehearsal manifest is committed separately and binds exact clean implementation commit
`c1840b9f0427c6536ab1d463f91e39f431f8b973`. It authorizes only one non-scored, non-promotable `REHEARSAL-v312`
attempt over the unchanged four-story contract. Preflight and all six Stage 0 traps must pass before the real actor run.
No blind Judge, promotion, maturity change, installation, or rollout is allowed.

## Rehearsal outcome

The immutable non-scored attempt completed FAIL after 3,830.6 active seconds. Atomic ATDD actor/evidence creation
passed for all four stories, and Stories 1–2 closed at cycle 0. Stories 3–4 were quarantined after one-shot Patch
Assurance completion failures caused by a schema-shape error and a mistyped canonical report path. See
`REHEARSAL_RESULT.md`; maturity remains `enforced`.
