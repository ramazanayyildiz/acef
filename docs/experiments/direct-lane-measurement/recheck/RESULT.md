# Direct Lane Treatment Recheck Result

Date: 2026-07-30
Treatment commit: `8266345`

## Decision

Retire new direct-run admission. Keep compatibility support for existing direct records.

The compact context/help changes improved direct materially versus the first measurement, but direct still failed every
cost/reliability threshold except scope safety:

| Metric | First measurement | Treatment recheck | Required |
| --- | ---: | ---: | ---: |
| Paired input vs baseline | +190.0% | +60.8% | at least 25% lower |
| Paired runtime vs baseline | +175.1% | +112.8% | no more than +30% |
| Paired runtime vs lightweight | +203.3% | +147.9% | faster than lightweight |
| Context-miss rate | 25% | 25% | below 10% |
| Eligible direct closeouts | 6/8 | 6/8 | 8/8 |
| Correct provider promotions | 1/2 | 1/2 | 2/2 |
| Scope violations | 0 | 0 | 0 |

The 10 treatment rows contained no invalid runs. They were combined with the unchanged 20 baseline/lightweight rows
from v1, as preregistered. This fixed-control recheck is sufficient to reject the revised treatment; it is not used to
claim a new concurrent 30-run proof.

## Failure shape

- Six eligible direct cells passed product verification and direct closeout.
- The Turkish locale Codex cell falsely promoted after path-based surface inference rejected a behaviorally valid
  middleware change.
- The Turkish locale OpenCode cell passed the focused behavioral test but failed the existing exact-string oracle and
  direct closeout.
- The provider OpenCode cell implemented the provider change without creating direct state instead of promoting.
- Direct still required materially more tool calls and output than the fixed controls.

## Policy consequence

- New contained reversible single-boundary/single-surface work stays outside ACEF.
- It uses the repository's native workflow, targeted reads, the smallest patch, and focused verification.
- ACEF admission starts only when risk, multiple boundaries/surfaces, new patterns, irreversibility, or
  multi-session/worker coordination makes its controls worth paying for.
- Existing `ACEF_DIRECT_RUN.json` records remain readable and may be closed or promoted.

Raw treatment rows are in `runs/results.jsonl`; the fixed-control composition is in
`runs/results-combined.jsonl`; generated metrics are in `summary.json` and `report.md`.
