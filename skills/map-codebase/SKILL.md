---
name: map-codebase
version: 1.0.0
description: "Auto-generate a code-grounded codebase map and pattern registry for any repo using 4 parallel agents (STACK, ARCHITECTURE, CONVENTIONS, CONCERNS). Use when onboarding to a new codebase, before relying on stale docs, after major refactors, before conformance-sensitive implementation, or when asking 'what does this repo actually do / how does this repo write this'. Triggers: map this codebase, map the repo, codebase map, generate repo map, pattern registry, how does this repo write, what does this codebase look like, scan the repo, repo overview"
---

# Map Codebase

Auto-generate a fresh, code-grounded map of any repository for AI agents and humans — replacing hand-curated inventories that go stale and lie.

The map has two jobs:

1. **Describe the repo** — stack, architecture, conventions, and risks.
2. **Guide conformance** — produce a small pattern registry that says "this repo writes this kind of thing this way."

## When to Use

- Onboarding to any new codebase
- Before relying on existing repo docs (regenerate, don't trust stale inventories)
- After major refactors or dependency upgrades
- When a new contributor or AI agent needs orientation
- Periodically as a health check
- Before ACEF implementation work where the worker must find golden neighbors or pass a conformance review

## Arguments

Parse the first argument as the target:
- No argument → map the current working directory's repo
- A path → map that specific repo/directory
- `--output <path>` → custom output location (default: `docs/codebase-map.md` in the target repo)
- `--concerns-only` → only run the CONCERNS pass (fast security/quirk check)

## Procedure

Spawn **4 parallel read-only sub-agents** using the Agent tool with `subagent_type: "Explore"`. Each agent is strictly **read-only — never modifies code**.

Subagent output is not final evidence. Treat each agent report as a lead. During synthesis, verify any gate-relevant
claim against source files or commands before recording it as fact: stack/tool versions, test setup, CI gates,
secrets/security findings, auth/payment/data risk, generated clients, backend/API contracts, and do-not-copy patterns.
If you cannot verify it, label it low-confidence or omit it from hard rules.

### Agent 1: STACK

> "Analyze the STACK of this repository. Report:
> - Language(s) and framework versions (from package.json, .csproj, Cargo.toml, pyproject.toml, go.mod, etc.)
> - Key libraries and their exact versions
> - How shared dependencies/packages are consumed (monorepo? package references? git submodules?)
> - External integrations (payment, SMS, email, storage, push notifications, analytics, etc.)
> - Background workers, job queues, scheduled tasks
> - Build system, CI/CD pipeline, publish/deploy mechanism
> - Database(s), ORM, migration tool
>
> Be specific: file paths and version numbers, not vague descriptions."

### Agent 2: ARCHITECTURE

> "Analyze the ARCHITECTURE of this repository. Report:
> - Project/layer structure and dependency direction (what depends on what)
> - Feature/module organization pattern (vertical slices? horizontal layers? domain folders?)
> - Dependency injection / service registration pattern
> - API response envelope and error handling pattern
> - Multi-tenancy approach (if applicable)
> - Database context / migration ownership
> - Entry points (controllers, handlers, routes, pages)
> - State management pattern (frontend repos)
>
> Draw the dependency graph as ASCII if the repo has multiple projects/packages."

### Agent 3: CONVENTIONS

> "Analyze the CONVENTIONS this codebase ACTUALLY follows (not what docs claim — what the code does). For each convention, cite file:line evidence:
> - Naming conventions (files, classes, functions, variables, routes)
> - Folder/directory shape and where new features go
> - Error handling pattern (throw vs return null vs Result type vs error codes)
> - DTO/mapper/serialization approach
> - Validation pattern (where and how)
> - Async patterns and concurrency approach
> - Controller/component/handler shape (the canonical 'looks like this' example)
> - Test conventions (naming, structure, what's tested, what's not)
> - Import/module organization style
> - Reusable UI/component/helper/service patterns that should be checked before creating new ones
> - Golden neighbors by problem shape, not just by folder (list screen, detail screen, mutation hook, payment flow, background job, API endpoint, form, modal, table, etc. as applicable)
>
> For each convention, note whether it's Canonical (>=80% of code follows it) or Aspirational (docs say it, code doesn't consistently do it)."

### Agent 4: CONCERNS

> "Analyze CONCERNS in this repository — things a new contributor or AI agent must know to avoid mistakes. Report:
>
> **Committed secrets (P0):** Scan config files (appsettings*.json, .env*, docker-compose*, config/), look for real credentials — connection-string passwords (Password=, Pwd=), provider keys (SG., AKIA, AIza, sk-, xox, ghp_, Bearer), tokens, API keys. REPORT FILE PATH + TYPE ONLY, NEVER PRINT THE SECRET VALUE.
>
> **Do-not-copy quirks:** Files, folders, or patterns that look like conventions but are actually mistakes — typos in folder names, incomplete features, misfiled code, dead code that looks alive. List each with why copying it would be harmful.
>
> **Pattern freshness:** Identify stale/legacy/migration-only areas that should not be used as golden neighbors even if they are common. Prefer newer, actively maintained examples when the repo shows a migration direction.
>
> **Security-sensitive areas:** Auth/authz boundaries, token handling, input validation gaps, CORS config, rate limiting.
>
> **Structural deviations:** Places where the code contradicts its own conventions (the CONVENTIONS agent found the rules; you find where they break).
>
> **Tech debt hotspots:** Areas with high complexity, low test coverage, or TODO/HACK/FIXME density."

### After all 4 agents return

1. **Synthesize** their outputs into a single `codebase-map.md` with five clearly labeled sections
2. **Verify high-impact claims** from source evidence; never promote a subagent summary directly into a gate.
3. **Capture a freshness stamp** before writing: `git rev-parse --short HEAD` (commit), the date, and the scope
   covered (which dirs/modules). This lets later runs decide "refresh or reuse?" mechanically instead of guessing.
4. Add header (with the stamp):
   `# Codebase Map: {repo-name}\n\n*generated_at: {date} · commit: {short-sha} · covered: {scope} · Code is source of truth; supersedes any hand-written repo-inventory.*`
5. **Derive a Pattern Registry** from CONVENTIONS + CONCERNS. This is not a separate invention layer; it is the normative, conformance-oriented distillation of the descriptive map. Follow the `PATTERN_REGISTRY.md` contract when ACEF method docs are available.
6. If CONCERNS found committed secrets → add a prominent WARNING block at the top
7. Write to the output path

## Output Format

```markdown
# Codebase Map: {repo-name}

*generated_at: {date} · commit: {short-sha} · covered: {scope} · Code is source of truth; supersedes any hand-written repo-inventory.*

> **Refresh when:** commit moved significantly · major dep/framework change · new module/package · auth/payment/data/migration/contract change · large/multi-repo task · the map conflicts with the repo. Otherwise reuse.

> **WARNING:** Committed secrets detected. See CONCERNS section. — (only if found)

## STACK
{Agent 1 output, edited for clarity}

## ARCHITECTURE
{Agent 2 output, edited for clarity}
{ASCII dependency graph if multi-project}

## CONVENTIONS
{Agent 3 output with file:line citations}
{Canonical vs Aspirational labels}

## PATTERN REGISTRY
Small conformance map for implementation and review. Keep it terse and evidence-linked.

| Work shape | Use this pattern | Golden neighbor(s) | Reuse-before-create probe | Do not copy | Confidence |
| --- | --- | --- | --- | --- | --- |
| {screen/hook/service/API/job/etc.} | {accepted pattern} | `{path}` | {symbols/components/helpers to search first} | `{legacy-or-bad-example}` or `None found` | High/Medium/Low |

If producing a machine-readable registry, write/propose `docs/ai/pattern-registry.json` with per-entry `evidence`,
`sourceEvidence`, `confidence`, `lastVerifiedCommit`, `enforcedBy`, and `refreshTriggers`. Do not store run-local gate
summaries or drift notes in that file.

Freshness stamps record the commit where evidence was verified. A committed registry may carry an ancestor stamp; it is
fresh only if no covered source paths changed since that stamp. If the repo is rebased or pulled forward across covered
code after extraction, rerun the relevant evidence checks before reusing the registry.

### Reuse-before-create checklist
- Before adding a helper/service/component/hook, search the registry's probe terms and golden neighbors.
- If a matching local abstraction exists, reuse it or record why it does not fit.
- If creating a new pattern, mark it `Needs decision` unless it clearly extends an accepted pattern.

### Pattern labels
- `Canonical` — code evidence shows this is the dominant accepted pattern.
- `Emerging` — newer code suggests migration direction, but old code still exists.
- `Aspirational` — docs say this, code does not consistently follow it.
- `Legacy / do-not-copy` — exists in code but should not guide new work.
- `Needs decision` — multiple live patterns conflict; do not choose silently.

### Registry status
- `READY` — can guide all work in covered scopes.
- `PARTIAL` — only covered mechanical/standard work shapes may proceed; guarded work and new work shapes require registry extraction or explicit risk acceptance.
- `MISSING` — no conformance gate can pass.

## CONCERNS
{Agent 4 output}
{Do-not-copy list}
{Security notes}
```

## Post-Map Governance

The mapper produces the descriptive layer and a first-pass Pattern Registry. The human or ACEF adapter can promote stable registry entries into stronger governance:

1. **Base-rate labels** — for enforced rules, measure follow-vs-violate ratio via grep. Label Canonical (>=80%) vs Aspirational.
2. **FAIL gates** — wire high-confidence checks into CI (secrets, known anti-patterns). Docs inform; gates enforce.
3. **Local Pattern Map** — distill into the repo's AGENTS.md or CLAUDE.md: stance + copy-these-neighbors + do-not-copy quirks + domain glossary.
4. **ACEF conformance gate** — reviewers use the Pattern Registry to ask: did the worker reuse the right neighbor, avoid do-not-copy examples, and explain any new pattern?
5. **Cross-repo governance** — the mapper sees one repo. Apply lifecycle weighting and version drift checks across the product line manually.

## Design Principles

- **Code is truth.** Never trust docs over code. Cite file:line or don't claim it.
- **Descriptive first, normative second.** The codemap observes the repo; the Pattern Registry only promotes patterns that have evidence or marks them `Needs decision`.
- **Subagents are not proof.** They accelerate discovery; the synthesized map owns the verification.
- **Read-only.** The mapper never modifies anything. It observes and reports.
- **Parallel for speed.** 4 agents run simultaneously. Total wall-clock ~30-60s per repo.
- **Honest about gaps.** If a section has low confidence, say so. Don't hallucinate conventions.
- **Secrets are P0.** Always scan. Never print values. Always warn prominently.
