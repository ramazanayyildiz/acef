---
name: test-case-planner
description: 'Analyze any codebase and generate a structured, prioritized list of
  test cases as a human-readable plan — no test code generated. Covers: Unit, Integration/HTTP,
  Data Model, Validation, Async/Queue/Event, User Flows, Browser (automated), and
  Manual Tests. Framework-extensible (currently has Laravel references; core works with any language. Node.js, Django, Nuxt,
  Vue, etc.). Triggers on: "plan tests for", "list test cases for", "what test cases
  do I need", "test plan for", "what should I test in", "plan the tests". Does NOT
  trigger on: "write tests", "generate test code", "implement tests" — those go to
  test-generator. Does NOT trigger on: "where do I start" — that goes to a test-strategy-*
  skill. Accepts story-map artifacts for broad planning, flow-map artifacts for deeper planning,
  or direct source files for code-first planning. Run this before test-risk-classifier and test-generator.

  '
permalink: ram/04-ai-toolkit/skills/test/test-case-planner/skill
---

# Test Case Planner

**Pipeline position: Planning bridge before classifier and generators**
```
[storymap] ───────────────→ [test-case-planner] → test-risk-classifier → test-generator
[test-user-flow-mapper] ─→ [test-case-planner] → test-risk-classifier → test-generator
[source files] ──────────→ [test-case-planner] → test-risk-classifier → test-generator
[test-case-planner] → test-risk-classifier → test-generator
```

Analyzes a story map, flow map, class, module, or feature and produces a structured, prioritized
list of test cases grouped by type. Output is a **human-readable test plan**
— no test code is written here.

Framework-extensible: core logic works with any language. Framework-specific examples and templates currently exist for Laravel only. Other frameworks get generic guidance until references are added.
Terminology adapts to the project (e.g. "controller" for Laravel/Rails/Django,
"handler" for Node/Express, "resolver" for GraphQL, "composable" for Vue, etc.).

This is the bridge between upstream discovery artifacts and downstream risk/code generation.

Hand this output to `test-risk-classifier` for risk analysis,
then to the appropriate `test-generator` for code generation.

---

## Workflow

```
1. Read & Understand → 2. Identify Coverage Areas → 3. Generate Cases by Type → 4. Output
```

---

## Step 1: Read & Understand the Target

Read every file provided or referenced. Identify the language and framework first,
then extract accordingly.

For ACEF guarded or Route B work, this plan can become gate evidence. Do not plan from a subagent summary alone; cite
the source files/spec sections behind every Critical/High case. If an expected contract or flow is not source-backed,
mark it `needs evidence` instead of turning it into an asserted test case.

Accepted upstream inputs:

- **Story map artifact** (`artifact: "story-map"`) — broad coverage input; activities/tasks become test planning candidates
- **Flow map artifact** (`artifact: "flow-map"`) — deeper input; selected flows become detailed user-flow and browser candidates
- **Direct source files** — code-first input when no upstream artifact exists

Planning depth rules:
- `story-map -> test-case-plan` = broad and shallower
- `flow-map -> test-case-plan` = narrower and deeper
- direct source files = code-first and component-centric

If both `story-map` and `flow-map` are provided, prefer `flow-map` for depth and use `story-map` for missing context.

**From any class or module:**
- Module/class type and its role in the system
- Every public method/function and its purpose
- Constructor or init dependencies (injected services, config, clients)
- External integrations used (DB, HTTP clients, queues, cache, storage, email, etc.)
- Return types, thrown errors/exceptions
- Authorization or permission checks
- Database or state interactions
- Side effects: emails sent, events fired, jobs queued, files written, external API calls

**From HTTP handlers / controllers / routes:**
- HTTP methods (GET/POST/PUT/PATCH/DELETE)
- Route-level middleware or guards (auth, rate limit, role, etc.)
- Request input (query params, body fields, file uploads)
- Response format (JSON, redirect, rendered view, stream)

**From UI components (for browser tests):**
- User-visible actions (forms, buttons, links, modals)
- Conditional UI (shown/hidden based on state or role)
- Dynamic behavior (async updates, real-time, animations)
- Multi-step flows (wizards, checkout, onboarding)

If neither artifacts nor files are provided, ask the user to paste the relevant code.

---

## Step 2: Identify Coverage Areas

When the input is a `story-map`:
- Convert activities/tasks into candidate user-flow, browser, and manual cases first
- Use variations and failure modes to generate alternate and negative cases
- Use codeRefs only to anchor traceability, not to collapse back into module-first planning

When the input is a `flow-map`:
- Preserve step order, state transitions, dependencies, and error paths
- Generate denser user-flow, browser, and integration cases for the selected flows

When the input is direct source files:
- Use the normal code-first mapping below

Map what exists to which test types apply:

| What exists | Applicable test types |
|---|---|
| Pure function / utility / helper | Unit |
| Service / use case / business logic class | Unit + Integration |
| HTTP controller / route handler / resolver | Integration/HTTP |
| Data model with queries, scopes, relations | Data Model |
| Input validation / schema / form parser | Validation |
| Async job / queue worker / event / listener | Async/Queue/Event |
| Multi-step user interaction | User Flow + Browser |
| Form submission, button click, UI state | Browser (automated) |
| Role-based UI, complex visual state | Manual Test |
| External third-party integrations | Manual Test + Unit (mocked) |

---

## Step 3: Generate Test Cases

Group all cases under the sections below. Include only sections that apply.
Within each section, always order: Happy Path → Edge Cases → Error Cases.

Adapt all terminology to the project's language and framework.

---

### Section A: Unit Tests
*For: Pure functions, utilities, services, standalone business logic*
*No external dependencies — fast, isolated, deterministic*

```
[U-001] {Module/Class}::{method}() — happy path
  Scenario : Call with valid, typical input
  Expected : Returns expected value / performs expected action

[U-002] {Module/Class}::{method}() — null / empty input
  Scenario : Pass null, undefined, or empty value where input is expected
  Expected : Returns null / throws expected error / handles gracefully

[U-003] {Module/Class}::{method}() — boundary values
  Scenario : Pass minimum and maximum allowed values
  Expected : Handles boundaries correctly without error

[U-004] {Module/Class}::{method}() — dependency failure
  Scenario : Mock/stub the injected dependency to throw an error
  Expected : Error is caught and re-thrown / logged / handled gracefully
```

---

### Section B: Data Model Tests
*For: ORM models, database entities, query builders, repositories*
*Adapt: Eloquent → Django ORM → TypeORM → Prisma → ActiveRecord → Mongoose*

```
[M-001] {Model} — field assignment and persistence
  Scenario : Create a record using all expected fields
  Expected : All fields are saved and retrieved correctly

[M-002] {Model}::{query/scope}() — filters correctly
  Scenario : Seed records in both matching and non-matching states
  Expected : Query returns only matching records, count is correct

[M-003] {Model} — {field} type casting / serialization
  Scenario : Set the field to a raw value and retrieve it
  Expected : Retrieved value is the expected type (date, array, boolean, etc.)

[M-004] {Model}::{relation}() — relationship integrity
  Scenario : Create related records and load the relation
  Expected : Relation returns correct count and correct entity type

[M-005] {Model} — soft delete / archive behavior (if applicable)
  Scenario : Delete a record and query including/excluding deleted
  Expected : Deleted record excluded by default, included when explicitly requested
```

---

### Section C: Integration / HTTP Tests
*For: Controllers, route handlers, API endpoints, GraphQL resolvers*
*Full request/response cycle including middleware, auth, and DB*

```
[F-001] {METHOD} {route} — authenticated, valid payload
  Scenario : Send valid request as authenticated user/client
  Expected : {status code}, response structure matches, state updated correctly

[F-002] {METHOD} {route} — unauthenticated
  Scenario : Send request without valid auth token / session
  Expected : 401 Unauthorized or equivalent rejection

[F-003] {METHOD} {route} — missing or invalid required fields
  Scenario : Omit required fields or send malformed data
  Expected : 422 / 400 with structured validation errors per field

[F-004] {METHOD} {route} — access another user's resource
  Scenario : Authenticated user targets a resource they don't own
  Expected : 403 Forbidden, resource unchanged

[F-005] {METHOD} {route} — resource not found
  Scenario : Request a resource with a non-existent ID
  Expected : 404 Not Found

[F-006] {METHOD} {route} — rate limiting (if applicable)
  Scenario : Exceed the allowed request count within the time window
  Expected : 429 Too Many Requests
```

---

### Section D: Validation Tests
*For: Input validation schemas, validators, DTOs, form parsers*
*Adapt: FormRequest (Laravel) → Zod/Joi (Node) → Serializers (Django) → Pydantic (Python)*

```
[V-001] {Validator} — all required fields present and valid
  Scenario : Submit with all fields satisfying their rules
  Expected : Validation passes, no errors returned

[V-002] {Validator} — {field} is missing
  Scenario : Omit the {field} entirely
  Expected : Validation fails with error on '{field}'

[V-003] {Validator} — {field} exceeds allowed length / range
  Scenario : Set {field} beyond the max constraint
  Expected : Validation fails with constraint error on '{field}'

[V-004] {Validator} — {field} must be unique (if applicable)
  Scenario : Use a value already present in the data store
  Expected : Validation fails with uniqueness error on '{field}'

[V-004a] {Validator} — {field} unique check is case-insensitive (if applicable)
  Scenario : Insert "Existing@Example.test", then submit "existing@example.test"
  Expected : Validation fails with uniqueness error — case variation must not bypass the constraint

[V-004b] {Validator} — {field} unique constraint DB race fallback (if applicable)
  Scenario : Two concurrent requests submit the same unique value; app-level validation passes for both
  Expected : DB unique constraint fires on the second insert; application catches the DB exception
             (e.g. QueryException / IntegrityError / duplicate key) and returns a user-facing
             validation error instead of a 500

[V-005] {Validator} — {field} is invalid format (email/url/date/regex)
  Scenario : Set {field} to a value that breaks the format rule
  Expected : Validation fails with format error on '{field}'

[V-006] {Validator} — conditional rule (if applicable)
  Scenario : Trigger the condition that activates a conditional rule
  Expected : Validation enforces the conditional rule correctly
```

---

### Section E: Async / Queue / Event Tests
*For: Background jobs, queue workers, event emitters, listeners, webhooks*
*Adapt: Laravel Jobs/Events → Celery (Python) → Bull/BullMQ (Node) → Sidekiq (Ruby)*

```
[J-001] {Job/Task} — enqueued when expected action occurs
  Scenario : Trigger the action that should enqueue the job/task
  Expected : Job appears in queue with correct payload

[J-002] {Job/Task} — processes successfully
  Scenario : Execute the job handler directly with valid data
  Expected : Expected side effect occurs (record updated, email sent, etc.)

[J-003] {Job/Task} — fails on bad data
  Scenario : Execute the handler with malformed or missing data
  Expected : Error thrown or job marked as failed with correct reason

[J-004] {Event} — emitted at correct moment
  Scenario : Trigger the action that should emit the event
  Expected : Event recorded with correct name and payload

[J-005] {Listener/Subscriber} — handles event correctly
  Scenario : Emit the event the listener subscribes to
  Expected : Listener performs the expected side effect

[J-006] {Notification/Webhook} — delivered to correct recipient
  Scenario : Trigger the condition that sends the notification
  Expected : Notification sent to correct target with correct content
```

---

### Section F: User Flow Tests
*For: End-to-end logical flows spanning multiple steps or pages*
*Can be implemented as integration tests (HTTP) or browser tests*

```
[UF-001] {Flow name} — complete happy path
  Scenario : User completes every step of the flow with valid data
  Steps    : 1. {first action}
             2. {second action}
             3. {final action}
  Expected : Flow completes, final state is correct, confirmation shown

[UF-002] {Flow name} — interrupted mid-flow
  Scenario : User completes step 1, navigates away, then returns
  Expected : Progress preserved / state maintained / form pre-filled

[UF-003] {Flow name} — session / token expiry during flow
  Scenario : Auth expires while user is mid-flow
  Expected : Redirected to login, returned to flow after re-auth
             OR flow restarts cleanly with clear message
```

---

### Section G: Automated Browser Tests
*For: JavaScript interactions, dynamic UI, real browser behavior*
*Tools: Playwright, Cypress, Dusk, Selenium, Puppeteer, WebdriverIO*

```
[B-001] {Page/Component} — page loads without errors
  Scenario : Navigate to {URL} as {role}
  Expected : Page renders, no JS console errors, key elements visible

[B-002] {Form} — successful submission
  Scenario : Fill all fields with valid data, click submit
  Expected : Success feedback shown, correct redirect or state change

[B-003] {Form} — client-side validation feedback
  Scenario : Leave required fields empty, attempt to submit
  Expected : Form does not submit, inline error messages appear near fields

[B-004] {Component} — dynamic behavior (modal / dropdown / accordion / toast)
  Scenario : Click the trigger element
  Expected : Target element becomes visible/hidden, focus managed correctly

[B-005] {Feature} — role-based UI visibility
  Scenario : Log in as {role A}; log in as {role B}; compare UI
  Expected : Restricted elements hidden or disabled for {role B}

[B-006] {Feature} — async / real-time update
  Scenario : Perform action that triggers a background request
  Expected : UI updates without full reload, loading state shown then cleared
```

---

### Section H: Manual Tests
*For: Cases too complex, environment-specific, or subjective for automation*

```
[MN-001] {Feature} — third-party integration behavior
  Test     : Trigger {action} with a real {service} sandbox account
  Check    : {expected outcome in third-party system}
  Notes    : Requires {credentials / sandbox account / VPN}

[MN-002] {Feature} — notification deliverability and rendering
  Test     : Trigger the notification, open in real client (Gmail, Slack, mobile)
  Check    : Content correct, layout renders, links work
  Notes    : Test in dark mode and light mode where applicable

[MN-003] {Feature} — payment or billing flow (if applicable)
  Test     : Complete a real transaction in staging environment
  Check    : Payment confirmed, webhook received, state updated, receipt sent
  Notes    : Use provider test credentials / sandbox mode

[MN-004] {Feature} — cross-browser / cross-device rendering
  Test     : Open {page} in Chrome, Firefox, Safari, and on mobile viewport
  Check    : Layout intact, interactive elements work, no overflow or clipping

[MN-005] {Feature} — accessibility (a11y)
  Test     : Navigate {page} using keyboard only; run with screen reader
  Check    : All elements reachable via Tab, focus visible, ARIA labels present,
             errors announced correctly
  Notes    : Use axe DevTools, Lighthouse, or NVDA/VoiceOver
```

---

## Step 4: Output Format

```markdown
## Test Case Plan: {Class / Module / Feature Name}
Generated: {date}
Language / Framework: {detected stack}
Source files analyzed: {list of files}

---

### Summary
Total cases: {n}
  Unit:              {n}
  Data Model:        {n}
  Integration/HTTP:  {n}
  Validation:        {n}
  Async/Queue/Event: {n}
  User Flow:         {n}
  Browser:           {n}
  Manual:            {n}

Priority: 🔴 Critical  🟡 Important  🟢 Nice to have

---

### A. Unit Tests

#### Happy Path
[U-001] 🔴 {description}
  Scenario : ...
  Expected : ...

#### Edge Cases
[U-002] 🟡 ...

#### Error Cases
[U-003] 🟡 ...

---

### B–H. {remaining applicable sections, same structure}

---

### What's NOT tested here (and why)
- {thing}: {reason — e.g. "framework internals, not application logic"}
- {thing}: {reason — e.g. "covered by third-party package's own tests"}

---

### Next Step
Pass this plan to `test-risk-classifier` for risk and complexity analysis
before moving to `test-generator` for code generation.

---

### Handoff Block (machine-readable)

Always append this block at the end of every Test Case Plan output.
Schema defined in `shared/handoff-schema.md` § "Test Case Plan Handoff".

```json
{
  "artifact": "test-case-plan",
  "version": "1",
  "subject": "{ClassName or FeatureName}",
  "source_files": ["path/to/file.ext"],
  "framework": "{laravel|nodejs|python|swift|unknown}",
  "archetype": "{backend-api|frontend-component|library-sdk|cli-worker|desktop-app|desktop-cli-hybrid|event-driven|unknown}",
  "cases": [
    {
      "case_id": "U-001",
      "component": "UserService",
      "method": "authenticate",
      "test_type": "unit",
      "priority": "critical",
      "scenario": "Call with valid credentials",
      "expected": "Returns user object with valid token",
      "confidence": "confirmed"
    }
  ],
  "summary": {
    "total": 0,
    "by_type": { "unit": 0, "model": 0, "integration": 0, "validation": 0, "async": 0, "user_flow": 0, "browser": 0, "manual": 0 },
    "by_priority": { "critical": 0, "important": 0, "nice_to_have": 0 }
  },
  "next_skill": "test-risk-classifier",
  "unknowns": []
}
```

**Rules:**
- `case_id` format: `{TYPE_PREFIX}-{NNN}` (U=unit, M=model, F=integration, V=validation, J=async, UF=user-flow, B=browser, MN=manual)
- `archetype`: detect from project structure — influences which case categories to emphasize
- `confidence`: cases derived from assumed flows (from flow-mapper) inherit `"assumed"`
- Planner may consume `story-map`, `flow-map`, or direct source files
- `story-map` input should produce broad coverage across activities/tasks
- `flow-map` input should produce deeper coverage for selected flows
- `unknowns`: list anything you could not determine. The next skill reads these and asks the user to fill gaps.

---

## Priority Rules

**🔴 Critical** — test first:
- Authentication and authorization checks
- Data mutation operations (create, update, delete)
- Payment or billing flows
- Core business logic
- Any failure path that causes data loss or security breach

**🟡 Important** — test in normal cycle:
- All validation rules
- Happy path for secondary features
- Side effects (emails, jobs, events, webhooks)
- Edge cases for critical paths

**🟢 Nice to have** — test when time allows:
- UI cosmetics and animations
- Non-critical copy or wording
- Rarely-used admin utilities
- Behavior already covered by other tests

---

## What NOT to Include

Do not generate test cases for:
- Framework or runtime internals (routing engine, ORM core, middleware pipeline)
- Third-party package behavior (the package's own logic, not your usage of it)
- Trivial getters/setters with no logic
- Language-level behavior (type coercion, built-in operators)
- Infrastructure concerns (server uptime, DNS, CDN, network latency)

> *If it's code you wrote or configured → test it.*
> *If a package, framework, or runtime wrote it → don't.*
