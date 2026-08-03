# Execution Assurance v3.11 ATDD transition fence

Status: **implementation and complete repository verification pass; rehearsal must be frozen separately.**

V3.10 remains a consumed, non-replayable interrupted rehearsal. Its Story 1 ATDD actor committed the correct red test
tree but invented unsupported evidence kind `atdd-red`. The conductor then sent two prohibited follow-ups to that same
ATDD identity and advanced to Development. The run was stopped after 413.1 seconds; reviewer atomic handoff was never
reached.

V3.11 makes the transition fail closed before later work:

- every frozen story renders one literal `evidence-run --kind runtime-test` command with the exact focused argv;
- the ATDD actor is told to run that command once after its clean test-only commit;
- a live supervisor reads the bound parent transcript and terminates the full process group if `followup_task` targets
  anything other than one of the frozen canonical Developer identities;
- the actor receipt records the exact live-policy violation; and
- post-run collaboration validation now applies fresh adjudication/correction semantics to four-actor-v3 ATDD
  `REVISE`, rather than accidentally bypassing them.

The complete 30-entrypoint repository suite passed in 288 seconds and capability-change validation passed. Capability
maturity remains `enforced`; this implementation evidence does not make it `proven`.

## Rehearsal rule

The rehearsal manifest must be committed separately and bind exact clean implementation commit
`4aca554df1e8977d0d03638784e139187a526c54`. It may authorize only one non-scored, non-promotable `REHEARSAL-v311`
attempt over the unchanged four-story contract. Preflight and all six Stage 0 traps must pass before the real actor run.
No blind Judge, promotion, maturity change, installation, or rollout is allowed.
