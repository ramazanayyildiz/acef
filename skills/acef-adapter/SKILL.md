---
name: acef-adapter
version: 1.0.0
description: "Extract a project's ACEF Project Adapter — the stack-agnostic, evidence-based snapshot and living repo memory that makes ACEF fit THIS repo: identity/lifecycle, stack + package manager, repo layout, real commands, test setup, CI/CD, golden neighbors, pattern registry, do-not-copy, reuse probes, risk surface, provenance, and freshness. Read-only fact-finding; never installs, never writes tests, never changes code, never picks a framework without approval. Run on first onboarding to a repo, when there's no fresh map, before large/multi-repo/test-bootstrap/conformance-sensitive work, or after major refactors/upgrades. Output is the per-repo adapter (the moat: each project feeds on its own reality). Triggers: extract the adapter, onboard this repo, map this project, project adapter, pattern registry, what stack/test/CI does this repo use, refresh the codemap/adapter"
---

# ACEF Project Adapter Extraction

Produce the **project adapter**: evidence from the repo, not a hand-written guess. **ACEF core is stack-agnostic** —
detect, never assume (no "web=Next, mobile=RN"). This is **read-only fact-finding**.

The adapter has two durable parts:

1. **Snapshot** — the codemap photo: stack, layout, commands, tests, CI, architecture, conventions, concerns.
2. **Living repo knowledge** — pattern registry, golden neighbors, do-not-copy entries, reuse probes, fitness checks,
   risk boundaries, and inventories. These entries persist across runs and must carry provenance.

Do not put run-local state here. Gate summaries, drift notes, handoffs, and next-allowed-step belong in the delivery
ledger for that feature/task.

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
7. **Golden neighbors + pattern registry** — per common work (feature/endpoint/screen/store-hook/test/migration): path · why it qualifies · what to copy · what NOT to copy · twins to check · **the consumed contract** (the exact symbols the neighbor depends on — hook return shape, function signature, exported types, constants — with `path:line`). Cite neighbors at SYMBOL level, not just file level: a file-level pointer ("the pull-to-refresh screen", "the lang validator") hides contract mismatches. *No qualified neighbor → mark new-pattern / needs decision.*
8. **Project how-it-is-done inventory** — identify repeatable local workflows that are worth turning into tutorials or
   compact context packs after human confirmation. This is not a gate. It is an inventory of how the project appears to
   create common things: CMS/admin modules, mobile screens, API endpoints, dashboard tables, payment/webview flows,
   settings/menu/navigation wiring, queue/mail jobs, package public APIs, or any project-specific equivalent. For each
   candidate, record evidence count, representative files, key symbols/framework primitives, project surface, and why it
   is likely to recur. If the workflow creates author-controlled input that should appear or take effect elsewhere, also
   record the input-output binding to prove: input surface, consuming output surface, field/value, and defaults,
   placeholders, stock data/media, mocks, or cache paths that could mask a broken binding.
9. **Risk surface** — point to the files/folders indicating: auth/permissions · payment/billing · data model/migrations · external integrations · generated client · shared/core packages · deploy/env config · tenant boundaries · feature flags/rollout · observability/error handling.
10. **Adapter memory schema** — every living entry that can guide implementation/review must include:
   - source evidence (`path:line` or command),
   - confidence (`statistical-strong`, `multiple-examples`, `single-example`, `inferred`, `needs-verification`),
   - freshness (verified date + commit/revision + scope),
   - evidence (why this is canonical, not only an example path),
   - per-entry `lastVerifiedCommit`,
   - `enforcedBy` (`null` or the lint/CI/hook/fitness check that enforces it),
   - maturity (`review-finding`, `rubric-item`, `mechanical-check`, `retired`),
   - update trigger (`conformance-revise`, `merged-better-exemplar`, `command-change`, `risk-boundary-change`,
     `n-commits-stale`, `major-refactor`, `no-qualified-neighbor`).

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
## Identity / Stack / Layout / Commands / Tests / CI-CD / Snapshot / Pattern Registry / Golden Neighbors / Do-Not-Copy / Reuse Probes / Risk Surface / Refresh Triggers
```
Tag each finding **READY** (found with evidence) / **DRAFT** (in docs, not wired/verified) / **MISSING** (not found).
Never record a desired future convention as current project fact.

Living repo knowledge entries should use this compact shape when practical:

```yaml
id: pattern.example
kind: pattern | golden-neighbor | do-not-copy | reuse-probe | fitness-check | risk-boundary | component-inventory
status: proposed | active | promoted-to-check | retired | archived
maturity: review-finding | rubric-item | mechanical-check | retired
enforcedBy: null
trigger: conformance-revise | merged-better-exemplar | command-change | risk-boundary-change | n-commits-stale | major-refactor | no-qualified-neighbor
evidence: "Why this is canonical, not just an example path."
source_evidence: ["path/to/file.ts:12"]
confidence: multiple-examples
freshness: { verified_at: YYYY-MM-DD, commit: short-sha, scope: path-or-module }
lastVerifiedCommit: short-sha
notes: "Short rule."
```

If an adapter entry lacks source evidence, confidence, and freshness, treat it as a lead, not a conformance rule.
For `pattern-registry.json`, follow `PATTERN_REGISTRY.md`.

## Tutorial discovery interview

After the first adapter/codemap pass, present a short candidate list instead of generating large tutorials immediately:

```text
I found these repeatable local workflows:
1. <candidate> — evidence: <N examples>; why it matters: <short reason>
2. <candidate> — evidence: <N examples>; why it matters: <short reason>

Should any project-critical flows be added, removed, or prioritized before I generate tutorials?
```

This catches low-frequency but business-critical flows (payment, auth, import/export, release, admin operations) that may
not score highly from code repetition alone. Human confirmation decides priority; ACEF delivery gates decide whether later
implementation work followed the chosen pattern.

Confirmed tutorials should include the proof recipe, not just the files to create. When the pattern accepts authored
values, the recipe must use a non-default value through the real input surface and verify the consuming runtime surface
uses that value. Defaults, placeholders, stock media/data, mocks, and stale cache are masking risks and must be called out.

## Memory lifecycle

Soft conformance rules should graduate:

`review finding -> rubric item -> mechanical check (lint / fitness / hook / CI) -> prose RETIRED`

Remove, retire, or archive entries that are superseded. Do not let the adapter become an all-add prose blob.

## Refresh triggers (write into the output)
stamp missing/stale · major dep/framework change · folder-structure change · new repo/module/package · tests or CI
introduced/changed · auth/payment/data/migration/contract change · large/multi-repo task starts · route can't find a
qualified neighbor · review found the wrong pattern was copied.

## Not this (read-only)
No install · no test creation · no source change · no rewriting conventions · no choosing a new framework without
approval · no broad automation. It prepares the project so the routes can run; it does not implement features.
