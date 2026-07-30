# Direct Lane Treatment Recheck

Date preregistered: 2026-07-30

## Decision

Measure whether commit `8266345` reduces direct-lane cost and context misses after:

- making `ACEF_DIRECT_RUN.json` the whole direct context boundary;
- adding complete `acef-state direct-run --help`;
- making `acef-next` project the direct record without typed-run bootstrap.

## Matrix

- Re-run only the 10 direct treatment cells: 5 unchanged tasks × Codex/OpenCode.
- Reuse the 20 baseline/lightweight control rows from the original v1 measurement because task commits, fixtures,
  prompts, client models, and control implementations are unchanged.
- Keep the original oracle correction for the Turkish locale task.
- Use the same harness, quality oracle, scope checks, and thresholds as v1.

This treatment-only recheck is sufficient to reject the revised direct lane if it remains slower or less reliable. It
is not sufficient by itself to promote the capability to `proven`; if every threshold passes against the fixed control
rows, a fresh concurrent 30-run confirmation is still required.

## Precommitted interpretation

- If direct context misses remain at or above 10%, do not call the entry reduction successful.
- If median paired runtime is still more than 30% above baseline or direct is not faster than lightweight, direct
  remains `enforced`, not `proven`.
- If median paired input does not improve by at least 25% versus baseline, the token-cost threshold still fails.
- Quality, scope, direct-contract, and promotion thresholds cannot regress.

## Artifacts

- Treatment manifest: `manifest.json`
- New direct rows: `runs/results.jsonl`
- Combined fixed-control dataset: `runs/results-combined.jsonl`
- Generated report: `report.md`
- Generated summary: `summary.json`
