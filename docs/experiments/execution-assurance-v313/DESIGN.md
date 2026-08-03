# Execution Assurance v3.13 canonical reviewer and terminal closeout

Status: **implementation and complete repository verification pass; rehearsal must be frozen separately.**

V3.12 proved atomic ATDD actor/evidence creation on all four stories and completed deterministic cycle-0 close for
Stories 1–2. Stories 3–4 failed later Patch Assurance completion because reviewers still constructed report JSON and
artifact paths by hand. The run also failed to attribute the successful shell-wrapped integration command and could not
durably commit its typed blocked closeout without an Epic gate.

V3.13 removes those free-form boundaries:

- `review-result` accepts only canonical actor, typed verdict, and optional base64 findings; the state writer derives
  report path, run/story/phase, HEAD commit/tree, writes and validates the report, and creates the reviewer actor;
- failed validation removes the derived report when no actor was created, while completed identities remain immutable;
- lifecycle attribution accepts the exact frozen `sh -c` argv as represented by the Codex shell wrapper; and
- a Process Judge may write a typed terminal non-PASS Epic gate carrying missing story inventory and latest typed
  dispositions, while PASS retains the complete-story/evidence requirements.

The complete 30-entrypoint repository suite passed in 266 seconds and capability-change validation passed. Capability
maturity remains `enforced`; implementation evidence alone does not make it `proven`.

## Rehearsal rule

The rehearsal manifest must be committed separately and bind exact clean implementation commit
`b899c980d7204132a8d08bdea0d0bdeace279fad`. It may authorize only one non-scored, non-promotable `REHEARSAL-v313`
attempt over the unchanged four-story contract. Preflight and all six Stage 0 traps must pass before the actor run. No
blind Judge, promotion, maturity change, installation, or rollout is allowed.
