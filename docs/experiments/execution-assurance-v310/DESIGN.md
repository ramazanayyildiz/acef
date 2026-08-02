# Execution Assurance v3.10 atomic reviewer handoff

Status: **implementation and complete repository verification pass; rehearsal must be frozen separately.**

V3.9 remains an immutable non-scored failure. It proved the canonical Developer session identity in a real Codex
session, then stopped during Story 1 review because the protocol required reviewer actor records before child
completion while also requiring those immutable records to bind reports that did not yet exist. The two reviewers also
bound different commits instead of one shared review input tree.

V3.10 removes that ordering contradiction:

- the conductor commits all review-transition control state before either reviewer starts;
- concurrent Code Review and Patch Assurance receive the same frozen input commit and tree;
- the conductor does not pre-create reviewer actor records;
- each reviewer writes only its deterministic typed report;
- the final one-shot `acef-state review-completion` validates the report and atomically creates its report-bound
  immutable reviewer actor record; and
- transcript auditing permits exactly that report and actor record while continuing to reject all other writes,
  delegation, cross-repository completion, and extra command options.

The complete 30-entrypoint repository suite passed in 265 seconds and capability-change validation passed. Capability
maturity remains `enforced`; this implementation evidence does not make it `proven`.

## Rehearsal rule

The rehearsal manifest must be committed separately and bind exact clean implementation commit
`ad2df8cfc1da328d52e1f6a0facbba8497259b2f`. It may authorize only one non-scored, non-promotable `REHEARSAL-v310`
attempt over the unchanged four-story contract. Preflight and all six Stage 0 traps must pass before the real actor run.
No blind Judge, promotion, maturity change, installation, or rollout is allowed.
