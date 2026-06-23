---
name: test-risk-classifier
version: 1.0.0
description: 'Analyze any class or module and produce a structured Risk Profile before
  tests are written. Enumerates branches, side effects, dependencies, complexity,
  and preconditions per method. Framework-aware — currently Laravel/PHP reference
  files included. Node.js, Django, and others can be added via references/{framework}-fakes.md.
  Triggers on: "classify risk", "risk profile for", "analyze for testing", "what are
  the risks in", "enumerate branches", "analyze before writing tests". Does NOT trigger
  on: "plan tests" — that is test-case-planner. Does NOT trigger on: "generate tests"
  — that is test-generator. Run this AFTER test-case-planner and BEFORE test-generator.

  '
permalink: ram/04-ai-toolkit/skills/test/test-risk-classifier/skill
---

# Test Risk Classifier

**Pipeline position: Step 2 of 3**
```
test-case-planner → [test-risk-classifier] → test-generator
```

Takes a class or module (and optionally a test case plan from `test-case-planner`)
and produces a structured **Risk Profile** — a machine-readable analysis that tells
the test generator exactly what to focus on, what to mock, how many cases to generate
per method, and why.

Framework-extensible core (currently has Laravel mock/fake references). For framework-specific mappings, see:
- `references/laravel-fakes.md` — Laravel facades and test helpers
- Add more framework references as needed

Do NOT write any test code. Do NOT repeat the planner's output.
Output the Risk Profile document and nothing else.

---

## When to Use This Skill

Run this skill when:
- You have a class or module ready to be tested
- You have output from `test-case-planner` and want to enrich it before generating code
- You want to understand complexity and risk distribution before committing to a test strategy

Run AFTER `test-case-planner`, BEFORE `test-generator`.

---

## Workflow

```
1. Ingest → 2. Method-Level Analysis (5 Lenses) → 3. Class-Level Summary → 4. Output Risk Profile
```

---

## Step 1: Ingest

Read everything provided:
- The source file(s)
- Any existing test files for this class (to detect existing coverage)
- The planner output if available (from `test-case-planner`)

Identify the language and framework.
Extract the full list of **public methods / exported functions** from the class.
Ignore private/protected/internal methods — they are tested through public interfaces.

If no files are provided, ask the user to paste the class or module.

---

## Step 2: Method-Level Analysis

For every public method, run all 5 lenses and record findings.

---

### Lens A: Branch Enumeration

Walk every conditional and list each path as a separate testable scenario.

Count and list:
- `if / else / elseif / elif` blocks
- `switch / match` expressions (each arm = one branch)
- Ternary operators containing business logic
- Early `return` / `throw` statements (each = one exit path)
- `null` / `undefined` checks that change behavior
- `try / catch / except` blocks (success path + each catch = separate branches)
- Guard clauses at method start
- Loop conditions that affect output (empty collection vs non-empty)

**Output per method:**
```
Branches:
  - [B1] User has active subscription → proceeds to publish
  - [B2] Subscription expired → throws SubscriptionExpiredException
  - [B3] Item already published → returns early with false
  - [B4] External service throws → caught, logged, re-thrown as AppException
Branch count: 4
```

---

### Lens B: Side Effect Inventory

List everything the method does to the outside world.
Each side effect = one separate assertion obligation for the test generator.

Universal categories:
| Category | Examples (language-agnostic) |
|---|---|
| DB write | insert, update, delete, upsert, save |
| DB read (behavior-affecting) | only flag if result changes flow |
| Event / message dispatch | emit, publish, dispatch, trigger |
| Queue / background job | enqueue, push, schedule, delay |
| Email / notification | send mail, push notification, SMS, webhook |
| HTTP call (outbound) | fetch, axios, requests.post, http client |
| Cache write | set, put, remember, invalidate, flush |
| File system | write, delete, move, upload to storage |
| Logging (business-critical) | only flag if logging drives behavior |
| Session / cookie | set session value, queue cookie |

**Output per method:**
```
Side Effects:
  - [SE1] DB: updates item status column to 'published'
  - [SE2] EVENT: dispatches ItemPublished event
  - [SE3] QUEUE: enqueues DistributeItemJob
  - [SE4] EMAIL: sends PublishedConfirmation to item owner
Side effect count: 4
```

---

### Lens C: Dependency Classification

List every external dependency the method touches and classify each.
Use framework-specific reference files for exact mock/fake syntax.

| Classification | Description | Test implication |
|---|---|---|
| `PURE` | No external deps, deterministic input→output | Unit test, no mocks needed |
| `DB` | Database reads or writes | Use test DB / in-memory / transaction rollback |
| `HTTP` | Outbound HTTP calls to external APIs | Intercept / stub the HTTP client |
| `QUEUE` | Job or task dispatching | Intercept queue, assert job pushed |
| `EVENT` | Event or message dispatching | Intercept event bus, assert emitted |
| `EMAIL` | Email or notification sending | Intercept mailer, assert sent |
| `CACHE` | Cache reads or writes | Use test cache driver or mock |
| `FILESYSTEM` | Storage reads or writes | Use virtual/fake filesystem |
| `TIME` | Uses current date/time | Control clock in tests |
| `RANDOM` | Uses random values, UUIDs | Seed or stub random source |
| `CONFIG` | Reads config/env values that affect logic | Set config values in test setup |
| `AUTH` | Reads current user / session / token | Set auth state in test setup |
| `FRAMEWORK` | Framework container, DI, lifecycle hooks | Use framework test helpers |

**Output per method:**
```
Dependencies:
  - SubscriptionService [FRAMEWORK + DB] → mock the service, use test DB
  - EventBus [EVENT] → intercept and assert
  - Queue [QUEUE] → intercept and assert job pushed
  - DateTime.now() [TIME] → freeze clock in test
  - HttpClient [HTTP] → stub with fake response
```

For framework-specific fake/mock syntax, read:
- Laravel: `references/laravel-fakes.md`

---

### Lens D: Complexity Score

Score each method using this formula:

```
Score = branch_count + side_effect_count + dependency_count + precondition_count
```

Map to tier:

| Score | Tier | Meaning |
|---|---|---|
| 1–3 | 🟢 LOW | Simple — few cases needed |
| 4–6 | 🟡 MEDIUM | Standard coverage — include edge cases |
| 7–10 | 🔴 HIGH | Thorough coverage required — prioritize this method |
| 10+ | 🚨 CRITICAL | Consider refactoring before testing |

**Output per method:**
```
Complexity:
  Score: 4 (branches) + 4 (side effects) + 5 (deps) + 2 (preconditions) = 15
  Tier: 🚨 CRITICAL
  Note: High complexity — consider decomposing this method before writing tests
```

---

### Lens E: Invariants and Preconditions

List what must be true BEFORE the method can run correctly.
These become the setup / arrange section of each test.

Categories:
- Entity must exist in DB with specific state or status
- User must be authenticated / have specific role or permission
- Feature flag must be enabled or disabled
- Config or environment value must be set
- Related entities must exist (foreign key or dependency constraints)
- Time-sensitive state (e.g. subscription not expired, token not stale)
- External service must be available (or mocked)
- Previous step in a flow must have completed

**Output per method:**
```
Preconditions:
  - [P1] Item must exist in DB with status = 'draft'
  - [P2] Item must belong to the authenticated user
  - [P3] User must have an active (non-expired) subscription
  - [P4] Payment service must be available (mock for unit, real for integration)
```

---

## Step 3: Class-Level Summary

After analyzing all methods, produce a class-level overview.

**Coverage Gap Detection**
If existing tests were provided, compare against the public method list:
- Which public methods have zero test coverage?
- Which methods have happy-path tests but no failure / edge case tests?
- Which side effects are never asserted in existing tests?

**Recommended Test Strategy**
Based on the dependency mix across the class:
- Ratio of unit vs integration vs e2e tests
- Whether a dedicated test file per method is warranted
- Whether any 🚨 CRITICAL methods should be refactored before testing

**Global Mock / Fake Setup**
List all interceptors and fakes needed across the entire class in one place,
so the test generator can initialize them in a shared setup block:
```
Global setup needed:
  - Intercept event bus (EVENT)
  - Intercept queue (QUEUE)
  - Freeze clock at fixed datetime (TIME)
  - Stub HTTP client with fixture responses (HTTP)
```

---

## Step 4: Output — The Risk Profile

Output in this exact structure.
This document is the primary input for `test-generator`.

```markdown
## Risk Profile: {ClassName / ModuleName}
Generated: {date}
Language / Framework: {detected stack}
Source: {filename}
Existing tests found: yes / no

---

### Class Overview
Type: {Controller | Service | Model | Job | Handler | Composable | ...}
Public methods: {n}
Overall risk: 🟢 LOW | 🟡 MEDIUM | 🔴 HIGH | 🚨 CRITICAL
Recommended test ratio: {n}% Unit / {n}% Integration / {n}% E2E

---

### Global Mock / Fake Setup
Initialize these in the test suite's setup block:
- {interceptor 1}
- {interceptor 2}

---

### Method Risk Profiles

#### {methodName}({params})
**Complexity**: 🟢/🟡/🔴/🚨 — Score: {n}

**Branches** ({n} total):
- [B1] {description} → {outcome}
- [B2] {description} → {outcome}

**Side Effects** ({n} total):
- [SE1] {CATEGORY}: {description}
- [SE2] {CATEGORY}: {description}

**Dependencies**:
- {dependency} [{classification}] → {test implication}

**Preconditions**:
- [P1] {condition}
- [P2] {condition}

**Recommended minimum test count**: {n}
**Priority**: 🔴 Critical | 🟡 Important | 🟢 Nice to have

---

#### {nextMethod}(...)
...

---

### Coverage Gap Analysis
{Only present if existing tests were provided}

Missing coverage:
- {methodName}: no tests at all
- {methodName}: happy path only — missing {branch} and {side effect} assertions

Redundant tests detected:
- {description if any}

---

### Refactor Recommendations
{Only present if CRITICAL complexity methods exist}

- {methodName} (score {n}): {specific recommendation}

---

### Handoff to test-generator
Paste this Risk Profile along with the original source file into your next message,
then trigger `test-generator` to produce the test file.

---

### Handoff Block (machine-readable)

Always append this block at the end of every Risk Profile output.
Schema defined in `shared/handoff-schema.md` § "Risk Profile Handoff".

```json
{
  "artifact": "risk-profile",
  "version": "1",
  "subject": "{ClassName}",
  "source_file": "path/to/file.ext",
  "framework": "{laravel|nodejs|python|swift|unknown}",
  "class_tier": "LOW|MEDIUM|HIGH|CRITICAL",
  "complexity_score": 0,
  "methods": [
    {
      "name": "authenticate",
      "tier": "HIGH",
      "complexity_score": 8,
      "branches": [
        { "id": "B1", "description": "valid credentials", "type": "if" }
      ],
      "side_effects": [
        { "id": "SE1", "type": "DB", "description": "writes login timestamp" }
      ],
      "dependencies": [
        { "id": "D1", "type": "service", "name": "PasswordHasher" }
      ],
      "preconditions": [
        { "id": "P1", "description": "user must exist in database" }
      ],
      "recommended_test_count": 8,
      "linked_case_ids": ["U-001", "U-002"]
    }
  ],
  "global_side_effects": [],
  "global_mocks_needed": [],
  "method_tiers": { "LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0 },
  "next_skill": "test-generator",
  "unknowns": []
}
```

**Rules:**
- `linked_case_ids` connects back to test-case-plan case_ids for traceability
- `recommended_test_count` calibration: LOW=2-4, MEDIUM=5-8, HIGH=8-15, CRITICAL=15+
- Complexity formula: `(branches × 1.0) + (side_effects × 1.5) + (dependencies × 1.0) + (preconditions × 1.2)`
- Side effect types: DB | EVENT | QUEUE | EMAIL | HTTP | CACHE | FILESYSTEM | LOG
- `unknowns`: list anything assumed. Generator reads these and asks for missing info.

---

## What NOT to Do

- Do not write any test code
- Do not reproduce the planner's test case list
- Do not analyze private, protected, or internal methods
- Do not flag framework internals as risks
- Do not recommend mocking what can be tested cheaply with real implementations
- Do not over-score simple CRUD methods with no branches — a plain getter is 🟢 LOW
