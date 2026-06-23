---
name: test-user-flow-mapper
version: 1.0.0
description: 'Map user journeys and flows BEFORE writing any tests. Identifies what
  real users do in the system, which flows are critical, and which technical components
  each flow touches. Framework-extensible (core is language-agnostic). Works from descriptions, route lists, controllers,
  UI screenshots, or feature specs — no test code involved. Triggers on: "map user
  flows", "what flows should I test", "user journeys for", "what does a user do in",
  "map the flows in", "identify user journeys", "what are the critical paths in".
  Run this when you need to deepen one or more selected flows before test-case-planner.
  Accepts story-map artifacts: when a storymap.json is provided, extract activities/tasks
  as input instead of asking for prose or route lists.

  '
permalink: ram/04-ai-toolkit/skills/test/test-user-flow-mapper/skill
---

# Test User Flow Mapper

**Pipeline position: Optional deepening stage after storymap, before test-case-planner**
```
/storymap (story-map) → [test-user-flow-mapper] → test-case-planner → test-risk-classifier → test-generator
                    └──────────────────────────→ test-case-planner
```

Deepens selected user journeys into ordered paths before technical test planning begins.
Produces a structured **Flow Map** — a prioritized list of user journeys,
each broken down into steps, actors, critical paths, and the technical
components they touch.

Use it when broad story-map coverage is not enough and one or more critical journeys
need detailed state transitions, alternates, and error paths.

Framework-extensible (core is language-agnostic). Works from any input: prose descriptions, route lists,
controller files, UI mockups, feature specs, or a combination.

---

## When to Use This Skill

Use this skill when:
- Starting a new project with no tests — run this first
- Adding a major feature — map only the affected flows
- You're not sure where to start testing
- You want to ensure critical user paths are covered end-to-end
- You already have a `story-map` and need a deeper `flow-map` for one critical journey
- You need a deeper `flow-map` for 2-5 related journeys in the same release or risk area

Skip this skill when:
- You already have a flow map and just need technical test cases
- A `story-map` already gives enough coverage and you want broad case planning quickly
- You're fixing a specific bug with a clear reproduction path
- You're adding tests for an isolated utility or helper class

---

## Workflow

```
1. Ingest → 2. Identify Actors → 3. Map Flows → 4. Identify Critical Paths → 5. Map to Components → 6. Output
```

---

## Step 1: Ingest

Accept any combination of inputs:

- **Story map artifact** — JSON from `/storymap` skill (`"artifact": "story-map"`). When provided, extract activities as flow groups, tasks as flow steps, personas as actors, failure modes as error paths, and codeRefs as component mappings. This is the preferred input when the storymap pipeline is used.
- **Flow scope hint** — if provided, honor `scope=single-flow` or `scope=multi-flow`. If absent, infer from user intent.
- **Prose description** — "This is a press release distribution platform where..."
- **Route list** — `php artisan route:list`, Express router file, Django urls.py
- **Controller files** — infer flows from action names and middleware
- **UI description or screenshots** — map from visible user actions
- **Feature spec or PRD** — extract flows from requirements
- **Existing test files** — reverse-engineer what flows are already covered

If nothing is provided, ask:
> "Can you describe what a user can do in this system? Or paste your route list / controller files?"

Read everything provided before proceeding.

If a flow affects a gate (payment, entitlement, auth, data, release, or epic closeout), do not treat prose or subagent
summary as enough evidence. Record which files/spec sections support each critical flow step, and mark unsupported
steps as `unknown` or `needs decision`.

If a `story-map` is provided, do not remap the whole product unless explicitly asked. Select:
- one critical task/journey for `scope=single-flow`, or
- 2-5 related critical journeys for `scope=multi-flow`

The output of this skill is a `flow-map`, not a replacement `story-map`.

---

## Step 2: Identify Actors

List every distinct user type that interacts with the system.

For each actor, identify:
- Their role and permissions
- Their primary goal in the system
- What they can do that others cannot

```
Actors:
  - Guest        → not authenticated, limited access
  - User         → authenticated, owns their own resources
  - Admin        → manages other users and system settings
  - API Client   → machine-to-machine, uses token auth
```

If the system has only one actor type, note that and continue.

---

## Step 3: Map Flows

For each actor, list every meaningful flow — a sequence of actions
that achieves a goal.

**Flow naming convention:** `{Actor} {verb}s {object}`
```
User publishes a press release
User manages their subscription
Admin moderates flagged content
Guest browses public press releases
API Client submits a press release via API
```

For each flow, document:

```
Flow: {name}
Actor: {who}
Goal: {what they're trying to achieve}
Trigger: {what starts this flow — page visit, button click, API call}
Steps:
  1. {action}
  2. {action}
  3. {action}
  ...
Success: {what the final state looks like when it works}
Failure modes:
  - {what can go wrong at step N}
  - {what can go wrong at step M}
Dependencies: {other flows this depends on — e.g. "User must be subscribed"}
```

**Completeness check — for each actor, have you covered:**
- [ ] Registration / onboarding
- [ ] Authentication (login, logout, password reset)
- [ ] Core value action (the main thing they came to do)
- [ ] Resource management (create, edit, delete their own content)
- [ ] Settings and profile
- [ ] Billing / subscription (if applicable)
- [ ] Error and edge states (what happens when things go wrong)
- [ ] Offboarding / account deletion

---

## Step 4: Identify Critical Paths

Not all flows are equal. Classify each flow:

| Priority | Criteria | Label |
|---|---|---|
| 🔴 Critical | Revenue-generating, data loss risk, security, auth | CRITICAL |
| 🟡 Important | Core feature, affects all users, high frequency | IMPORTANT |
| 🟢 Standard | Secondary feature, low frequency, easily recoverable | STANDARD |

**Critical path rules:**
- Any flow involving money → always CRITICAL
- Any flow involving authentication or authorization → always CRITICAL
- Any flow where failure causes data loss → always CRITICAL
- The single most common thing users do → always CRITICAL
- Any flow that blocks other flows → CRITICAL

Mark each flow with its priority and a one-line reason.

---

## Step 5: Map Flows to Technical Components

For each flow, identify which technical components are involved.
This is what connects the user perspective to the technical test plan.

```
Flow: User publishes a press release
Components touched:
  - Route: POST /press-releases/{id}/publish
  - Controller: PressReleaseController@publish
  - Service: PressReleasePublishingService
  - FormRequest: PublishPressReleaseRequest
  - Job: DistributePressReleaseJob
  - Event: PressReleasePublished
  - Notification: PublishedConfirmationNotification
  - Model: PressRelease (status change)
Test types needed:
  - Integration/HTTP test (controller + auth + validation)
  - Unit test (PublishingService logic)
  - Queue test (job dispatched)
  - Event test (event fired)
  - Notification test (email sent)
  - Browser test (publish button → success message)
```

If component names are unknown, use descriptive placeholders:
`{Controller for publishing}`, `{Service that handles distribution}`, etc.

---

## Output Mode Selection

Before producing the Flow Map, ask (or infer from context):

**Use Compact Mode when:**
- Passing output to another skill (test-case-planner, test-strategy-*)
- The system has more than 8 flows
- The user asked for "overview", "quick", or "list"
- Context window is constrained

**Use Full Mode when:**
- A human is reading the output for planning
- The user asked for "detailed" or "comprehensive"
- Working on a specific flow in isolation

Default: **Compact Mode** for pipeline handoff, **Full Mode** for human review.

---

## Compact Mode Output Format

```markdown
## Flow Map (Compact): {System Name}
Generated: {date}

### Actors
- **{Actor}**: {one-line description}

### Flow Inventory

| # | Flow | Actor | Priority | Components | Test types |
|---|---|---|---|---|---|
| F-001 | User publishes press release | User | 🔴 CRITICAL | Controller, Service, Job, Event | HTTP, Unit, Queue, Browser |
| F-002 | User registers | Guest | 🔴 CRITICAL | Controller, Notification | HTTP, Browser |
| F-003 | Admin moderates content | Admin | 🟡 IMPORTANT | Controller, Policy | HTTP |

### Recommended Testing Order
1. F-002 (no deps) → F-001 (depends on F-002) → F-003

### Next Step
Pass F-001 to `test-case-planner`. Then F-002. Then F-003.
```

Compact mode omits: full step-by-step breakdowns, failure mode lists,
coverage matrix. These are available on demand per flow.

---

## Step 6: Output — The Flow Map

```markdown
## User Flow Map: {System / Feature Name}
Generated: {date}
Input sources: {what was provided — description, routes, controllers, etc.}

---

### Actors
- **{Actor}**: {one-line description of role and goal}
- **{Actor}**: ...

---

### Flow Inventory

| # | Flow | Actor | Priority | Reason |
|---|---|---|---|---|
| 1 | User registers and onboards | User | 🔴 CRITICAL | Gateway to all other flows |
| 2 | User publishes a press release | User | 🔴 CRITICAL | Core revenue action |
| 3 | User manages subscription | User | 🔴 CRITICAL | Revenue |
| 4 | Admin moderates content | Admin | 🟡 IMPORTANT | Platform integrity |
| 5 | User edits a draft | User | 🟡 IMPORTANT | High frequency |
| ... | | | | |

---

### Flow Details

#### 🔴 F-001: User publishes a press release
**Actor**: Authenticated User
**Goal**: Get a press release distributed to media outlets
**Trigger**: User clicks "Publish" on a draft press release
**Dependencies**: User must be registered (F-001), must have active subscription (F-003)

**Steps**:
1. User navigates to their press release list
2. User opens a draft press release
3. User reviews content and clicks "Publish"
4. System validates subscription status
5. System validates press release content
6. System queues distribution job
7. System sends confirmation email
8. User sees success message and updated status

**Success**: Press release status = "published", distribution job queued, email sent

**Failure modes**:
- Step 4: Subscription expired → user redirected to billing
- Step 5: Content validation fails → inline errors shown
- Step 6: Queue unavailable → job retried, user notified of delay
- Step 7: Email delivery fails → logged, distribution continues

**Components touched**:
- `PressReleaseController@publish` (or equivalent)
- `PressReleasePublishingService`
- `PublishPressReleaseRequest`
- `DistributePressReleaseJob`
- `PressReleasePublished` event
- `PublishedConfirmationNotification`
- `PressRelease` model

**Test types needed**:
- Integration/HTTP, Unit (service), Queue, Event, Notification, Browser

---

#### 🔴 F-002: ...

---

### Coverage Matrix

| Flow | Unit | Integration | Queue/Event | Browser | Manual |
|---|---|---|---|---|---|
| F-001 User publishes | ✓ needed | ✓ needed | ✓ needed | ✓ needed | — |
| F-002 User registers | — | ✓ needed | ✓ needed | ✓ needed | — |
| F-003 Subscription | — | ✓ needed | ✓ needed | — | ✓ needed |

---

### Recommended Testing Order

Start with CRITICAL flows, in dependency order:

1. **F-00X** — {flow name} (no dependencies)
2. **F-00X** — {flow name} (depends on F-00X)
3. **F-00X** — {flow name} (depends on F-00X, F-00X)
...
{IMPORTANT flows follow}
...
{STANDARD flows last}

---

### Next Step

Pass individual flows to `test-case-planner` one at a time, starting with F-001.
Or pass the entire Flow Map to `test-case-planner` for a deeper focused plan.
```

---

## Handoff Block (machine-readable)

Always append this block at the end of every Flow Map output.
Schema defined in `shared/handoff-schema.md` § "Flow Map Handoff".

```json
{
  "artifact": "flow-map",
  "version": "1",
  "project": "{project name}",
  "scope": "single-flow|multi-flow",
  "actors": ["end-user", "admin"],
  "flows": [
    {
      "flow_id": "FL-001",
      "name": "User Registration",
      "actor": "end-user",
      "priority": "critical",
      "confidence": "confirmed|assumed",
      "steps": [
        { "step": 1, "action": "Navigate to /register", "component": "RegisterController@show" },
        { "step": 2, "action": "Fill form and submit", "component": "RegisterController@store" }
      ],
      "dependencies": ["FL-002"]
    }
  ],
  "total_flows": 0,
  "assumed_count": 0,
  "next_skill": "test-case-planner",
  "unknowns": []
}
```

**Rules:**
- `scope: single-flow` = one deepened journey
- `scope: multi-flow` = 2-5 related journeys, not the whole product
- `confidence: assumed` is mandatory for inferred details from incomplete artifacts
- Preserve upstream `unknowns` and append new ones

---

## What NOT to Do

- Do not write test code
- Do not analyze individual methods or classes in detail — that's `test-case-planner`'s job
- Do not list every possible edge case — focus on flows, not exhaustive scenarios
- Do not invent flows that don't exist in the system — only map what's there
- Do not skip failure modes — they're as important as happy paths
- Do not turn the entire story map into a flow map unless the user explicitly asks for whole-product deepening
