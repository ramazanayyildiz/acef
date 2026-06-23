# ACEF Context Retrieval

ACEF may use optional bounded retrieval, but Git artifacts remain authoritative and gates must work without retrieval.

Use:

```bash
.acef/bin/acef-query context --repo /path/to/repo --story 5.2 --role developer
```

The `auto` provider uses Context Mode when available and deterministic file slicing otherwise. Context Mode receives only
the active ledger, matching Epic Context Pack, current-context file, and matching story artifacts under a source label
bound to repo, story, role, Git HEAD, and content digest. Never query general session memory for story context.

The result is bounded candidate input for refreshing `ACEF_CURRENT_CONTEXT.md`; it is not evidence and cannot satisfy a
gate, FR, approval, test, or runtime obligation. Do not index the full pattern registry in the story-context query. Add
SQLite, AST, or vector providers only after measured retrieval failures justify them.
