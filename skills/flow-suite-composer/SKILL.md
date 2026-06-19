---
name: flow-suite-composer
version: 1.0.0
description: "Compose deliverable-grade flow test suites from flow documents and test plans. The final composition layer that turns planning artifacts into executable test documentation. Use this skill when the user wants to create a complete test suite for a user flow, compose test cases into a QA deliverable, generate an integration test list, map test cases to automation targets (Dusk/Playwright/PHPUnit), or produce a regression pack. Also triggers on: 'compose test suite', 'create flow suite', 'build the test suite', 'QA deliverable', 'regression pack for this flow', 'what bugs does this catch'. This skill composes — it does not discover or generate code."
---

# Flow Suite Composer

Turns a validated flow document and test planning artifacts into a deliverable-grade flow test suite. This is the composition layer — it organizes existing evidence into a complete testing deliverable that QA can execute and developers can automate.

This skill restores the historical `docs/test-cases/flows/*` layer that made the old CRM test documentation effective.

## Pipeline Position

```
flow-document-composer ─→ test-case-planner ─→ [flow-suite-composer]
                                                  ↑
                          test-risk-classifier ──┘ (optional)
```

This is the LAST skill in the planning pipeline. Its output goes to humans (QA execution) or to test-generator/test-browser-generator (code generation).

---

## When to Use

- After test-case-planner has produced a plan from a flow document
- When QA needs a complete, executable test suite document
- When developers need an automation mapping (which cases → which framework)
- When building regression packs for release testing
- When you need to answer "what bugs does this test suite catch?"

---

## Inputs

**Required:**
1. **Flow document** (`artifact: "flow-document"`) — the journey being tested
2. **Test case plan** (`artifact: "test-case-plan"`) — the cases to compose into a suite

**Optional but valuable:**
3. **Risk profile** (`artifact: "risk-profile"`) — sharpens criticality, highlights regression hotspots
4. **Module-level test references** — existing unit/integration tests to avoid duplicating
5. **Browser test references** — existing Dusk/Playwright tests to map against
6. **Integration row exports** — existing backend test rows

**When risk-profile is present:** Use it to:
- Elevate priority of high-risk cases
- Add regression hotspot warnings
- Identify hidden side effects that need cross-flow cases

---

## Workflow

### Step 1: Load and Validate Inputs

Read the flow document and test case plan. Verify:
- Flow document has the 13 required sections
- Test case plan references the same flow/components
- If risk-profile exists, merge its insights

If inputs are incomplete, ask: "I need both a flow document and a test case plan. Which is missing?"

### Step 2: Classify Existing Module Coverage

Check if module-level tests already cover some scenarios:
- Read existing test files if paths are provided
- Identify which cases are already covered at module level
- Mark these in `relationship_to_module_tests.deliberately_avoids_duplicating`
- Only include them in the suite if the flow needs an end-to-end expression

The goal is to avoid duplication while ensuring flow-level coverage.

### Step 3: Categorize Scenarios

Classify every case into exactly one category:

| Category | What it tests | Example |
|---|---|---|
| **happy_path** | Normal successful flow | Create user with all valid fields |
| **negative** | Deliberately wrong input | Submit form with invalid email |
| **boundary** | Edge of valid range | Name at exactly 255 characters |
| **validation** | Input validation rules | Required field missing |
| **error_handling** | System error recovery | Database connection fails mid-save |
| **edge** | Unusual but valid scenario | Create user with Unicode name |
| **permission** | Auth/role enforcement | Non-admin tries to create user |

Count each category. A well-balanced suite should have cases across most categories — if a category is empty, note why in unknowns.

### Step 4: Write Bug Rationale

For EVERY case (or grouped set of related cases), write `what_bug_this_catches`. This is what made the old CRM flow suites strong — they told the reader WHY each case matters.

Good rationale:
- "Catches: email uniqueness constraint bypass when concurrent admins create users"
- "Catches: orphaned billing records when subscription deleted without cascade"

Bad rationale:
- "Tests the feature works" (too vague)
- "Verifies correctness" (says nothing)

If you can't articulate a specific bug, use a conservative failure rationale: "Guards against regression in {component} when {condition} changes."

### Step 5: Distinguish Test Types

Explicitly separate each case by execution type:

| Type | Who executes | How |
|---|---|---|
| **browser** | Dusk/Playwright | Click-through in real browser |
| **integration** | PHPUnit/pytest feature test | HTTP request + DB assertion |
| **backend** | PHPUnit/pytest unit test | Direct service call |
| **manual** | Human tester | Visual check, cross-system verification |

Don't pretend a backend webhook is browser-testable. Be honest about what requires manual verification.

### Step 6: Map to Automation Targets

For each case, identify the likely automation framework:

```json
{
  "case_id": "FLOW-03-TC-001",
  "automation_candidates": ["dusk"],
  "target_file": "tests/Browser/UserManagement/CreateUserTest.php",
  "notes": "Full browser flow, needs UserFactory seeding"
}
```

This mapping helps developers know exactly where to implement each case.

### Step 7: Generate Regression Pack Subsets

Tag each case with regression applicability:

- **smoke**: minimum verification (happy paths only, ~5-10 cases)
- **critical**: all P0 cases + key negative scenarios
- **full**: everything in the suite
- **backend-only**: cases that don't need a browser
- **browser-only**: cases that require browser execution

### Step 8: Compose the Suite

Produce all output artifacts.

---

## Output: JSON Schema

```json
{
  "artifact": "flow-suite",
  "version": "1",
  "project": "{project}",
  "flow_id": "FL-{NNN}",
  "title": "End-to-End User Management Lifecycle",
  "source_artifacts": ["flow-document", "test-case-plan"],
  "relationship_to_module_tests": {
    "covers": ["UserService CRUD tested at module level"],
    "deliberately_avoids_duplicating": ["UserService::create unit tests", "UserForm validation unit tests"]
  },
  "scenario_checklist": {
    "happy_path": 3,
    "negative": 4,
    "boundary": 2,
    "validation": 5,
    "error_handling": 2,
    "edge": 1,
    "permission": 3
  },
  "cases": [
    {
      "case_id": "FLOW-03-TC-001",
      "title": "Happy path — Create user with all fields",
      "priority": "P0",
      "type": "browser",
      "category": "happy_path",
      "regression_pack": ["smoke", "critical", "full", "browser-only"],
      "flow_steps_covered": [1, 2, 3],
      "preconditions": ["Admin is logged in", "Team exists"],
      "steps": [
        "Navigate to /admin/users/create",
        "Fill all fields with valid data",
        "Click Save",
        "Verify redirect to user list",
        "Verify new user appears in table"
      ],
      "expected_result": "User created, success flash shown, user visible in list",
      "what_bug_this_catches": "Catches: form submission silently failing when Livewire component state is lost between render cycles",
      "automation_candidates": ["dusk"],
      "code_refs": ["ManageUsers.php:78", "UserService.php:create()"]
    }
  ],
  "integration_rows": [
    {
      "row_id": "INT-001",
      "description": "POST /admin/users with valid payload creates user record",
      "method": "POST",
      "endpoint": "/admin/users",
      "payload_shape": {"name": "string", "email": "string", "role": "string"},
      "expected_status": 200,
      "expected_side_effects": ["user record in DB", "welcome email sent"],
      "automation_target": "phpunit-feature"
    }
  ],
  "automation_mapping": [
    {
      "case_id": "FLOW-03-TC-001",
      "framework": "dusk",
      "target_file": "tests/Browser/UserManagement/CreateUserTest.php",
      "notes": "Needs UserFactory, TeamFactory seeding"
    }
  ],
  "regression_packs": {
    "smoke": ["FLOW-03-TC-001", "FLOW-03-TC-005"],
    "critical": ["FLOW-03-TC-001", "FLOW-03-TC-002", "FLOW-03-TC-005", "FLOW-03-TC-008"],
    "backend_only": ["FLOW-03-TC-010", "FLOW-03-TC-011"],
    "browser_only": ["FLOW-03-TC-001", "FLOW-03-TC-002", "FLOW-03-TC-003"]
  },
  "assumptions": [],
  "unknowns": [],
  "next_skill": "test-generator|test-browser-generator"
}
```

---

## Output: Markdown Template

```markdown
# Flow Test Suite: {title}

**Flow ID**: {flow_id}
**Source**: {source artifacts}
**Total cases**: {count}

## Flow Overview
{brief narrative from flow document}

## Source References
- Flow document: {path}
- Test case plan: {path}
- Risk profile: {path or "not provided"}

## Routes Tested
| Method | Path | Handler |
|---|---|---|
| GET | /admin/users/create | ManageUsers::render |
| POST | /admin/users | ManageUsers::save |

## Relationship to Module Tests
**Already covered at module level** (not duplicated here):
- {list}

**Covered here because flow-level expression is needed**:
- {list}

## Scenario Checklist
| Category | Count |
|---|---|
| Happy path | {n} |
| Negative | {n} |
| Boundary | {n} |
| Validation | {n} |
| Error handling | {n} |
| Edge | {n} |
| Permission | {n} |

## Test Cases

### FLOW-{NN}-TC-001: {title}
- **Priority**: P0
- **Type**: browser
- **Category**: happy_path
- **Regression pack**: smoke, critical, full
- **Flow steps covered**: 1, 2, 3
- **Preconditions**: {list}
- **Steps**:
  1. {step}
  2. {step}
- **Expected result**: {what should happen}
- **What bug this catches**: {specific bug or regression risk}
- **Automation**: dusk → `tests/Browser/UserManagement/CreateUserTest.php`

---

## Integration Rows
| ID | Endpoint | Method | Expected | Side Effects |
|---|---|---|---|---|
| INT-001 | /admin/users | POST | 200 | user record, welcome email |

## Automation Mapping
| Case | Framework | Target File | Notes |
|---|---|---|---|
| TC-001 | dusk | tests/Browser/.../CreateUserTest.php | Needs factories |

## Regression Packs
- **Smoke** ({n} cases): {list}
- **Critical** ({n} cases): {list}
- **Backend-only** ({n} cases): {list}
- **Browser-only** ({n} cases): {list}

## Out of Scope / Not Duplicated
{what this suite deliberately does not test and why}

## Assumptions / Unknowns
{list or "none"}
```

---

## Behavior Rules

1. **Compose, do not hallucinate** — This skill reorganizes and densifies known information from upstream artifacts. It does not invent new behaviors, hidden state machines, or bugs beyond what the flow document and test plan provide. If something seems missing, flag it as an unknown.

2. **Avoid duplication** — If module-level tests already cover a case, note it in `relationship_to_module_tests` and skip it — unless the flow needs an end-to-end expression. The old CRM suites were disciplined about this separation.

3. **Every case needs a bug rationale** — `what_bug_this_catches` is mandatory. This is what separates a useful test suite from a checkbox exercise. If you can't articulate a specific bug, use "Guards against regression in {component} when {condition} changes."

4. **Distinguish browser vs backend** — Not every case is browser-automatable. The suite must explicitly separate browser-visible cases from backend integration cases from manual-only checks. Honesty here saves QA time.

5. **Support regression packs** — Tag cases so teams can derive smoke, critical, backend-only, and browser-only subsets without re-analyzing the full suite.

---

## What This Skill Does NOT Do

- Generate executable test code (that's test-generator / test-browser-generator)
- Discover new flows (that's storymap / flow-document-composer)
- Plan test cases (that's test-case-planner)
- Classify risk (that's test-risk-classifier)

This skill composes a deliverable. It takes finished planning artifacts and makes them usable.
