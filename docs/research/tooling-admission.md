# ACEF Tooling Research and Admission Notes

Status: research baseline
Updated: 2026-06-23

## Decision Frame

ACEF does not add new context, graph, vector, MCP, or eval backends just because they look useful. A tool graduates only
after a measured ACEF gap:

- current `acef-query` file/context-mode retrieval cannot answer the query;
- token/context cost remains high on real actor runs;
- review finding recall drops;
- symbol or impact analysis requires too much broad file reading;
- a security or MCP-control risk appears in real runs.

Until then, Git, Markdown, JSON, runtime commands, and the delivery ledger remain authoritative. Retrieval output is a
candidate input, never a gate verdict.

## Current Baseline

Already implemented:

- `acef-query context` with `files` and optional `context-mode` providers.
- `acef-context-experiment` for controlled `baseline` vs `files` vs `context-mode` measurement.
- Role-scoped `ACEF_CURRENT_CONTEXT.md`.
- Epic Context Pack policy.
- Deterministic fallback when Context Mode is unavailable.

Immediate next work is measurement, not adding more infrastructure.

## Tool Matrix

| Need | Primary candidate | Alternatives | ACEF decision |
|---|---|---|---|
| Symbol-level code access | Serena | Codebase-Memory MCP | Comparative pilot after context experiment |
| Persistent code/dependency graph | Codebase-Memory MCP | CodeGraphContext-style tools | Comparative pilot after a real graph-shaped gap |
| Portable symbol index format | SCIP | LSP-specific adapters | Later foundation format if symbol indexing is admitted |
| Deterministic structural rules | ast-grep | Semgrep CE | Usable soon for narrow conformance checks |
| Security/dataflow analysis | Semgrep CE, then Joern if needed | CodeQL | Risk-based, not default |
| Markdown/artifact search | Existing `acef-query` + Context Mode | QMD, SQLite FTS5, embeddings | Do not add now |
| MCP runtime isolation | ToolHive | ContextForge-style central platforms | Later MCP security pilot |
| MCP policy/guardrails | Invariant Guardrails | AgentGuard/LiteLLM policies | Later MCP policy pilot |
| MCP test/debug | MCP Inspector | Custom contract tests | Useful when ACEF ships MCP servers |
| Big-output reduction | Context Mode through `acef-query` | RTK-style reducers | Already in controlled A/B test |
| Token/cost measurement | Tokscale/ccusage-style accounting | Client usage exports | Next measurement adapter candidate |
| Multi-agent tracing | OpenTelemetry/Arize-style traces | Custom trace schema | Later observability pilot |
| Agent/tool eval | Promptfoo | Inspect AI | Benchmark layer after stable task fixtures |
| Claude/Codex/OpenCode config generation | Ruler | ACEF installer generator | Watch; current installer remains enough |
| Agent trace standard | OpenTraces/Agent Trace-style schemas | ACEF JSONL schema | Watch list |

## Notes by Tool Family

### Code Navigation and Graph

Serena is an MCP-based coding toolkit that offers IDE-like semantic retrieval/editing and symbol-level operations. It is
a good first candidate when agents still spend too much context on broad repo search.

Codebase-Memory MCP is a graph-oriented code intelligence server. It may be useful if ACEF needs persistent dependency or
impact queries, but it should compete against Serena in a controlled pilot rather than be added as a default.

SCIP is a language-agnostic code intelligence index format for definition/reference navigation. ACEF should treat it as a
portable index substrate only after symbol indexing is admitted.

Admission trigger:

- a worker repeatedly needs “who calls this?”, “what implements this?”, or “what will this change break?” and
  `acef-query` plus targeted repo search is still too expensive or incomplete.

### Deterministic Rule Engines

ast-grep is a syntax-aware structural search/rewrite tool. It is the best near-term fit for deterministic ACEF
conformance checks such as “do not instantiate this controller shape” or “do not call this helper directly.”

Semgrep CE is a broader static-analysis tool for bug/security/standard checks. Use it when the rule is security-oriented
or Semgrep already has a useful rule shape.

Joern is heavier and code-property-graph based. Keep it for risk-based dataflow/security analysis, not routine ACEF
delivery runs.

Admission trigger:

- a repeated review finding has a crisp syntactic pattern and should graduate from prose to a mechanical wall.

### MCP Runtime, Policy, and Testing

ToolHive can manage MCP servers with stronger runtime isolation and policy. It is relevant only if ACEF starts depending
on multiple third-party MCP servers across repos.

Invariant Guardrails can sit between agent applications and MCP/LLM providers to enforce contextual policies. It is a
candidate for MCP policy pilots, not for the current file-based ACEF core.

MCP Inspector is useful for interactively testing/debugging MCP servers. Add it when ACEF owns or distributes MCP
servers, not for ordinary skill/script installs.

Admission trigger:

- ACEF begins shipping MCP servers or depends on third-party MCP servers whose permissions must be tested and isolated.

### Evaluation and Cost

Promptfoo is a practical first candidate for prompt/agent/RAG regression tests and CI-friendly comparisons.

Inspect AI is a stronger evaluation framework for more formal benchmark suites and agentic tasks.

Tokscale/ccusage-style accounting or client usage exports are needed because byte reduction is not billing proof. The
first implementation should be an adapter that fills `input_tokens`, `cached_input_tokens`, `output_tokens`, and `cost`
in `acef-context-experiment` JSONL rows.

Admission trigger:

- after the current context experiment produces enough actor runs to justify token/cost instrumentation.

### Config Distribution

Ruler can distribute shared AI-agent rules across multiple coding agents. ACEF already has local installers for Claude,
Codex, and OpenCode. Keep Ruler on watch until local installer drift becomes a real maintenance problem.

Admission trigger:

- ACEF config output for Claude/Codex/OpenCode starts drifting despite installer tests.

## Explicit Non-Goals for the Current Slice

Do not add now:

- vector database;
- graph database;
- SCIP indexer;
- Serena or Codebase-Memory MCP;
- Semgrep/Joern default checks;
- ToolHive/Invariant runtime;
- Promptfoo/Inspect benchmark suite;
- Ruler-generated config layer.

These are all candidates after measurement, not before.

## Sources Checked

- Serena: `https://github.com/oraios/serena`
- Codebase-Memory MCP: `https://github.com/DeusData/codebase-memory-mcp`
- SCIP: `https://scip-code.org/`
- ast-grep: `https://github.com/ast-grep/ast-grep`
- Semgrep: `https://github.com/semgrep/semgrep`
- Joern: `https://github.com/joernio/joern`
- ToolHive: `https://github.com/stacklok/toolhive`
- Invariant Guardrails: `https://github.com/invariantlabs-ai/invariant`
- MCP Inspector: `https://github.com/modelcontextprotocol/inspector`
- Promptfoo: `https://github.com/promptfoo/promptfoo`
- Inspect AI: `https://github.com/UKGovernmentBEIS/inspect_ai`
- Ruler: `https://github.com/intellectronica/ruler`
