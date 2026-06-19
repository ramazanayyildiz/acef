---
title: SKILL
type: note
permalink: ram/04-ai-toolkit/skills/test/test-strategy/skill
---

# Test Strategy

Unified orchestrator for test planning. Detects your scenario and guides you through the right pipeline.

**Trigger phrases:** "test strategy for", "how should I test", "plan testing for", "where do I start testing"

---

## Step 0: Detect Your Scenario

Before anything else, determine which scenario applies:

| Scenario | Trigger | You have... |
|---|---|---|
| **A: New Project** | `--new-project` or "no tests exist" | A codebase with zero or near-zero test coverage |
| **B: Coverage Gap** | `--coverage-gap` or "fill gaps" | Existing tests, but known or suspected gaps |
| **C: New Feature** | `--new-feature` or "test this feature" | A specific feature you just built or are building |

If not specified, ask: "Is this a new project with no tests, filling gaps in existing tests, or testing a new feature?"

---

## Scenario A: New Project

### Your Situation
You have working code but no tests. You need a starting point, not a wall of tests. The goal is to cover your CRITICAL paths first, then expand.

### Pipeline
```
test-user-flow-mapper → test-case-planner → test-risk-classifier → test-generator
                                                                  → test-browser-generator
```

### Step A1: Map Your User Flows
**Skill**: `test-user-flow-mapper`

Provide:
- Your route list (`php artisan route:list`, route files, or API docs)
- A brief description of what your app does
- Any screen mockups or UI flows you have

The mapper will identify all user journeys and prioritize them. Start with the top 2-3 CRITICAL flows.

### Step A2: Plan Test Cases for the First Flow
**Skill**: `test-case-planner`

Take the first CRITICAL flow from Step A1 and pass the source files for each component in that flow to the planner.

You'll get a structured test case plan with prioritized cases across 8 categories. Don't try to plan all flows at once — do one flow end-to-end, then repeat.

### Step A3: Classify Risk for Each Component
**Skill**: `test-risk-classifier`

Pass each source file from the flow + the test case plan to the classifier. You'll get a Risk Profile with complexity scores and mock recommendations.

### Step A4: Generate Tests
**Skill**: `test-generator`

Pass the Risk Profile + source file. You'll get a complete test file with all cases mapped from the Risk Profile IDs.

### Step A5: Add Browser Tests for Critical Flows
**Skill**: `test-browser-generator`

For flows that involve a user interacting with a UI, pass the Section B (Browser) cases from the planner. Get Playwright or Dusk test files.

### Pacing Guide

**Week 1**: Complete the pipeline for your 2-3 CRITICAL flows.
This gives you a safety net for the most important paths.

**Week 2-3**: Work through IMPORTANT flows using the same pipeline.

**Ongoing**: Use `--new-feature` for every new feature going forward.
Run `test-coverage-auditor` monthly to find gaps that accumulated.

### When Tests Fail — Re-entry Points

The pipeline is iterative, not one-shot. Common failure scenarios and where to re-enter:

| Situation | Re-entry point |
|---|---|
| Generated tests don't compile | Fix in-place — check imports, class names, factory states |
| Tests fail because source has a bug | This is the test working correctly — fix the source code |
| Risk profile missed complexity | Re-run `test-risk-classifier` on just that method with the error context |
| Coverage auditor shows gap after generation | Re-run `test-coverage-auditor` on the specific file |
| Tests are flaky (pass/fail randomly) | Usually a missing fake or time dependency — re-run `test-risk-classifier` |
| Scope was wrong (wrong class, wrong flow) | Return to `test-user-flow-mapper` and re-identify the component |

**Rule**: When a test fails, read the error before asking for more tests. A failing test is information.

---

## Scenario B: Coverage Gap

### Your Situation
You have some tests, but you know there are gaps. Maybe a module has no tests, or your tests only cover happy paths, or a bug slipped through because a path wasn't tested.

### Pipeline
```
test-coverage-auditor → test-risk-classifier → test-generator
                                              → test-browser-generator
```

### Step B1: Audit What Exists
**Skill**: `test-coverage-auditor`

**Two modes — pick one:**

**Quick Scan** (start here if you don't know where the gaps are):
- Provide your source directory and test directory
- In Claude Code: the auditor will run `find` and `grep` commands automatically
- Get a full picture in one pass

**Deep Audit** (if you already know which module to focus on):
- Provide the specific module's source files and its test file
- Get method-level gap analysis

**What you get**:
- A prioritized list of gaps: 🔴 No tests, 🟠 Happy path only, 🟡 Partial
- Routes without coverage
- Test quality issues (no auth tests, missing fake assertions, etc.)
- A recommended order to fill gaps

**Decision point**: Look at the top 3 items in the priority list. Those are your next 3 tasks. Don't try to fix everything at once.

### Step B2: Classify Risk of the Top Gap
**Skill**: `test-risk-classifier`

Take the #1 gap from the audit and pass it through risk classification. This tells you exactly how many tests you need and what to mock.

### Step B3: Generate the Missing Tests
**Skill**: `test-generator`

Pass the Risk Profile + source file. Get the test file that fills the gap.

Repeat Steps B2-B3 for each gap in priority order.

### Step B4: Add Browser Tests if Critical Flows Lack E2E
**Skill**: `test-browser-generator`

If the audit revealed critical user flows with no browser coverage, generate E2E tests for those flows.

### Pacing Guide

**Session 1**: Run the audit. Get the full picture. Pick top 3 gaps.

**Session 2-4**: Fill the top 3 gaps using Steps B2-B3. One class per session.

**Weekly**: Re-run a quick audit scan to check progress and find new gaps
(new code often ships without tests).

**Monthly**: Run `test-coverage-auditor` in Deep Audit mode on your
highest-traffic or most error-prone modules.

### Quick Wins to Look For

While filling gaps, watch for these high-value, low-effort additions:

**Auth tests** — if any route is tested without authentication state, add:
- One test as unauthenticated → expect 401/redirect
- One test as wrong role → expect 403

**Validation tests** — for every validator or form request, add:
- One test with each required field missing
- One test with each format rule violated

**Side effect assertions** — for any test that dispatches a job or fires an event, add assertions that the side effect actually happened. These are one-liners that dramatically improve test quality with minimal effort.

---

## Scenario C: New Feature

### Your Situation
You just built (or are building) a specific feature. You need to test what you changed without over-testing unrelated code.

### Pipeline
```
[scope] → test-user-flow-mapper → test-case-planner → test-risk-classifier → test-generator
                                                                             → test-browser-generator
       → [regression check]
```

### Step C1: Scope the Feature

Before triggering any skill, answer these questions:

**What changed?**
List every file you created or modified:
```
New files:
  - app/Services/TranslationService.php
  - app/Jobs/TranslateContentJob.php
  - app/Events/ContentTranslated.php

Modified files:
  - app/Http/Controllers/PressReleaseController.php  (added translate() action)
  - app/Models/PressRelease.php  (added translations relation)
  - routes/api.php  (added POST /press-releases/{id}/translate)
```

**Is this user-facing?**
- Yes → run `test-user-flow-mapper` for the new flow first (Step C2)
- No (internal service, CLI command, background job) → skip to Step C3

**Does this touch existing critical paths?**
- Did you modify a controller that already has tests?
- Did you change a model that other features depend on?
- Did you add a new event listener to an existing event?

If yes → note those for regression checking in Step C6.

**Is this a pure addition or does it change existing behavior?**
- Pure addition → only test new code
- Changes existing behavior → also update existing tests + check regression

### Step C2: Map the New User Flow (if user-facing)
**Skill**: `test-user-flow-mapper`

Only map the NEW flow, not the entire app. If the feature adds a flow to an existing journey, map just the new segment.

### Step C3: Plan Test Cases for Each New Component
**Skill**: `test-case-planner`

Pass each new/modified source file to the planner. Focus on the changes, not the entire class.

### Step C4: Classify Risk for Each New Component
**Skill**: `test-risk-classifier`

Risk-classify each new/modified component. Pay special attention to modified files — they carry regression risk.

### Step C5: Generate Tests
**Skill**: `test-generator`

Generate tests for each component.

### Step C6: Regression Check

After generating tests for all new components, do this checklist:

**Did you modify an existing class?**
- Find tests that reference the modified class
- Check if your change could break any existing test
- If yes, update the test to match the new behavior

**Did you add a new event listener to an existing event?**
- Find the test that fires that event
- Add assertion that your new listener was triggered

**Did you change a model?**
- Find all tests that create or use that model
- Check if your new field, relation, or scope breaks any existing factory or assertion

**Did you change a shared service?**
- Find all tests that use that service (directly or via controller)
- Run those tests specifically after your changes

**Run the full suite.** All existing tests must still pass. If they don't, fix the regression before shipping.

### Step C7: Add Browser Test for User-Facing Features
**Skill**: `test-browser-generator`

If the feature adds or modifies a user-facing flow, generate browser tests for the new path.

### Scope Reminder

**Only test what you changed.** Resist the urge to improve coverage of unrelated existing code while you're here. That's what `--coverage-gap` is for — run it separately when you have dedicated time.

One exception: if you discover an existing component is completely untested AND your change touches it, add a note to the `test-coverage-auditor` backlog and move on.

---

## Handoff Block

At the end of strategy output, emit a plan:

```json
{
  "artifact": "test-strategy",
  "version": "1",
  "scenario": "new-project|coverage-gap|new-feature",
  "scope": {
    "new_files": [],
    "modified_files": [],
    "target_flows": [],
    "regression_risks": []
  },
  "pipeline": [
    { "step": 1, "skill": "test-user-flow-mapper", "status": "pending" },
    { "step": 2, "skill": "test-case-planner", "status": "pending" }
  ],
  "next_skill": "test-user-flow-mapper|test-coverage-auditor",
  "unknowns": []
}
```

---

## What NOT to Do

- Don't skip scoping (Step C1) for new features — it prevents over-testing
- Don't try to fill ALL gaps in one session — pick top 3
- Don't generate tests without running them — a test you haven't run is a guess
- Don't use the fast path in `test-generator` for complex or critical code