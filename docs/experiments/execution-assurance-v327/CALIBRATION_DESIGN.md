# V3.27 role-routing calibration

## Purpose

This preregistered calibration asks whether `gpt-5.6-sol/medium` can replace `gpt-5.6-sol/high` for the Full BMAD
Code Review role without losing a previously adjudicated HIGH finding. It does not lower the floor for ATDD,
Development, Patch Assurance, or the Epic Process Judge; one capsule cannot justify those roles.

## Frozen input and allocation

- Both candidates receive the same self-contained V3.25 Code Review capsule at
  `inputs/reviewer-capsule.json` (SHA-256 `aae943a8c02ad4fbcd1ef980e3326e61a0d9f1f0c454d2bb2f47e3865db503e4`).
- The held-out original review report is committed only by SHA-256
  `102a910a4cb5882276e812a25e03ae41963321b96250e450f9732f06f040beea` until both candidates finish.
- Candidate identities A/B are committed by hash
  `d620d4733382594f74098e00cfa117441f138d2e1e12c05b37307a89cb50f5d8` and remain hidden from the Judge.
- Each candidate may read only the frozen capsule, may not inspect prior reports/history, and may not delegate.
- The wall-clock budget is 15 minutes for both candidates plus blind adjudication. Infrastructure failure makes the
  calibration inconclusive; it does not authorize a lower floor.

## Candidate output contract

Each candidate returns one JSON object with `candidateId`, `verdict`, `findings`, `coverage`, and `confidence`.
Every finding must contain a stable ID, severity, reason, exact capsule path/symbol evidence, remediation, and a
regression-test proposal. Unsupported HIGH findings count against the candidate.

## Blind rubric

The Judge receives anonymized A/B outputs and the held-out oracle only after both candidates finish. It scores each
candidate from 0–5 on correctness, severity/verdict calibration, evidence precision, remediation quality, regression
test quality, and boundedness/false-positive control.

The medium candidate qualifies as the default Code Review floor only if all of the following are true:

1. It independently identifies the held-out malformed empty-operand/operator-gap authorization defect.
2. It classifies the defect HIGH and returns REVISE.
3. It has no unsupported HIGH finding.
4. Its total score is no more than two points below the high candidate out of 30.
5. The blind Judge recommends `TIE` or the medium candidate.

Otherwise Code Review remains `gpt-5.6-sol/high`. A qualifying result is provider-specific evidence for this model;
ACEF stores the policy in provider-neutral capability/reasoning tiers so other providers can be calibrated later.

## V3.27 routing consequence

The deterministic supervisor/state/capsule/gate path remains model-free. The conductor uses the standard/medium tier
because it follows compiled actions rather than making semantic acceptance decisions. Code Review adopts the measured
floor above. Unmeasured semantic roles retain frontier/high for the V3.27 frozen run.
