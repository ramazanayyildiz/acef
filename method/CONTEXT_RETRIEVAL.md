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

## Safety and authority

- Markdown/JSON/Git remain authoritative.
- Context Mode is optional and disposable.
- A missing provider never blocks a gate.
- Retrieval cannot satisfy an FR, approval, test, or runtime obligation.
- Output is capped by lines and characters and reports source/output byte reduction.
- Workers still receive the validated `ACEF_CURRENT_CONTEXT.md`; `acef-query` supplies bounded source material for
  creating or refreshing it.

## Admission rule for more backends

Do not add SQLite, AST, or vector backends until real queries show a gap that Context Mode plus file slicing cannot
solve. New providers must preserve the same CLI and prove lower context cost without changing gate verdicts.
