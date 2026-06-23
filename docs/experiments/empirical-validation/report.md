# ACEF Empirical Validation Report

Generated: 2026-06-23

## Decision

Do not change ACEF defaults to claim token reduction from the current lightweight or guarded lanes. In this 30-run measurement, ACEF lanes improved completion quality and defect recall, but they increased median input-token consumption versus baseline.

Keep the current safe defaults: compact current context, epic context packs, short role-specific prompts, targeted reads, and short failure summaries. Do not add SQLite, vector, graph, SCIP, Serena, or Codebase-Memory infrastructure from this result. The next optimization should reduce ACEF prompt/tool overhead inside the existing lane, not introduce a new retrieval backend.

## Scope

- 30 external-agent runs completed.
- 3 repositories: Detaysoft CMS, Browser RTS, MVT Next.js.
- 3 stacks: Laravel/PHP, TypeScript/Vite, TypeScript/Next.js.
- 2 clients: Codex and OpenCode.
- 3 lanes: baseline, lightweight ACEF, guarded ACEF.
- Active product worktrees were not modified; runs used isolated clones.

## Headline Metrics

| Metric | Value |
| --- | --- |
| Total runs | 30 |
| Invalid runs | 0 |
| Overall pass rate | 22/30 |
| Overall known finding recall | 22/30 |
| Scope violations | 0 |
| Median input tokens | 130740 |
| Median cached input tokens | 139360 |

## By Lane

| Lane | Runs | Pass | Recall | Scope violations | Median input | Input vs baseline | Median cached | Median seconds | Context misses |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | 10 | 6/10 | 6/10 | 0 | 130162 | +0% | 116064 | 48.85 | 1 |
| guarded | 10 | 8/10 | 8/10 | 0 | 227161.5 | n/a | 220832 | 66.05000000000001 | 4 |
| lightweight | 10 | 8/10 | 8/10 | 0 | 175839.5 | n/a | 200928 | 64.25 | 1 |

## By Client

| Client | Runs | Pass | Recall | Scope violations | Median input | Input vs baseline | Median cached | Median seconds | Context misses |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| codex | 15 | 11/15 | 11/15 | 0 | 374863 | n/a | 313984 | 68.5 | 6 |
| opencode | 15 | 11/15 | 11/15 | 0 | 22840 | n/a | 89920 | 54.6 | 0 |

## By Task

| Task | Runs | Pass | Recall | Scope violations | Median input | Input vs baseline | Median cached | Median seconds | Context misses |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| browser-rts-combat-hp-clamp | 6 | 6/6 | 6/6 | 0 | 128336 | n/a | 130528 | 57.099999999999994 | 0 |
| detaysoft-content-language | 6 | 6/6 | 6/6 | 0 | 132100 | n/a | 139744 | 55.349999999999994 | 1 |
| detaysoft-download-traversal | 6 | 0/6 | 0/6 | 0 | 164304 | n/a | 191264 | 64.5 | 1 |
| mvt-bff-internal-prefix | 6 | 4/6 | 4/6 | 0 | 146096 | n/a | 168544 | 56.900000000000006 | 1 |
| mvt-people-soft-delete | 6 | 6/6 | 6/6 | 0 | 152301.5 | n/a | 169792 | 64.75 | 3 |

## Paired ACEF Deltas

| Task / client | Lane | Result | Input delta vs baseline | Recall | Scope violations |
| --- | --- | --- | --- | --- | --- |
| browser-rts-combat-hp-clamp / codex | lightweight | pass | +62.5% | 1/1 | 0 |
| browser-rts-combat-hp-clamp / codex | guarded | pass | +84% | 1/1 | 0 |
| browser-rts-combat-hp-clamp / opencode | lightweight | pass | +4% | 1/1 | 0 |
| browser-rts-combat-hp-clamp / opencode | guarded | pass | +3.3% | 1/1 | 0 |
| detaysoft-content-language / codex | lightweight | pass | +36.1% | 1/1 | 0 |
| detaysoft-content-language / codex | guarded | pass | +220.8% | 1/1 | 0 |
| detaysoft-content-language / opencode | lightweight | pass | +2.7% | 1/1 | 0 |
| detaysoft-content-language / opencode | guarded | pass | -46.3% | 1/1 | 0 |
| detaysoft-download-traversal / codex | lightweight | fail | +24.7% | 0/1 | 0 |
| detaysoft-download-traversal / codex | guarded | fail | +48.2% | 0/1 | 0 |
| detaysoft-download-traversal / opencode | lightweight | fail | +4% | 0/1 | 0 |
| detaysoft-download-traversal / opencode | guarded | fail | +4.3% | 0/1 | 0 |
| mvt-bff-internal-prefix / codex | lightweight | pass | +33.1% | 1/1 | 0 |
| mvt-bff-internal-prefix / codex | guarded | pass | +57.6% | 1/1 | 0 |
| mvt-bff-internal-prefix / opencode | lightweight | pass | +5.7% | 1/1 | 0 |
| mvt-bff-internal-prefix / opencode | guarded | pass | +3.2% | 1/1 | 0 |
| mvt-people-soft-delete / codex | lightweight | pass | +73.1% | 1/1 | 0 |
| mvt-people-soft-delete / codex | guarded | pass | +71.8% | 1/1 | 0 |
| mvt-people-soft-delete / opencode | lightweight | pass | -7.1% | 1/1 | 0 |
| mvt-people-soft-delete / opencode | guarded | pass | +3.6% | 1/1 | 0 |

## Interpretation

- Baseline passed 6/10 with 6/10 known findings recalled.
- Lightweight ACEF passed 8/10 with 8/10 known findings recalled.
- Guarded ACEF passed 8/10 with 8/10 known findings recalled.
- Scope violations were 0 across all lanes.
- Median input tokens increased from baseline to lightweight and guarded lanes. The quality gain is real, but it is not a token-saving result.
- The Detaysoft traversal task failed in every lane. That is a signal that the security-fix prompt/context still does not force restoration of the canonical validation expression, even when tests pass. Treat it as a follow-up benchmark improvement target, not as evidence for a new retrieval backend.
- OpenCode used far fewer measured input tokens than Codex in this run, while achieving the same pass count. This is client-specific overhead evidence, not an ACEF-method conclusion.

## Final Policy

- ACEF empirical validation supports keeping ACEF for quality and process control.
- ACEF empirical validation does not support claiming ACEF currently reduces token cost.
- Do not promote `acef-query`, Context Mode, SQLite, vector, or graph storage to default worker context policy from this result.
- Continue optimizing inside the existing file/artifact model: shorter worker prompts, narrower target-file reads, better per-role context packs, and less repeated ledger/artifact ingestion.

## Evidence

- Raw result log: `docs/experiments/empirical-validation/runs/results.jsonl`
- Raw transcripts are intentionally outside git under the experiment workspace and referenced by SHA-256 in the JSONL rows.
- Harness: `scripts/acef-empirical-validation`
- Harness tests: `scripts/test-acef-empirical-validation`
