# ATDD-MIN-1 Result

Status: completed on 2026-08-21. No ACEF policy was changed by this experiment.

## Decision

Adopt **integrated RED** as the default for Native, ACEF Fix, and ACEF Standard: the same Developer writes one
authentic critical-path failing test, commits RED, and continues directly to implementation in the same context.

This does **not** remove test-first work. It removes the separate Test Author phase and handoff for lower-depth work.
ACEF Full keeps its independent Test Author, and the existing migration, money, authorization, concurrency,
state-machine, and new-test-architecture preservation triggers remain unchanged.

The frozen decision rule selects integrated RED because:

- all six hidden oracles passed mutation validation;
- there were no hidden S1 or S2 escapes and no assertion weakening in either arm;
- B was faster in all five complete green pairs;
- median paired active-time saving was **27.1%**, above the preregistered 20% threshold; and
- B reached accepted green in 6/6 arms, while A reached accepted green in 5/6.

The quality evidence is not statistical equivalence. The blinded judge found one major issue in A and two in B among
the five complete pairs, all on T3. This is mixed evidence and is reported below rather than hidden by the mechanical
decision rule.

## Design

- Target: JakoMeet at `5d8cfaf23b521cb7245c61ea13014ba3b1e7d623`.
- Model: Claude Opus, max effort, for every oracle author, executor, and blinded judge.
- Six frozen task capsules; twelve measured arms.
- Arm A: separate Test Author session, RED commit, then fresh Developer session.
- Arm B: one continuous Developer session writes RED and implements.
- Six hidden oracles were sealed before execution and independently required to fail on base, pass on a reference
  implementation, and fail on a plausible sabotage implementation.
- The blinded judge saw only sanitized capsules, final diffs, and acceptance tests.

Execution used 18 measured implementation sessions, six oracle-authoring sessions, and one blinded judge session.
Measured implementation consumed 5,898.8 active seconds and 520.1 verification-command seconds in total.

## Results

| Task | A active | B active | B saving | A result | B result | Judge A major/minor | Judge B major/minor |
|---|---:|---:|---:|---|---|---:|---:|
| T1 Duplicate an event | 667.6s | 396.7s | 40.6% | fail | pass | not judged | 0 / 2 |
| T2 Shared event page shell | 597.4s | 435.5s | 27.1% | pass | pass | 0 / 1 | 0 / 0 |
| T3 Mobile nav and scroll restoration | 376.8s | 296.9s | 21.2% | pass | pass | 1 / 1 | 2 / 0 |
| T4 Platform-admin registration export | 497.1s | 331.7s | 33.3% | pass | pass | 0 / 2 | 0 / 1 |
| T5 Shareable landing preview | 647.9s | 440.5s | 32.0% | pass | pass | 0 / 1 | 0 / 1 |
| T6 Published-to-draft revert | 666.2s | 544.5s | 18.3% | pass | pass | 0 / 2 | 0 / 2 |

Aggregate active time was 3,453.0 seconds for A and 2,445.8 seconds for B, a 29.2% reduction. Aggregate focused-test
time was 323.1 seconds for A and 197.0 seconds for B.

T1-A failed because its separately authored acceptance test required the literal route URI
`events/{event:uuid}/duplicate`, while the implementation registered `events/{event}/duplicate`. The other five test
methods passed. This was classified as an agent failure: the handoff froze an implementation-detail assertion that the
Developer did not reconcile before final verification.

## Blinded review

The fresh Opus judge reviewed eleven accepted-green artifacts in randomized, anonymized order and reported three major
and thirteen minor findings overall.

The major findings were confined to T3:

- A omitted a test that proves first-match deduplication when multiple navigation entries resolve active.
- B also omitted that multi-active proof.
- B's production marker identified a navigation section rather than the rendered page, so sibling pages could share a
  scroll-restoration key and restore the wrong offset.

Both T3 arms passed the hidden oracle. Therefore the T3 oracle's reference implementation was not strong enough to
establish the browser-scroll behavior independently. This is an oracle-design limitation, not evidence that a separate
Test Author reliably prevented the defect: both arms still had major findings.

## Infrastructure incident

The first independent mutation-validation pass falsely marked all six oracles invalid because `phpunit.xml` forced
every concurrent worktree onto `jakomeet_testing`, overriding the per-worktree environment database. The harness was
repaired to generate an uncommitted, worktree-local PHPUnit configuration with a unique freshly recreated database.
The same frozen oracle artifacts were then rerun unchanged; all six passed base/reference/sabotage validation. The
initial invalid rows remain in append-only evidence, while the diagnosed cause is recorded separately as an
infrastructure incident and is not charged to an agent or oracle outcome.

## Limits and next step

- This is a calibrated sample of six tasks, not proof of equivalence or universal superiority.
- No capsule required Dusk, so the result does not validate integrated RED for real multi-browser or JavaScript-heavy
  journeys.
- The experiment used one repository, one pinned commit, one model family, and one execution day.
- Blinded rework counts are diagnostic and small; they should not be treated as statistically stable rates.

Run one smaller follow-up calibration for Dusk/browser-state work before changing Full or browser-heavy preservation
rules. Until then, use integrated RED for Native/Fix/Standard and retain independent ATDD for Full and the frozen risk
triggers.

## Evidence

- `PROTOCOL.md` — preregistered protocol and decision rule.
- `capsules.json` — frozen task capsules and pinned target.
- `run-table.json` — machine-readable measurements, tripwires, findings, and failure decomposition.
- `results.jsonl` — append-only raw execution rows.
- `oracles/` — sealed oracle artifacts and mutation-validation logs.
- `runs/` — per-arm transcripts, tests, diffs, ledgers, and final verification.
- `judge/` — blinded bundle, key, transcript, and findings.
