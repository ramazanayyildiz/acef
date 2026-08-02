# Execution Assurance v3.6 deterministic-close recovery

Status: **executable rehearsal; non-scored and non-promotable.**

V3.5 remains an immutable automated and blind FAIL. Its first story produced a genuine test-only ATDD commit, a
production-only Development commit, the same frozen verification command red then green, and two typed reviewer PASS
results. Deterministic close still returned REVISE because the frozen verification test reported by Laravel was not the
editable unit-test path introduced by the ATDD commit.

V3.6 changes only that contradictory identity check. A verification command may execute an immutable test outside the
editable ATDD path. Close still requires all of the following:

1. a recognized test-runner command with an observed failure;
2. a clean committed test-only red tree descended from the ATDD actor input;
3. authentic non-circular assertions over production behavior in the red source;
4. the exact same command green on a descendant implementation tree;
5. preservation of the original red-source semantic assertions;
6. clean evidence snapshots, runner-proof integrity, final-tree review, and frozen story scope; and
7. rejection of production-bearing red commits, arbitrary interpreter self-failure, missing failure output, weakened
   assertions, stale evidence, dirty trees, or invalid ancestry.

## Rehearsal rule

The unchanged four-story v3.5 product contract is reused. Candidate commit
`2b4f0b8ff496a2a7b9ccf278fca68c1fd76e1b7f` must first pass clean preflight and Stage 0. One executable attempt named
`REHEARSAL-v36` may then run to automated closeout. It is explicitly non-scored: no blind judgment, promotion,
`proven` claim, or rollout authorization may be derived from it. A new scored candidate requires a separate frozen
manifest and run identity after the rehearsal completes successfully.
