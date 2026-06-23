# ACEF Context Retrieval Experiments

This folder holds controlled experiments for ACEF token/context optimization.

The experiment compares:

- `baseline`: controlled broad old-style context.
- `files`: deterministic `acef-query` fallback.
- `context-mode`: optional Context Mode provider.

The experiment is intentionally narrow. It does not add graph/vector/search backends. New backends require evidence that this layer cannot answer real ACEF worker context needs.

## Run a Single Probe

```bash
scripts/acef-context-experiment \
  --repo /Users/ramazanayyildiz/CODE/OPA/detaysoft2026 \
  --story 4.1 \
  --role reviewer \
  --task-type review \
  --mode files \
  --fixture docs/experiments/context-retrieval/tasks/review.md
```

Results append to:

```text
docs/experiments/context-retrieval/runs/YYYY-MM-DD.jsonl
```

## Interpret Carefully

`source_bytes`, `returned_bytes`, and `reduction_pct` are context-surface metrics. They are not billing proof.

Billing proof requires client usage data:

- input tokens
- cached input tokens
- output tokens
- cost

Do not change ACEF defaults from byte reduction alone.
