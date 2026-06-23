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

## Record a Real Actor Run

After an actor completes the task, record the quality and token fields in the same row shape:

```bash
scripts/acef-context-experiment \
  --repo /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment \
  --story 4.1 \
  --role reviewer \
  --task-type review \
  --mode files \
  --fixture docs/experiments/context-retrieval/tasks/review.md \
  --result pass \
  --tests-passed true \
  --input-tokens 1200 \
  --cached-input-tokens 100 \
  --output-tokens 300 \
  --cost 0.012 \
  --known-findings-recalled 2 \
  --review-findings-count 2 \
  --false-positive-count 0 \
  --retry-count 0 \
  --stale-story-leak false \
  --wrong-scope-touch false
```

Use `null` or omit token/cost fields when the client has no usage export. Rows without actor result fields remain
context-surface evidence only.

## Summarize a Run File

```bash
scripts/acef-context-experiment-report \
  --input docs/experiments/context-retrieval/runs/detaysoft-4-1-mini-pilot-2026-06-23.jsonl
```

The report marks whether evidence is only `context-surface`, `actor-quality`, or `actor+token`. ACEF defaults must not
change from context-surface evidence alone.

## Interpret Carefully

`source_bytes`, `returned_bytes`, and `reduction_pct` are context-surface metrics. They are not billing proof.

Billing proof requires client usage data:

- input tokens
- cached input tokens
- output tokens
- cost

Do not change ACEF defaults from byte reduction alone.
