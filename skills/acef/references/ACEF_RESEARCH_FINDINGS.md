# ACEF Research Findings — existing tools for our gap skills

Status: research notes (2026-06-18). From a 4-agent web research pass. Purpose: for each MISSING skill, find existing
equivalents (adopt where good, like codemap←GSD) and the proven mechanisms to borrow. Per tool: source · what it
does · what we take · what we avoid · credibility (A/B/C) · ACEF impact.

## Two open niches (nobody ships these — our differentiator)
1. **Stack-agnostic ZERO-tests bootstrapper that produces ONE golden test.** Every tool assumes an existing test and
   chases broad coverage. → `acef-test-bootstrap`.
2. **Evidence-pinned, no-embeddings project adapter** (each field cites a source path). Every tool dumps, LLM-guesses,
   or uses a vector DB. → `acef-adapter`.

The unifying thesis: the borrowed pieces are commodity; **ACEF's value is binding them to each project's extracted
adapter + one orchestrator + no-ceremony** — not the pieces themselves.

---

## 1. Project Adapter / codemap

| Tool | Source | What it does | Take | Avoid | Cred |
| --- | --- | --- | --- | --- | --- |
| aider repo-map | github.com/Aider-AI/aider (~41k★) | tree-sitter → symbol graph → **PageRank** rank → signatures in ~1k-token budget; **mtime SQLite cache** | PageRank to RANK golden neighbors objectively; mtime incremental cache; per-lang `tags.scm` (130+ langs) | it ranks symbols for context, not identity/commands/CI | **A** |
| Repomix | github.com/yamadashy/repomix (~10k★) | tree-sitter `--compress` (signatures, ~70% token cut) + **Secretlint** scan | compress for budget; Secretlint → risk-surface field | whole-repo dump as output | **A** |
| Cursor indexing | (closed) | tree-sitter chunks → embeddings in vector DB; **Merkle-tree-of-hashes** freshness, re-embed only changed branches | **Merkle/commit-hash freshness** (re-extract changed subtrees only) | embeddings/vector DB | A (idea) |
| Sourcegraph Cody | (vendor) | **Dropped embeddings** → search + SCIP code graph | validates **no-embeddings** (cost/staleness) | — | A (lesson) |
| Claude `/init` | Anthropic | LLM reads config (package.json/pyproject/csproj…) → CLAUDE.md | read manifests/CI/config **directly** for stack/commands/CI | LLM-guess as ground truth (generic/bloated) | A |
| gitingest / code2prompt | github | flatten repo to one digest (+ git diff/log) | code2prompt's git diff/log as freshness signal | pure dumpers, no extraction | B |

**ACEF impact (`acef-adapter`):** evidence-pinned (each field carries a source path) · Merkle+commit freshness stamp
· tree-sitter+PageRank to rank golden neighbors · Secretlint→risk · **no embeddings**. Adopt aider repo-map + Repomix
as engine components; assemble the full adapter ourselves (no single equivalent does it).

## 2. Test bootstrap

| Tool | Source | What it does | Take | Avoid | Cred |
| --- | --- | --- | --- | --- | --- |
| Qodo Cover-Agent | github.com/qodo-ai/qodo-cover (~5k★, **unmaintained**) | LLM + coverage-guided validate-loop; **requires an existing test file** as style seed | the validate-and-discard loop | needs existing tests (can't bootstrap zero) | B |
| Meta TestGen-LLM | arxiv 2402.09171 | **filter ladder: buildable→passes→non-flaky→adds-coverage**; surface only survivors | the filter ladder as a hard gate (for bootstrap: "runs green + exercises target") | extends existing class only | A |
| Diffblue Cover | diffblue.com (Java) | symbolic+RL, no LLM; **auto-detects build+framework; if ambiguous asks; if absent proposes default** | the **detection decision tree** | Java-only, symbolic not portable | A |
| GitHub Copilot `/tests` | docs.github.com | LLM; rule: **"mirror existing test framework; if none, use the stack default"** | that one-line rule verbatim | no hard validate loop | A |
| Cursor tests | cursor.com | run-and-fix loop; mirrors existing test files; rules-file = canonical pattern | run-and-fix loop; golden-test-as-pattern | — | B |

**ACEF impact (`acef-test-bootstrap`) — THE NICHE:** Copilot rule + Diffblue detection tree + TestGen filter ladder +
run-and-fix loop + golden-test-as-pattern. Goal = ONE approved idiomatic test (not coverage), human-approval gate.

## 3. Router / intake

| Tool | Source | What it does | Take | Avoid | Cred |
| --- | --- | --- | --- | --- | --- |
| Model-routing / triage | logrocket/elastic blogs | small classifier → cheap vs expensive; **confidence-floor: <0.6 → escalate up** | **confidence-floor: low-confidence OR risk → escalate one tier UP, never down** | trusting benchmark blog numbers | A (pattern) |
| Claude Code triage | anthropics/claude-code | **≤3 yes/no questions**; "localized vs systemic" axis; fewest-files default; prove-don't-assume | minimal-question craft | — | A |
| Kiro | kiro.dev (closed) | feature/bug entry fork + **Quick-Plan** (skip gates when understood) | entry fork + Quick-Plan escape hatch | closed | A (ref) |
| BMAD routing | github.com/bmad-code-org | keyword → Level 0-4 → track | scale-adaptive concept | shallow keyword classifier; persona-heavy | B |
| spec-kit | github.com/github/spec-kit (~114k★) | **fixed 7-step, no routing** | constitution.md guardrail idea | the fixed pipeline (over-ceremony, greenfield-biased) — **anti-pattern** | A |

**ACEF impact (`acef-router`):** confidence-floor escalation · ≤3 yes/no · greenfield/brownfield = deterministic
check (not a question) · thin constitution guardrail (auth/payment/migration always honored even on cheap path).

## 4. Spec / requirements / planning

| Tool | Source | What it does | Take | Avoid | Cred |
| --- | --- | --- | --- | --- | --- |
| spec-kit | github.com/github/spec-kit (~114k★) | `FR-###`/`US#`/`SC-###` IDs; tasks tagged `[US#]`/`[P]`/file path | **best traceability: ID chain + task tags** | G/W/T (we want EARS); heavy pipeline | A |
| OpenSpec | github.com/Fission-AI/OpenSpec (~55k★) | **ADDED/MODIFIED/REMOVED deltas** merge into canonical spec on archive; brownfield-first | the **delta model** (keep brownfield specs alive) | — | A |
| Kiro | kiro.dev | 3-file requirements/design/tasks; **EARS** acceptance criteria | EARS acceptance criteria (our target format) | closed | A |
| TaskMaster | github.com/eyaltoledano/claude-task-master (~28k★) | PRD→tasks.json | per-task `dependencies` + `testStrategy` fields only | weak traceability (PRD discarded; no req back-link) | B |
| Agent OS v3 | github.com/buildermethods/agent-os (~5k★) | **pivoted away from owning spec-writing** → inject standards | the lesson: **inject standards, don't regenerate ceremony** | — | A (lesson) |

**ACEF impact (`acef-specify`):** spec-kit ID chain + OpenSpec delta + Kiro EARS + TaskMaster deps/testStrategy.
**Normalize/trace/readiness layer, NOT a generator** — import BMAD/Kiro if present; lightweight-generate only if absent.
Adopt spec-kit/OpenSpec formats directly (like codemap←GSD). Both OpenSpec + Agent OS v3 abandoned heavy gates →
confirms no-ceremony.

## 5. Release adapter
Equivalents = generic deploy skills (ship, land-and-deploy, canary). Take: checklist/canary/rollback ideas.
ACEF diff: extract real deploy/CI/rollback **from the project adapter** (per-repo), not a generic flow.

---

## Adopt vs Build summary
- **Spec** → strong ADOPT (spec-kit, OpenSpec are real adoptable tools).
- **Adapter** → partial ADOPT (aider repo-map + Repomix as engine), assemble the rest = niche.
- **Test-bootstrap** → BUILD (zero-test bootstrap has no equivalent = niche; borrow mechanisms).
- **Router** → BUILD thin (no drop-in; borrow confidence-floor + minimal-question patterns).
- **Release** → BUILD thin on generic skills + adapter values.
