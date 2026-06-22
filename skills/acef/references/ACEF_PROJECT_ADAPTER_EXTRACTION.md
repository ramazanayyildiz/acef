# ACEF Project Adapter Extraction

Status: draft

This document defines the universal Project Adapter Extraction step for brownfield projects.

ACEF core is stack-agnostic. The adapter is what makes ACEF fit a specific project.

## Purpose

Before ACEF is used regularly on a brownfield project, extract the project's real working context:

- what stack it uses
- how code is organized
- how it is built, tested, linted, and deployed
- where good local examples live
- which areas are risky
- which conventions must be followed or avoided

The adapter is evidence from the project, not a hand-written guess.

The adapter has two durable parts:

1. **Snapshot** — the codemap photo: stack, layout, commands, tests, CI, architecture, conventions, concerns.
2. **Living repo knowledge** — pattern registry, golden neighbors, do-not-copy entries, reuse probes, fitness checks,
   risk boundaries, and inventories.

Run-local state does not belong in the adapter. Gate summaries, drift notes, handoffs, and next allowed step belong in
the delivery ledger for that feature/task.

## When To Run

Run adapter extraction:

1. when ACEF is introduced to a project for the first time
2. when the project has no reliable codemap/project map
3. before large feature, multi-repo, test-bootstrap, or unfamiliar-stack work
4. after major refactors, framework upgrades, package splits, or new modules
5. when agents cannot find a qualified golden neighbor
6. when the existing map conflicts with the current repo

Do not re-run it for every small task. For small feature/bugfix work, use the existing adapter if it is fresh.

## Freshness Stamp

Every adapter/codemap output must include:

- `generated_at`
- repo name/path
- commit hash or revision
- covered modules/repos
- extractor version or prompt name if available
- known omissions

If the stamp is missing, treat freshness as unknown.

## Required Fields

### 1. Repo Identity

Capture:

- repo name
- product/tenant role
- lifecycle state: active, legacy, frozen, migration target, new
- primary owner if known
- related repos or twins

Why it matters:

The same stack can mean different things in active vs legacy repos. ACEF should follow the repo's stance.

### 2. Stack And Package Manager

Capture:

- language/runtime
- framework
- package manager/build tool
- major framework versions
- monorepo/workspace structure if present

Evidence:

- manifest files
- lock files
- solution/workspace files
- framework config

Do not infer from folder names alone.

### 3. Repo Layout

Capture:

- important source folders
- feature/module boundaries
- generated code locations
- shared/core package boundaries
- config locations
- public API or contract locations

Evidence:

- directory tree
- import patterns
- project files
- local docs/AGENTS files

### 4. Commands

Capture actual commands from project files:

- install
- build
- lint
- typecheck
- test
- codegen
- format
- deploy, only if relevant

For missing commands, write `not found`; do not invent one.

Evidence:

- package scripts
- Makefile
- CI workflow
- project/solution files
- local docs

### 5. Test Setup

Capture:

- whether tests exist
- test framework(s)
- test folders and naming conventions
- test command
- fixture/mock/data setup
- component/unit/integration/e2e split if present
- best test neighbor if one exists

If no tests exist:

- record `no accepted test neighbor`
- identify likely bootstrap surface
- do not choose a framework without evidence or approval

### 6. CI/CD

Capture:

- workflow files
- required checks
- build/test/lint/typecheck gates
- deploy workflows
- environments
- manual approval points if present

Important distinction:

Deploy workflow is not automatically a test gate. Record what the workflow actually checks.

### 7. Golden Neighbors And Pattern Registry

Capture qualified local examples and accepted patterns for common work:

- similar feature
- similar API endpoint
- similar UI screen/component
- similar state/store/hook
- similar test
- similar migration/integration
- local generator or scaffolding recipe
- local module/capsule/feature checklist
- local skill/agent/command that defines how this repo creates the work shape
- local stubs/templates that encode completion wiring

For each neighbor, record:

- path
- why it qualifies
- what can be copied
- what should not be copied
- related twins to check
- **the consumed contract** — the exact symbols the neighbor depends on (hook return shape, function
  signature, exported types, constants), each with `path:line`
- reuse-before-create probe terms
- pattern label: Canonical, Emerging, Aspirational, Legacy/do-not-copy, or Needs decision
- confidence and freshness

If no qualified neighbor exists, mark the work as no-neighbor/new-pattern.

### Local generation docs, skills, stubs, and checklists are pattern sources

The adapter/codemap must not treat source code as the only pattern source. Many repos encode their real completion
criteria in repo-local docs, skills, generators, stubs, and checklists. These sources are first-class evidence when they
are current and reconcile with live code.

During extraction, search for and reconcile:

- `AGENTS.md`, `CLAUDE.md`, repo guides, module/capsule generation docs, and handbook/checklist files;
- local skills/commands/agents that generate or modify the work shape;
- stubs/templates used for new modules, screens, controllers, migrations, forms, navigation, or routes;
- generator output conventions and registration steps;
- completion checks that make a feature discoverable and usable, not merely present on disk.

For each work shape, the pattern registry should distinguish:

- **structure evidence** — files/classes/routes/config exist;
- **registration evidence** — providers, route registration, navigation/menu registration, config lists, permissions, or
  equivalent wiring make the capability reachable;
- **discoverability evidence** — a normal user/editor/developer can find the capability through the intended UI/CLI/API;
- **runtime evidence** — the capability works through its real entrypoint.

If repo-local generation docs/skills/stubs say a registration or discoverability step is required, the adapter must record
that step in the corresponding pattern entry. A module is not "complete" just because the supporting files exist.

Example: a Twill capsule pattern may require `TwillNavigation::addLink(...)->forModule(...)`,
`bootstrap/providers.php` registration, `config/twill.php` capsule registration, admin route reachability, and admin menu
visibility. If those requirements appear in source repos, stubs, or a `twill-make-capsule` skill, they must be captured as
pattern-registry evidence and later tested at the capability level.

### Symbol/contract-level grounding (mandatory before copy)

Cite neighbors at SYMBOL level, not just file level. A golden neighbor is a *pattern source*, not a paste
source. Before reusing it, read the actual symbols the TARGET will consume and **diff their signature/return
shape against what the neighbor assumes**:

- The neighbor's screen may derive state from a hook field (e.g. `isRefetching`) the target's hook does not
  expose → verbatim copy = type error.
- The neighbor's validator may take `string` where the target is `string?` → null-safety gap.
- A file-level pointer ("the pull-to-refresh screen", "the lang validator") papers over exactly these.

Pin the contract, call out where target ≠ neighbor, and copy only the parts whose contracts match. Do not
ground in commented-out/dead code or non-test scaffolding (a benchmark harness inside a `test/` dir is not a
test idiom) — symbol grep can land inside both.

## Golden Neighbor Qualification

A neighbor is qualified when it:

1. is in the same repo or the accepted reference repo
2. follows the repo's current convention
3. is not legacy/do-not-copy
4. has a similar lifecycle and user flow
5. uses the same stack/package pattern
6. has related twins/tests/docs if applicable

If these are not true, do not force the neighbor. Escalate to a new-pattern or larger route.

## Risk Surface

Capture project-specific risky areas:

- auth and permissions
- payment/subscription/billing
- data model and migrations
- external integrations
- generated API/client code
- shared/core packages
- deployment and environment config
- tenant boundaries
- feature flags and rollout logic

## Adapter Living-Knowledge Schema

Every living entry that can guide implementation or review must carry a provenance triple:

- `source_evidence` — file/command/path proving the entry, preferably `path:line`
- `confidence` — `statistical-strong`, `multiple-examples`, `single-example`, `inferred`, or `needs-verification`
- `freshness` — last verified date + commit/revision + scope

It must also carry:

- `maturity` — `review-finding`, `rubric-item`, `mechanical-check`, or `retired`
- `trigger` — the event that updates it
- `status` — `proposed`, `active`, `promoted-to-check`, `retired`, or `archived`

Use this compact shape when practical:

```yaml
id: pattern.example
kind: pattern | golden-neighbor | do-not-copy | reuse-probe | fitness-check | risk-boundary | component-inventory
status: proposed | active | promoted-to-check | retired | archived
maturity: review-finding | rubric-item | mechanical-check | retired
trigger: conformance-revise | merged-better-exemplar | command-change | risk-boundary-change | n-commits-stale | major-refactor | no-qualified-neighbor
source_evidence: ["path/to/file.ts:12"]
confidence: multiple-examples
freshness: { verified_at: YYYY-MM-DD, commit: short-sha, scope: path-or-module }
notes: "Short rule."
```

If an entry lacks source evidence, confidence, and freshness, treat it as a lead, not a conformance rule.

## Memory Lifecycle

Soft conformance rules should graduate:

`review finding -> rubric item -> mechanical check (lint / fitness / hook / CI) -> prose RETIRED`

Remove, retire, or archive entries that are superseded. Do not let the adapter become an all-add prose blob.

## Update Triggers

Every living entry must name when it updates:

- `conformance-revise` — patch code or append/update do-not-copy/reuse probe; propose a fitness check if repeated
- `merged-better-exemplar` — refresh golden neighbor and demote/archive the older exemplar
- `command-change` — refresh command map and freshness stamp
- `risk-boundary-change` — refresh risk boundary and required gate evidence
- `n-commits-stale` — re-run codemap or verify affected entries
- `major-refactor` — re-extract snapshot and revalidate living entries
- `no-qualified-neighbor` — mark `Needs decision`; do not silently create a new pattern
- observability/error handling

Risk values are project-specific. The adapter should point to the files/folders that indicate risk.

## Adapter Output Format

Recommended output:

```md
# Project Adapter: {project/repo}

generated_at:
commit:
covered_modules:
known_omissions:

## Identity

## Stack

## Layout

## Commands

## Tests

## CI/CD

## Golden Neighbors

## Risk Surface

## Refresh Triggers
```

## Refresh Triggers

Refresh the adapter when:

- the freshness stamp is missing or stale
- a major dependency/framework changes
- folder structure changes
- new repo/module/package is added
- tests or CI are introduced or changed
- auth/payment/data/migration/API contract areas change
- a large feature or multi-repo task starts
- a route cannot find a qualified golden neighbor
- review finds that agents copied the wrong pattern

## Relationship To Routes

Adapter extraction does not implement features.

It prepares the project so the routes can work:

- Route A small feature uses golden neighbors and commands.
- Route B large feature uses layout, risk, twins, and commands.
- Route C bug fix uses layout, reproduction surface, and local patterns.
- Route D test-case extraction uses flows, product areas, and interfaces.
- Route E test automation uses test setup and CI.
- Route F unit/integration tests uses test framework, test command, fixtures, and neighbors.

## READY / DRAFT / MISSING Rule

When reporting adapter findings:

- READY: found in repo or docs with evidence
- DRAFT: described in docs but not wired or not verified
- MISSING: not found

Never treat a desired future convention as current project fact.

## Non-Goals

Adapter extraction should not:

- install dependencies
- create tests
- change source code
- rewrite conventions
- choose a new framework without approval
- run broad automation

It is read-only fact finding unless the user explicitly approves a later build step.
