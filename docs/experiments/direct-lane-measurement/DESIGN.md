# Direct Lane Measurement v1

Date preregistered: 2026-07-30

## Decision

Determine whether the new direct lane materially reduces the cost of contained work without weakening implementation
quality or allowing risky work to bypass promotion.

## Matrix

- 5 seeded tasks in real repositories.
- 3 lanes: native baseline, ACEF direct, ACEF lightweight.
- 2 clients: Codex and OpenCode.
- OpenCode model: `opencode/deepseek-v4-flash-free` (pinned after the preregistered default provider failed pre-task
  for insufficient balance; see `RUN_LOG.md`).
- 30 external-agent runs in disposable local clones.
- 4 tasks are direct-eligible localized bug fixes.
- 1 DeepL provider-integration task is an intentional promotion trap.

The promotion trap is excluded from runtime and token comparisons because a correct direct run stops before
implementation. It is included in promotion-accuracy and overall validity counts.

## Primary KPIs

Eligible-task comparisons use paired task/client runs.

1. **Quality non-inferiority:** direct pass rate must be at least the native baseline pass rate and blocker/high escaped
   defects must not exceed baseline.
2. **Direct contract completion:** 100% of eligible direct runs must finish with a valid completed
   `ACEF_DIRECT_RUN.json` and passing `lane-closeout`.
3. **Promotion accuracy:** 100% of direct promotion-trap runs must record `status=promoted`, give a non-empty promotion
   reason, avoid implementation changes, and leave the seeded failing verification unfixed.
4. **Scope safety:** direct scope violations must be 0.
5. **Context reliability:** direct context-miss runs must be below 10%.
6. **Empirical token threshold:** the median paired task/client input-token reduction must be at least 25% versus
   baseline. This retains the existing `method/VALIDATION_PLAN.md` threshold; it will not be relaxed after seeing
   results.
7. **Speed objective:** the median paired task/client runtime overhead versus baseline must be at most 30%, and the
   paired median must show direct faster than lightweight.

The capability becomes `proven` only if all seven thresholds pass, the matrix contains exactly 30 completed valid runs,
and no oracle or harness defect invalidates the comparison.

## Secondary Diagnostics

- cached input and output tokens;
- tool calls and broad-read count;
- retries;
- pass rate by client and task;
- paired direct-versus-baseline and direct-versus-lightweight runtime/input deltas;
- direct state and closeout failures;
- false promotion or missed promotion.

## Guardrails

- Active product worktrees are read only.
- Each run starts from a pinned commit in a disposable clone.
- Seeded fixtures and verification scripts are committed before the agent starts.
- Agents cannot install dependencies, commit, push, delegate, modify tests, or touch unrelated paths.
- Direct process sidecars are excluded from implementation-scope violations but remain separately validated.
- Raw transcripts remain outside Git and are bound into JSONL rows by SHA-256.
- Invalid runs are rerun only for documented infrastructure/provider failures, never because of task outcome.

## Artifacts

- Manifest: `manifest.json`
- Raw results: `runs/results.jsonl`
- Generated report: `report.md`
- Data-quality review: `DATA_QUALITY_REVIEW.md`
- Harness: `scripts/acef-empirical-validation`
- Report generator: `scripts/acef-direct-measurement-report`
