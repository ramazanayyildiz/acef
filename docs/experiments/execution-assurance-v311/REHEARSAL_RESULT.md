# Execution Assurance v3.11 rehearsal result

Status: **FAIL / immutable non-scored result**

`REHEARSAL-v311` was frozen against candidate implementation
`4aca554df1e8977d0d03638784e139187a526c54`. Clean preflight passed and Stage 0 passed 6/6.

The real run finished normally with `RESULT=FAIL` after 314 active seconds. It stopped during Story 1 ATDD before
Development, review, or any later story. No blind Judge, promotion, or maturity change is implied.

## What passed

- The conductor rendered and delivered the exact literal `runtime-test` evidence command.
- The ATDD actor changed only the frozen unit-test path and committed a genuine red tree at
  `cc1a353aca2739887e0b183a4b93ebf51354a650`.
- The unit suite demonstrated exactly three malformed-expression failures while 12 unchanged-behavior tests passed.
- No ATDD follow-up occurred. Live policy saw no violation; post-run accounting recorded `followupInvocationCount=0`.
- The conductor did not advance to Development after the terminal `REVISE`; it returned fail-closed `REPLAN/SPLIT`.
- Scope violations, infrastructure retries, repair cycles, and review rounds were all zero.

## Failure

The exact evidence command was rejected before PHPUnit execution because
`docs/ai/actors/acef_s1_resolver_fail_closed_atdd.json` did not exist. The general lifecycle instruction still assigned
actor-record creation to the conductor after the child's `FINAL_ANSWER`, while `acef-state evidence-run` requires the
actor record before it can execute and bind evidence. This is the same ordering class fixed for reviewers in V3.10,
now exposed at the ATDD/evidence boundary.

Because the ATDD actor had a terminal result and a committed test change, the conductor correctly refused to reactivate
it or reuse the consumed evidence ID. Post-run validation also correctly required a fresh adjudication after REVISE;
none was dispatched, so the process oracle failed.

## Required successor

Make the literal ATDD evidence command the sole ATDD handoff: for an active four-actor-v3 run, `evidence-run` must
validate the clean committed red tree and atomically create the missing report-free ATDD actor record before executing
the focused command. It must refuse an existing mismatched actor, never overwrite an immutable record, and leave no
actor record when pre-execution validation fails. Transcript auditing must attribute that actor write to the ATDD child.

Reviewer atomic handoff was not reached and remains unproven. Capability maturity remains `enforced`, not `proven` or
`installed`.

## Measurements

- Active delivery: `314.0s`
- Story 1 actor time: `73.9s`
- Actors: `1`
- Follow-ups / infra retries / repair cycles: `0 / 0 / 0`
- Input tokens: `659,734` (`600,064` cached)
- Output tokens: `9,484`
- Tool calls: `17`
- Harness wait: `70.5s` (`22.45%`), including `69.3s` delegated execution and `1.2s` coordination idle
- Lifecycle broad suite: `0`; the independent harness verification failed with exit `2` after the incomplete outcome
- Raw transcript SHA-256: `0d47cfae2855c9b727f93e5c3e6c59dbec93a1d9d9decbd463ca249d72bcf58a`
- Product diff SHA-256: `3c7346147b3efc5b8281c6c9e775cd55ded9da4ed9665617396f5ad3c3ae8fbb`
- Full diff SHA-256: `5869bb987ee9bdd007ad65271b53ab6538d70ac09a894edeba14604e2609a30b`
