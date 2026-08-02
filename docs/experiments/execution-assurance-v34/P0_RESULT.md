# Execution Assurance v3.4 P0 result

Status: **FAIL — immutable automated and blind result; capability remains `enforced`.**

Attempt `P0-candidate-v34` tested framework commit `1deadd49876af1c0deca4f40dfb08c84aff28787` against the
unchanged four-story product contract. Stage 0 passed 6/6 and the clean scored preflight passed task binding,
collaboration canary, environment probe, and all four baseline-red/reference-green validations. The timed attempt then
failed automated process/product closeout, and the independent artifact-only blind Judge returned FAIL with one HIGH.

## Measured result

- Active delivery: 4,952.3 seconds (82 minutes 32.3 seconds); below the 9,000-second target and 10,800-second ceiling.
- Story delivery: S1 464.0s, S2 474.7s, S3 550.0s, and S4 1,735.4s; every story stayed below its 2,100-second target.
- Actor invocations: 22/25, including two S4 repair cycles; infrastructure retries: 0.
- Input tokens: 46,893,533/50,000,000.
- Tool calls: 662/520 — hard budget FAIL.
- Harness wait: 1,948.4s (39.34% of active time), split into 1,941.8s of productive delegated execution and only 6.6s
  of true coordination idle (0.13%). The wall-clock delay was actor work and repeated gate/review activity, not an idle
  conductor wait problem.
- Broad lifecycle suite: 0/1 and Epic Process Judge: 0/1 because S4 never reached deterministic PASS close.

## What v3.4 repaired

The three v3.3 handoff failures were materially improved in the real run:

1. Every ATDD actor committed a clean test-only red tree before red evidence was accepted.
2. Story 2 actor completion was accepted and dependent Story 3 ran; punctuation no longer quarantined the dependency.
3. Deterministic reviewer paths and machine completion receipts worked for most initial and retry reviewers rather than
   trusting copied final prose.

These are enforced improvements, but they are not sufficient for a `proven` capability.

## Automated failure

S1 and S2 closed in one review round. S3 also closed, but its product-done audit falsely treated static route alias
cleanup as durable data-state work and required an extra tagged persistence proof. S4 required two bounded repair
cycles:

- Round 0 found a real HIGH: generic MySQL `Duplicate entry` matching could swallow unrelated unique-key failures. It
  also found that the claimed SQLite durable round trip used mocks.
- Repair 1 narrowed MySQL classification and added real SQLite persistence coverage. Patch Assurance passed, while Code
  Review found the new test incorrectly assumed the suite-wide connection was SQLite.
- Repair 2 isolated that test to a dedicated SQLite connection. Retry review passed, but deterministic close returned
  `REPLAN`: changing the repair-added test was classified as removal/weakening of critical ATDD content.

The collaboration oracle also rejected unnecessary retry topology: Patch Assurance was run again in cycle 2 even
though its cycle-1 result was already PASS. Some reviewer transcripts still violated the literal-command/machine-
completion contract, and S3's parallel reviewers did not bind one shared input tree. No scope violation or test-file
escape was accepted.

## Blind product failure

The artifact-only blind Judge returned FAIL with one HIGH (`F-001`). Repair 1 removed the existing generic MySQL
duplicate signature rather than preserving it while distinguishing unrelated named constraints. The positive MySQL
regression case still included a recognized constraint name, so it did not prove compatibility with the frozen generic
signature. Product outcome was therefore incomplete independently of the process failure.

## Decision

V3.4 is not promoted and does not authorize rollout. Its result remains immutable. A successor must be prepared before
another scored run and must, at minimum:

1. classify the unsuffixed legacy delivery ledger as control state before story execution, without in-run normalization;
2. make product-done durability requirements depend on actual persistence semantics rather than every state-changing
   source edit;
3. permit strengthening or environment-isolating edits to repair-added tests while still rejecting removal or weakening
   of the original frozen critical assertions;
4. enforce affected-reviewer retry selection so a prior PASS reviewer is not rerun;
5. make literal reviewer completion fully machine-carried for every reviewer shape and freeze one shared parallel-review
   input tree; and
6. add a withheld compatibility oracle for the generic MySQL signature alongside unrelated named-constraint negatives.

Capability maturity remains `enforced`, not `proven` or `installed`.
