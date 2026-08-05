# Controlled canary decision

Date: 2026-08-05

Decision: authorize `capsule-supervisor-v1` for at most two sequential controlled canary runs. This is an explicit
operating decision based on the V3.34 live evidence and its exact-transcript reanalysis; it does not rewrite the
immutable V3.34 result, promote capability maturity beyond `enforced`, or make the runtime a default.

## Admission

A canary must:

- start as a genuinely new `full-bmad` / `four-actor-v3` run with `assuranceProfile: guarded` and an explicit
  `runtimeContract: capsule-supervisor-v1`;
- use a bounded vertical story whose readiness result is `PASS`, not an oversized recovery or already-running story;
- begin only after the target repository's prior active run is terminal and the candidate tools are installed from an
  exact clean ACEF commit;
- run sequentially; a second canary cannot start until the first has a terminal result and review;
- leave existing and compatibility runs unchanged. A run with lifecycle evidence cannot opt in later.

## Measurement and stop conditions

Each canary records active wall time, harness/coordination wait, model and effort per role, actor invocations, repair
cycles, focused-test time, integration-test time, review findings, deterministic closeout, and product outcome.

Stop fail-closed and do not retry the same integration action when any of these occurs:

- active wall time reaches 30 minutes;
- the supervisor emits an invalid, ambiguous, or non-executable action;
- actor/session identity, capsule, evidence, or exact-command binding fails;
- two repair/review cycles do not converge, a new HIGH appears in two consecutive review cycles, or patch scope grows
  beyond the admitted story;
- product, process, test-integrity, or terminal closeout evidence is not independently judgeable.

After a stopped canary, preserve its evidence and start a new run under ordinary `four-actor-v3` without the optional
runtime if work should continue. Never mutate the failed run into a fallback run.

## Rollout status

Authorization is active. No live canary is counted by this decision alone. The first eligible target is the next new
bounded Full + Guarded story in a repository whose current ACEF run has already reached a terminal state.

