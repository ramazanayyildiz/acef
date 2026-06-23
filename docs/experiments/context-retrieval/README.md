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

Generate the actor prompt first:

```bash
scripts/acef-context-actor-prompt-batch \
  --repo /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment \
  --story 4.1 \
  --run-output docs/experiments/context-retrieval/runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl
```

After an actor completes the task, record the quality and token fields in the same row shape:

```bash
scripts/acef-context-record-actor-report \
  --repo /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment \
  --story 4.1 \
  --role reviewer \
  --task-type review \
  --mode files \
  --fixture docs/experiments/context-retrieval/tasks/review.md \
  --report /path/to/actor-report.txt
```

Use `null` or omit token/cost fields when the client has no usage export. Rows without actor result fields remain
context-surface evidence only.

`acef-context-record-actor-report` validates that every required field is present before appending the JSONL row. Do not
hand-edit experiment rows except to remove an explicitly invalid run.

## Track Actor Coverage

Generate a manifest before running actors:

```bash
scripts/acef-context-experiment-manifest \
  --repo /Users/ramazanayyildiz/CODE/OPA/detaysoft2026-context-experiment \
  --story 4.1 \
  --runs-per-cell 2 \
  --output docs/experiments/context-retrieval/manifests/detaysoft-4-1-18-run-2026-06-23.json
```

The manifest is the completion contract for the experiment. The default pilot shape is:

```text
3 task types x 3 modes x 2 runs = 18 actor rows
```

Context-surface probe rows do not satisfy this contract. A run file can show large byte reduction and still have
`coverage_complete: no` until actual actor rows are recorded for every task/mode cell.

Dev-task rows have an additional validity rule: they must run from a clean isolated worktree at a real pre-dev point
where ATDD tests already exist and are red. The prompt must name the base ref, failing test command, and allowed
implementation paths. If the repo is already post-implementation, record the row as `result=invalid`; do not count it as
developer-quality evidence.

Use the manifest to get the next missing actor slot:

```bash
scripts/acef-context-next-run \
  --manifest docs/experiments/context-retrieval/manifests/detaysoft-4-1-18-run-2026-06-23.json \
  --runs docs/experiments/context-retrieval/runs/detaysoft-4-1-actor-runs-2026-06-23.jsonl
```

This prevents ad-hoc actor selection from accidentally over-sampling one mode while leaving another cell empty.

## Summarize a Run File

```bash
scripts/acef-context-experiment-report \
  --input docs/experiments/context-retrieval/runs/detaysoft-4-1-mini-pilot-2026-06-23.jsonl \
  --manifest docs/experiments/context-retrieval/manifests/detaysoft-4-1-18-run-2026-06-23.json
```

The report marks whether evidence is only `context-surface`, `actor-quality`, or `actor+token`. ACEF defaults must not
change from context-surface evidence alone.

## Prompt Artifacts

The first reusable actor prompt matrix is checked in under:

```text
docs/experiments/context-retrieval/prompts/atdd-baseline.md
docs/experiments/context-retrieval/prompts/atdd-files.md
docs/experiments/context-retrieval/prompts/atdd-context-mode.md
docs/experiments/context-retrieval/prompts/dev-baseline.md
docs/experiments/context-retrieval/prompts/dev-files.md
docs/experiments/context-retrieval/prompts/dev-context-mode.md
docs/experiments/context-retrieval/prompts/review-baseline.md
docs/experiments/context-retrieval/prompts/review-files.md
docs/experiments/context-retrieval/prompts/review-context-mode.md
```

These prompts are inputs for real actor runs. They are not results. Each actor must return the metric fields listed in
the prompt, then the operator records a JSONL row with `acef-context-experiment`.

## Interpret Carefully

`source_bytes`, `returned_bytes`, and `reduction_pct` are context-surface metrics. They are not billing proof.

Billing proof requires client usage data:

- input tokens
- cached input tokens
- output tokens
- cost

Do not change ACEF defaults from byte reduction alone.
