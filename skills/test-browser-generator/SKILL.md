---
name: test-browser-generator
description: 'Generate complete browser and E2E test code from a test plan or Risk
  Profile. Framework-extensible workflow (currently supports Dusk + Playwright) — reads tool-specific syntax from references/
  before generating. Currently supports: Laravel Dusk (references/dusk.md), Playwright
  (references/playwright.md). Triggers on: "generate browser tests", "write dusk tests",
  "write playwright tests", "create E2E tests", "automate browser tests for", "implement
  browser test plan", "generate UI tests for". Use test-case-planner Section G as
  input, or describe the UI flow directly. For unit/integration/HTTP tests use test-generator
  instead.

  '
permalink: ram/04-ai-toolkit/skills/test/test-browser-generator/skill
---

# Test Browser Generator

**Scope: Browser and E2E tests only**
```
test-case-planner (Section G) → [test-browser-generator]
```

Generates complete browser test code for UI interactions, dynamic behavior,
form flows, role-based visibility, and end-to-end user journeys.

Before writing any code, detects the tool (Dusk or Playwright) and reads
the appropriate reference file from `references/`.

For unit, integration, and HTTP tests use `test-generator` instead.

---

## Workflow

```
1. Read references → 2. Detect tool → 3. Ingest input → 4. Plan test methods → 5. Generate → 6. Verify
```

---

## Step 1: Read References

Ask the user which tool they are using, or detect from:
- Project files (`composer.json` with `laravel/dusk` → Dusk)
- Project files (`package.json` with `@playwright/test` → Playwright)
- File extensions in existing test files (`.php` test classes → Dusk, `.spec.ts` → Playwright)

Then read the appropriate reference:

```
Dusk:       references/dusk.md
Playwright: references/playwright.md
```

If both are present in the project, ask the user which to use.
State the detected tool before proceeding.

---

## Step 2: Detect Tool and Environment

**Laravel Dusk:**
- PHP-based, runs against a real Laravel application instance
- Requires `php artisan dusk:serve` or running app
- Tests live in `tests/Browser/`
- Extends `Laravel\Dusk\TestCase`

**Playwright:**
- TypeScript/JavaScript-based, tool-agnostic
- Runs against any URL (local dev server, staging, production)
- Tests live in `tests/e2e/` or `playwright/tests/`
- Uses `@playwright/test` runner

---

## Step 3: Ingest Input

Accept input in one of two forms:

**Form A (preferred):** Section G cases from `test-case-planner` output
```
[B-001] through [B-006] case list
```

**Form B:** Direct description of the UI flow or feature to test

Extract for each test case:
- The page or component being tested
- The user role / auth state required
- The sequence of actions (click, fill, select, submit, wait)
- The expected visual outcome (element visible, text present, redirect, toast)
- Any dynamic behavior (AJAX, real-time update, loading state)

---

## What NOT to Browser-Test (Skip If Already Covered)

Browser tests are slow (10-60s each) and more brittle than unit tests.
Do not duplicate coverage that already exists at a lower, faster layer.

### Skip in browser tests if already covered by unit/feature tests:

| Already tested by | Skip in browser |
|---|---|
| FormRequest unit test | Input validation rules, required fields, max length |
| HTTP feature test | API response status codes, JSON structure |
| Unit test | Business logic, calculation results, formatting |
| Policy/Gate test | Authorization rules (still test redirect/403 UI) |

### What browser tests SHOULD cover (UI layer only):

- **Visual feedback**: Does the error message appear in the right place?
- **Redirect behavior**: Does success take the user to the right page?
- **Dynamic UI**: Does the loading spinner show? Does the modal close?
- **Role-based visibility**: Are restricted buttons/sections hidden, not just unauthorized?
- **Multi-step flows**: Does the wizard advance correctly? Does step 3 use data from step 1?
- **Real form submission UX**: Does submitting with JS disabled still work? (Dusk only)

### Decision rule:
> "Could this assertion be written as a feature test asserting JSON or status codes?"
> If yes → write it as a feature test instead. Browser tests are for what only
> a real browser can verify: rendering, interactivity, and visual state.

---

## Step 4: Plan Test Methods

For each Section G case, define:

```
Test name    : descriptive, action-oriented
URL / route  : starting point
Auth state   : guest | authenticated as {role}
Actions      : ordered list of browser interactions
Assertions   : what must be visible/present/absent after actions
Cleanup      : any state that needs resetting
```

Group tests by page or feature, not by test type.
Order within each group: page load → happy path → validation → edge cases → role visibility.

---

## Step 5: Generate Tests

Use syntax and helpers from the detected tool's reference file.

### Universal Principles (apply to both Dusk and Playwright)

**Selectors — priority order:**
1. `data-testid` or `data-test` attributes (most stable)
2. ARIA roles and labels (`role="button"`, `aria-label="Submit"`)
3. Visible text content (for links and buttons)
4. CSS class or ID (last resort — brittle)

**Never use:**
- XPath unless absolutely necessary
- Positional selectors (`nth-child`, `first()`) for business-critical elements
- Selectors tied to auto-generated class names or hash suffixes

**Waiting strategy:**
- Prefer waiting for specific element visibility after actions over network idle.
  Network idle (`waitForLoadState('networkidle')`) is unreliable on pages with
  polling, websockets, or background requests — use it only as a last resort.
  Prefer: `waitForSelector`, `waitForURL`, `assertSee`, `waitForResponse`.
- Never use fixed `sleep()` or `pause()` — use smart waits
- After form submit: wait for success indicator, not just page load

**Auth setup:**
- Reuse authenticated state across tests where possible (cookies/storage)
- Don't repeat login flow in every test — use setup fixtures or before hooks

**Test isolation:**
- Each test must be runnable independently
- Database state: reset between tests or use transactions
- File uploads: use fixtures, clean up after test

---

## Step 6: Quality Verification

Before presenting output, verify:

### Structure
- [ ] File lives in correct directory for the tool
- [ ] Correct base class or test runner import
- [ ] Auth setup done in before hook, not repeated in each test
- [ ] Cleanup (logout, DB reset) done in after hook

### Content
- [ ] Every `[B-{n}]` case from planner has a test method
- [ ] Selectors use `data-testid` or ARIA where possible
- [ ] No `sleep()` or fixed waits — smart waits only
- [ ] Success AND failure paths both covered
- [ ] Role-based visibility tested with at least two roles
- [ ] Dynamic behavior (AJAX, loading state) explicitly waited for
- [ ] Screenshots or video recording enabled for CI runs

### Coverage
- [ ] Page load without errors
- [ ] Form happy path (valid data → success)
- [ ] Form validation (invalid data → inline errors)
- [ ] At least one dynamic interaction (modal, dropdown, async update)
- [ ] Auth guard (guest cannot reach protected page)

---

## Output Format

1. State the detected tool and reference file read
2. State the output file path(s)
3. List any `data-testid` attributes that need to be added to the application's HTML
4. Generate the complete test file(s) — no partial outputs
5. Provide the command to run only these tests