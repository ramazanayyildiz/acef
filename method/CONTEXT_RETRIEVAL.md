# ACEF Context Retrieval

ACEF keeps Git artifacts authoritative while allowing optional bounded retrieval to reduce token use. Retrieval is a
derived candidate set, never evidence by itself and never a gate dependency.

## Provider contract

Use one tool-neutral command:

```bash
.acef/bin/acef-query context --repo /path/to/repo --story 5.2 --role developer
```

Provider order:

1. `context-mode` when its CLI is available;
2. deterministic file slicing when it is unavailable or fails.

The caller may force `--provider context-mode` or `--provider files`. Forced providers fail honestly instead of silently
switching. `auto` is the portable default.

## Scoped indexing

Never query a tool's general session memory for ACEF story context. It may contain stale stories, other repos, or old
decisions. The Context Mode adapter indexes only:

- the active delivery ledger;
- `ACEF_CURRENT_CONTEXT.md` when present;
- the matching Epic Context Pack;
- artifacts whose filenames match the active story.

Those files receive a source label containing repository, story, role, Git HEAD, and a content digest. Searches filter
to that source. The full pattern registry is not indexed in this first slice because a large JSON entry can dominate
ranking; a future pattern query must retrieve a work-shape-specific slice.

Source selection is exact and deterministic:

- current-context is included only when both story and role/phase match;
- story IDs use numeric boundaries, so `5.2` cannot select `5.20`;
- ledger and epic-pack content is materialized into temporary story-scoped input before Context Mode indexing;
- neighbor-story sections/table rows are excluded;
- artifact paths are sorted before digesting and querying;
- Test Reviewer uses a dedicated quality, negative-path, boundary, production-path, and fixture-hygiene query profile.

## Safety and authority

- Markdown/JSON/Git remain authoritative.
- Context Mode is optional and disposable.
- A missing provider never blocks a gate.
- Retrieval cannot satisfy an FR, approval, test, or runtime obligation.
- Output is capped by lines and characters and reports source/output byte reduction.
- Workers still receive the validated `ACEF_CURRENT_CONTEXT.md`; `acef-query` supplies bounded source material for
  creating or refreshing it.

## Measurement before policy

Byte reduction is only a leading signal. Before changing ACEF worker defaults, run the controlled experiment harness:

```bash
scripts/acef-context-experiment \
  --repo /path/to/repo \
  --story 5.2 \
  --role reviewer \
  --task-type review \
  --mode files
```

Compare `baseline`, `files`, and `context-mode` on the same task fixtures. A retrieval mode may become the default only
when it reduces returned context without lowering task quality: no stale-story leakage, no wrong-scope touch, no drop in
blocker/high finding recall, and no material retry increase. Token/cost fields remain null until client usage data is
available; do not treat byte reduction as billing proof.

Use `acef-context-experiment-report` on JSONL run files to distinguish `context-surface`, `actor-quality`, and
`actor+token` evidence. Only `actor+token` evidence can justify changing worker defaults.

## Admission rule for more backends

Do not add SQLite, AST, or vector backends until real queries show a gap that Context Mode plus file slicing cannot
solve. New providers must preserve the same CLI and prove lower context cost without changing gate verdicts.

See `docs/research/tooling-admission.md` for the current candidate-tool register and admission triggers.
