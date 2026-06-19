---
name: acef-adapter
description: "Extract a project's ACEF Project Adapter — the stack-agnostic, evidence-based snapshot that makes ACEF fit THIS repo: identity/lifecycle, stack + package manager, repo layout, real commands (build/test/lint/typecheck/codegen/deploy), test setup, CI/CD, golden neighbors, and risk surface — plus a freshness stamp. Read-only fact-finding; never installs, never writes tests, never changes code, never picks a framework without approval. Run on first onboarding to a repo, when there's no fresh map, before large/multi-repo/test-bootstrap work, or after major refactors/upgrades. Output is the per-repo adapter (the moat: each project feeds on its own reality). Triggers: extract the adapter, onboard this repo, map this project, project adapter, what stack/test/CI does this repo use, refresh the codemap/adapter"
---

# ACEF Project Adapter Extraction

Produce the **project adapter**: evidence from the repo, not a hand-written guess. **ACEF core is stack-agnostic** —
detect, never assume (no "web=Next, mobile=RN"). This is **read-only fact-finding**.

## When to run
First onboarding to a repo · no fresh map exists · before large/multi-repo/test-bootstrap/unfamiliar-stack work ·
after major refactor / framework upgrade / package split / new module · when no qualified golden neighbor is found ·
when the existing map conflicts with the repo. **Do not** re-run for every small task — reuse a fresh adapter.

## Procedure — capture each field from EVIDENCE (manifests, lock files, configs, CI files, AGENTS docs, dir tree)

1. **Identity** — repo name · product/tenant role · lifecycle (active/legacy/frozen/migration/new) · related repos/twins. *(stance drives behavior: follow the repo)*
2. **Stack & package manager** — language/runtime · framework + major versions · package manager/build tool · monorepo/workspace. *Evidence: manifest/lock/solution/config files. Do not infer from folder names alone.*
3. **Layout** — important source folders · feature/module boundaries · generated-code locations · shared/core boundaries · config · public API/contract locations.
4. **Commands** — install · build · lint · typecheck · test · codegen · format · (deploy if relevant). *Read from package scripts / Makefile / CI / project files. Missing → write `not found`; never invent.*
5. **Test setup** — do tests exist? · framework(s) · test folders/naming · test command · fixture/mock/data setup · unit/component/integration/e2e split · best test neighbor. *No tests → record `no accepted test neighbor`, identify likely bootstrap surface, do NOT pick a framework without evidence/approval.*
6. **CI/CD** — workflow files · required checks · build/test/lint/typecheck gates · deploy workflows · environments · manual approvals. *A deploy workflow is NOT automatically a test gate — record what it actually checks.*
7. **Golden neighbors** — per common work (feature/endpoint/screen/store-hook/test/migration): path · why it qualifies · what to copy · what NOT to copy · twins to check · **the consumed contract** (the exact symbols the neighbor depends on — hook return shape, function signature, exported types, constants — with `path:line`). Cite neighbors at SYMBOL level, not just file level: a file-level pointer ("the pull-to-refresh screen", "the lang validator") hides contract mismatches. *No qualified neighbor → mark new-pattern.*
8. **Risk surface** — point to the files/folders indicating: auth/permissions · payment/billing · data model/migrations · external integrations · generated client · shared/core packages · deploy/env config · tenant boundaries · feature flags/rollout · observability/error handling.

**Golden-neighbor qualifies when:** same repo (or accepted reference) · follows current convention · not legacy/do-not-copy · similar lifecycle & flow · same stack/package pattern · has twins/tests/docs. Else escalate to new-pattern/larger route.

**Gate evidence rule:** adapter output is used by other ACEF gates, so every gate-relevant field must be source-backed.
Subagent summaries are leads, not adapter facts. Before recording READY for test setup, CI gates, backend/API source of
truth, BMAD/tool availability, release workflow, or risk surface, verify the source file/command yourself and cite it.
If the source cannot be verified, mark DRAFT or MISSING.

## Research-derived mechanisms

Use these when possible:

- **Evidence pins:** every adapter field should include a source path when practical (`package.json`, workflow file,
  project file, AGENTS.md, directory path). Do not record unsupported LLM guesses.
- **Freshness:** include commit/revision and covered modules. If a repo supports file hashes or tree hashes, record
  them as a future refresh input; otherwise commit hash is the baseline.
- **Golden-neighbor ranking:** prefer neighbors with current convention, same lifecycle, same stack/package pattern,
  matching twins/tests, and recent modification. If symbol/code graph tooling is available, rank by referenced symbols
  and locality; do not require embeddings.
- **Symbol/contract-level grounding (mandatory before copy):** a golden neighbor is a *pattern source*, not a
  paste source. Before reusing it, read the actual symbols the TARGET will consume and **diff their
  signature/return shape against what the neighbor assumes**. The neighbor's screen may derive state from a hook
  field (`isRefetching`) that the target's hook does not expose → verbatim copy = type error. The neighbor's
  validator may take `string` where the target is `string?` → null-safety gap. A file-level citation papers over
  exactly these. Pin the contract (`path:line`), call out where target ≠ neighbor, and only copy the parts whose
  contracts match. Also: do not ground in commented-out/dead code or non-test scaffolding (e.g. a benchmark
  harness in a `test/` dir is not a test idiom) — grep-by-symbol can land inside both.
- **Compression:** summarize signatures and paths instead of dumping whole files when producing adapter output.
- **Risk scan hook:** if secret/config scanning tools exist in the project, record their commands. If not, mark
  secret/SAST scanning as MISSING rather than pretending the adapter covers it.

Avoid:

- vector DB / embedding dependency for the adapter
- whole-repo dumps
- generated "project docs" without source-path evidence

## Output
Write `docs/.../{project}-adapter.md` (or the project's chosen location) with this shape, plus a freshness stamp:
```
generated_at · repo · commit/revision · covered_modules · known_omissions · extractor_version
## Identity / Stack / Layout / Commands / Tests / CI-CD / Golden Neighbors / Risk Surface / Refresh Triggers
```
Tag each finding **READY** (found with evidence) / **DRAFT** (in docs, not wired/verified) / **MISSING** (not found).
Never record a desired future convention as current project fact.

## Refresh triggers (write into the output)
stamp missing/stale · major dep/framework change · folder-structure change · new repo/module/package · tests or CI
introduced/changed · auth/payment/data/migration/contract change · large/multi-repo task starts · route can't find a
qualified neighbor · review found the wrong pattern was copied.

## Not this (read-only)
No install · no test creation · no source change · no rewriting conventions · no choosing a new framework without
approval · no broad automation. It prepares the project so the routes can run; it does not implement features.
