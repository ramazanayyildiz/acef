# ACEF Brownfield Pilot Routes

Status: draft

This document covers the first ACEF pilot scope: existing codebases only.
Pre-SDLC idea/research/thinking/council work is out of scope here.

## Principle

The user says what they want. The system first routes the work, then runs only the SDLC parts needed for that route.
Not every job goes through every phase.

ACEF core is stack-agnostic. Routes are universal; stack-specific values come from the project's adapter.

This is a preparation document, not an instruction to start a pilot. No route should be executed until the route,
adapter, and expected artifact are clear.

## Universal vs Project Adapter

Universal ACEF rules:
- route the work before running the SDLC steps
- use codemap/project map for brownfield grounding
- select a qualified golden neighbor before implementation
- qualify the golden neighbor at file + symbol/contract level: the neighbor must match the actual hook, function signature, return shape, or contract the target consumes; file-level similarity alone is not enough
- bootstrap one approved test pattern when a repo has no tests
- keep heavy requirements/design/planning only for work that needs it

Project adapter values:
- language, framework, package manager
- repo/module layout
- test framework and test commands
- CI/CD commands and required checks
- accepted golden neighbors
- local code style and conventions
- risky areas: auth, payment, data, migrations, contracts, multi-repo boundaries

The adapter is extracted from the project. It is not hard-coded into ACEF.

## Project Adapter Extraction

Detailed source: `docs/ai/ACEF_PROJECT_ADAPTER_EXTRACTION.md`.

Run this before regular ACEF use in a new brownfield project, then refresh only when stale.

Minimum extraction:
1. Identify stack, package manager, and repo layout.
2. Identify existing test frameworks, test folders, and commands.
3. Identify CI/CD configuration and required checks.
4. Identify canonical examples/golden neighbors for common work.
5. Identify risky areas and do-not-copy legacy quirks.
6. Record codemap freshness: generated_at, commit hash, covered modules.

If no test pattern exists, the adapter records "no accepted test neighbor" and the first test task must bootstrap one.

## Agent Contract

The managing agent is a router and coordinator. It should not make the user remember routes, skills, or stack details.

User-facing behavior:
1. Ask only the minimum questions needed to classify the work.
2. State the selected route in one short sentence.
3. State what existing adapter facts will be used.
4. State what artifact will be produced next.
5. Ask for approval before creating files, changing code, installing tools, or running broad automation.

Internal behavior:
1. Check whether the project adapter exists and is fresh.
2. If the adapter is missing or stale, propose adapter extraction before route execution.
3. Select the route from the router questions.
4. Use only the SDLC steps required by that route.
5. Preserve READY / DRAFT / MISSING honesty labels when discussing capabilities.
6. Never present a document-only idea as an implemented skill.

Minimal user prompts by route:
- Small feature: goal, acceptance criteria, likely repo/module if known.
- Large feature: problem, target users, outcome, scope/non-goals, affected areas if known.
- Bug fix: expected behavior, actual behavior, reproduction path.
- Test-case extraction: product area, priority flows, platform.
- Test automation setup: repo, priority flow, existing test/CI status if known.
- Unit/integration tests: platform, module/component, risk or bug history.

## Router Questions

Use these questions before choosing a route:

1. Is this an existing codebase?
2. Is it a bug fix, feature work, test-case extraction, or test automation setup?
3. Which platform is affected: backend, mobile, web, or cross-platform?
4. Is the requirement already clear?
5. How many repos/modules are affected?
6. Does it introduce a new pattern, contract, data model, auth/payment behavior, migration, or user-flow change?
7. Are there existing golden neighbors to copy?
8. Are tests already present, or do we need to bootstrap the first test pattern?

## Route Decision Tree

1. If the request is about broken behavior, use Route C.
2. If the request is to extract test cases, use Route D.
3. If the request is to set up or write E2E/browser/device automation, use Route E.
4. If the request is to add unit/integration coverage, use Route F.
5. If the request is feature work:
   - Use Route A when the change is localized and follows an existing pattern.
   - Use Route B when it spans multiple modules/repos, changes a major user flow, introduces a new pattern/contract,
     or touches data/auth/payment/migration boundaries.
6. If size is unknown, start with the router questions and do not execute until Route A vs B vs C/D/E/F is clear.

## Per-Repo Adapter

This route document stays universal. The concrete stack/test/CI values for a given project live in that project's own
extracted adapter (see `acef-adapter`), not here.

Key finding from real use: adapter values are per repo, not just per platform. A single organization can have different
web stacks and different mobile patterns across repos, so each repo gets its own adapter.

## Routes

### Route A: Existing Codebase, Small Feature

Use when the work is localized and follows an existing pattern.

Minimum flow:
1. Short brief: goal, scope, non-goals, acceptance criteria.
2. Find golden neighbor in the same repo.
3. Implement by following local pattern.
4. Review.
5. Add/update tests only where the repo has a usable test pattern.

Before copying a golden neighbor, ground the copy at symbol/contract level:
- inspect the exact symbol the target consumes (hook return shape, function signature, type, data contract)
- compare that contract against the neighbor
- copy only the parts that match the consumed contract
- treat file-level similarity as insufficient

Do not create heavy requirements/design/planning documents unless the route escalates.

Escalate to Route B if there is no qualified golden neighbor, a new contract/pattern is needed, or multiple modules/repos are affected.

### Route B: Existing Codebase, Large Feature

Use when the work spans multiple modules/repos, changes a user flow, introduces a new pattern, or affects data/auth/payment/migration boundaries.

Minimum flow:
1. Brief intake: problem, users, outcome, scope, non-goals.
2. Requirements: user-facing behavior and acceptance criteria.
3. Design: affected modules, API/contracts, data flow, UI flow, risks.
4. Planning: story map or epic/story/task breakdown.
5. Implement in small slices, using golden neighbors where possible.
6. Review/test each slice.

BMAD/Kiro outputs may be used as inputs if they already exist. Do not regenerate the same artifacts twice.

### Route C: Existing Codebase, Bug Fix

Use when the goal is to correct known broken behavior.

Minimum flow:
1. Bug brief: expected behavior, actual behavior, reproduction path.
2. Root cause analysis.
3. Minimal fix following local pattern.
4. Regression test if a test pattern exists.
5. Review.

Requirements/design/planning are normally skipped unless the fix reveals a larger feature or architecture change.

### Route D: Existing Codebase, Test Case Extraction

Use when the goal is to produce manual or structured test cases from existing products.

Minimum flow:
1. Pick product/repo and priority area.
2. Extract user flows from UI/API/docs/code.
3. Convert each flow to acceptance criteria.
4. Convert acceptance criteria to test cases:
   - precondition
   - steps
   - expected result
   - test type
   - priority
5. Mark automation candidates.

This route produces test cases first. Automation is a separate route.

### Route E: Existing Codebase, Test Automation Setup

Use when the repo needs the first automation foundation or a new test stack.

Minimum flow:
1. Inspect existing tests and CI.
2. If tests exist, choose a golden test neighbor.
3. If no tests exist, bootstrap one approved test pattern first.
4. Define test command and location.
5. Automate a small high-value flow.
6. Run it and record evidence.

Do not generate broad automation before a test pattern is accepted.

### Route F: Existing Codebase, Unit/Integration Test Expansion

Use when the goal is to add unit/integration coverage to backend, web, mobile, or any other project-specific platform.

Minimum flow:
1. Identify target platform, module, and risk.
2. Inspect existing unit/integration test pattern from the project adapter.
3. If no pattern exists, bootstrap one small example and approve it.
4. Add focused tests around behavior, not implementation details.
5. Run relevant test command.
6. Review failures and update the test map if one exists.

The exact framework and command come from the project adapter. Do not assume xUnit, Jest, Vitest, Playwright, Detox,
or any other tool unless the adapter found it in the project.

Before reusing a test neighbor, qualify the exact test contract:
- framework and runner
- setup/fixture requirements
- environment mode (jsdom/node/native)
- the smallest symbol/behavior under test
- whether the neighbor is a real contract match or only a file-level match

## Example Case Mappings

These show how real requests map to routes. Names are generic — substitute your own project.

### 1. A production application, large feature

Route: B

Reason: large feature work on an existing production application needs requirements, design, planning, and sliced implementation.

Start with: affected repos/modules; user flow; existing similar features; risk areas.

### 2. A production application, small feature

Route: A

Reason: small localized changes should stay lightweight and code-grounded.

Start with: short brief; acceptance criteria; golden neighbor; files/modules likely touched.

### 3. A project with no test automation yet

Routes: E, then A or B depending on feature size

Reason: first create or verify the test automation foundation, then route feature work separately.

Start with: repo path; current test setup; priority flow; whether the project has existing CI.

### 4. Test-case extraction, then automation

Routes: D, then E

Reason: test cases should be extracted before automation so the automation has a clear oracle.

Start with: product area; priority user flows; platform (backend, web, mobile, or cross-platform).

### 5. Unit/integration tests across platforms

Route: F

Reason: unit/integration tests need stack-specific patterns across backend, web, and mobile. They should not be mixed with E2E flow automation.

Start with: platform; module/service/component; existing test pattern; test command; risk or bug history.

## Preparation Checklist Before Any Execution

For each selected case, confirm:

1. Route is selected and written down.
2. Project adapter exists or adapter extraction is explicitly the next task.
3. Codemap/project map has freshness metadata or is marked stale.
4. Golden neighbor exists or "no accepted neighbor" is recorded.
5. Required output artifact is clear: brief, requirements, design, tasks, test cases, tests, or review.
6. Any missing skill/tool is labeled DRAFT or MISSING, not READY.
7. User has explicitly approved execution if files/code/tools will be changed.

## Honest Status

ACEF's skills are DRAFT: the definitions and route logic exist and have been lightly exercised, but they are not
battle-tested. Treat them as a starting framework to apply and harden on your own repo, not a finished product.

Areas still being hardened:

1. Brief intake flow for existing-codebase work.
2. Project Adapter Extraction as a generalized, reusable skill.
3. Requirements/design/planning flow for large features (imports BMAD/Kiro output; native flow still maturing).
4. Storymap-to-task traceability.
5. Test automation patterns generalized across stacks.
6. A unit/integration test bootstrap process that works for any detected stack.
