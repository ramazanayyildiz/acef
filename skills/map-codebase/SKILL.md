---
name: map-codebase
description: "Auto-generate a code-grounded codebase map for any repo using 4 parallel agents (STACK, ARCHITECTURE, CONVENTIONS, CONCERNS). Use when onboarding to a new codebase, before relying on stale docs, after major refactors, or when asking 'what does this repo actually do'. Triggers: map this codebase, map the repo, codebase map, generate repo map, what does this codebase look like, scan the repo, repo overview"
---

# Map Codebase

Auto-generate a fresh, code-grounded map of any repository for AI agents and humans — replacing hand-curated inventories that go stale and lie.

## When to Use

- Onboarding to any new codebase
- Before relying on existing repo docs (regenerate, don't trust stale inventories)
- After major refactors or dependency upgrades
- When a new contributor or AI agent needs orientation
- Periodically as a health check

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
>
> For each convention, note whether it's Canonical (>=80% of code follows it) or Aspirational (docs say it, code doesn't consistently do it)."

### Agent 4: CONCERNS

> "Analyze CONCERNS in this repository — things a new contributor or AI agent must know to avoid mistakes. Report:
>
> **Committed secrets (P0):** Scan config files (appsettings*.json, .env*, docker-compose*, config/), look for real credentials — connection-string passwords (Password=, Pwd=), provider keys (SG., AKIA, AIza, sk-, xox, ghp_, Bearer), tokens, API keys. REPORT FILE PATH + TYPE ONLY, NEVER PRINT THE SECRET VALUE.
>
> **Do-not-copy quirks:** Files, folders, or patterns that look like conventions but are actually mistakes — typos in folder names, incomplete features, misfiled code, dead code that looks alive. List each with why copying it would be harmful.
>
> **Security-sensitive areas:** Auth/authz boundaries, token handling, input validation gaps, CORS config, rate limiting.
>
> **Structural deviations:** Places where the code contradicts its own conventions (the CONVENTIONS agent found the rules; you find where they break).
>
> **Tech debt hotspots:** Areas with high complexity, low test coverage, or TODO/HACK/FIXME density."

### After all 4 agents return

1. **Synthesize** their outputs into a single `codebase-map.md` with four clearly labeled sections
2. **Verify high-impact claims** from source evidence; never promote a subagent summary directly into a gate.
3. **Capture a freshness stamp** before writing: `git rev-parse --short HEAD` (commit), the date, and the scope
   covered (which dirs/modules). This lets later runs decide "refresh or reuse?" mechanically instead of guessing.
4. Add header (with the stamp):
   `# Codebase Map: {repo-name}\n\n*generated_at: {date} · commit: {short-sha} · covered: {scope} · Code is source of truth; supersedes any hand-written repo-inventory.*`
5. If CONCERNS found committed secrets → add a prominent WARNING block at the top
6. Write to the output path

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

## CONCERNS
{Agent 4 output}
{Do-not-copy list}
{Security notes}
```

## Post-Map Governance (manual, not automated)

The mapper produces the descriptive layer. The human adds governance on top:

1. **Base-rate labels** — for enforced rules, measure follow-vs-violate ratio via grep. Label Canonical (>=80%) vs Aspirational.
2. **FAIL gates** — wire high-confidence checks into CI (secrets, known anti-patterns). Docs inform; gates enforce.
3. **Local Pattern Map** — distill into the repo's AGENTS.md or CLAUDE.md: stance + copy-these-neighbors + do-not-copy quirks + domain glossary.
4. **Cross-repo governance** — the mapper sees one repo. Apply lifecycle weighting and version drift checks across the product line manually.

## Design Principles

- **Code is truth.** Never trust docs over code. Cite file:line or don't claim it.
- **Subagents are not proof.** They accelerate discovery; the synthesized map owns the verification.
- **Read-only.** The mapper never modifies anything. It observes and reports.
- **Parallel for speed.** 4 agents run simultaneously. Total wall-clock ~30-60s per repo.
- **Honest about gaps.** If a section has low confidence, say so. Don't hallucinate conventions.
- **Secrets are P0.** Always scan. Never print values. Always warn prominently.
