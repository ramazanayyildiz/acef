# Direct Lane Measurement Data Quality Review

Date: 2026-07-30

## Review verdict

The 30-run matrix is complete and usable for the direct-lane decision, with one scoring-oracle correction and two
interpretation corrections. The corrected result is still decisively negative: direct does not meet the preregistered
quality, contract, promotion, context, token, or runtime thresholds.

The raw JSONL is preserved unchanged. `report.md` and `summary.json` apply the documented analytical corrections below;
`report-raw.md` and `summary-raw.json` preserve the original generated interpretation.

## Integrity

- 30 rows, 30 unique run IDs, 0 invalid rows.
- Every row has task, lane, client, result, runtime, token, transcript hash, and verification-output hash fields.
- Matrix coverage is 5 tasks × 3 lanes × 2 clients.
- Raw-results SHA-256:
  `6154888511b18f53560ee7758fb3bfee0e21a8df6708dfd1f9075927984e5fb8`.
- OpenCode is pinned to `opencode/deepseek-v4-flash-free`. The provider correction happened before any OpenCode task
  produced a result row and is recorded in `RUN_LOG.md`.

## Findings

### DQ-1 — Exact-string oracle rejected valid locale implementations

Severity: high. Confidence: high.

The Detaysoft locale task required a literal implementation string equivalent to `setLocale('tr')`. Both baseline
runs and both lightweight runs used valid config-driven locale selection and passed the real Laravel verification.
The exact-string expectation nevertheless marked all four as failures. The direct/OpenCode run also passed product
verification but failed the direct process contract after implementing and then promoting.

Correction:

- Reclassify the four baseline/lightweight rows as product PASS.
- Leave direct/Codex as FAIL because product verification remained red after a false promotion.
- Leave direct/OpenCode as FAIL because implementation occurred before a promotion state was written.
- Remove the exact-string failure from escaped-defect counts when behavioral verification passed.

Future remediation: benchmark acceptance should assert observable behavior, not a preferred source-code expression.

### DQ-2 — Raw escaped-defect count conflated process failure with shipped defect

Severity: medium. Confidence: high.

A safe promotion that stops implementation is a workflow noncompletion, not an escaped product defect. Likewise, a
behaviorally correct implementation with an invalid direct closeout is a process-contract failure, not an escaped
defect.

Correction: retain those rows as direct FAIL while setting their reviewed escaped-defect contribution to zero.

### DQ-3 — Client token scales are not interchangeable

Severity: high. Confidence: high.

Codex and OpenCode expose materially different token-accounting scales. Pooling their absolute token counts into one
lane median would make the result sensitive to client mix.

Correction: apply preregistered paired analysis. For each task/client pair, calculate direct's percentage delta against
that same pair's baseline or lightweight run, then take the median of those percentage deltas. Absolute medians remain
diagnostics only.

### DQ-4 — The provider-promotion miss is a real lane failure

Severity: high. Confidence: high.

Codex correctly promoted the DeepL task without implementation. OpenCode classified the existing provider integration
as safe, implemented the change, and completed the direct record. This is not an oracle defect: it violates the
preregistered promotion rule. Current path inference recognizes selected provider names and integration directories,
but does not reliably infer all provider clients from arbitrary service paths.

### DQ-5 — Runtime and context overhead are operationally real

Severity: high. Confidence: high.

Direct runs repeatedly discovered CLI/state syntax and, on Codex, expanded into broad repository-document reads.
The direct lane has no compact current-context boundary equivalent to the lightweight path, and the state CLI does not
offer effective subcommand help for this workflow. These behaviors explain the observed tool-call and read expansion;
they are part of the treatment as installed and are not removed from measurement.

## Corrected interpretation

- Eligible product/process pass: baseline 8/8, direct 6/8, lightweight 8/8.
- Direct contract closeout: 6/8.
- Provider promotion: 1/2.
- Direct context-miss rate: 25%.
- Scope violations: 0.
- Paired median direct input delta versus baseline: +190%.
- Paired median direct runtime delta versus baseline: +175.1%.
- Paired median direct runtime delta versus lightweight: +203.3%.

The locale-oracle sensitivity analysis excludes that task entirely. On the remaining 18 eligible runs, all three lanes
pass 6/6, but direct still uses +190% input versus baseline, takes +175.1% runtime versus baseline, and takes +249.1%
runtime versus lightweight on paired medians.

## Decision

Do not advance `direct-task-lane` to `proven`. Its smallest honest status remains `enforced`: the schema, CLI,
validator, tests, and installer exist and are enforced, but the empirical performance and reliability claim failed.
