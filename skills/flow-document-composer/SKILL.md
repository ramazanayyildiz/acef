---
name: flow-document-composer
version: 1.0.0
description: "Compose durable, human-readable flow documents from story maps, flow maps, and source code. The missing middle layer between product mapping and test suite composition. Use this skill when the user wants to document a user journey end-to-end, create flow documentation for onboarding or QA, trace a feature through the codebase, understand how a flow works across modules, or prepare a flow for test suite composition. Also triggers on: 'compose flow document', 'document this flow', 'trace this journey', 'write up the user flow', 'how does this feature work end to end'. This is NOT a test generator — it produces journey documentation that downstream skills consume."
---

# Flow Document Composer

Converts upstream discovery artifacts (story-map, flow-map) and source code into a durable, technically anchored flow document. Each document tells the complete story of one user journey — readable by humans, consumable by test skills.

This skill restores the missing middle layer between high-level product mapping and test suite composition.

## Pipeline Position

```
story-map ─→ [flow-document-composer] ─→ test-case-planner ─→ flow-suite-composer
              ↑                          
flow-map ────┘ (optional deepening)      
```

The flow document sits AFTER discovery (story-map/flow-map) and BEFORE test planning. It is the bridge — not a test generator, not a requirements doc, not a story map.

---

## When to Use

- After `/storymap extract` or `/storymap interview` — to document specific flows in depth
- Before test-case-planner — when the planner needs richer context than a bare story-map provides
- For onboarding — "how does this feature work end-to-end?"
- For blast-radius analysis — "what would break if we changed this flow?"
- For QA handoff — giving testers a readable journey they can follow

---

## Inputs

Accept any combination:

1. **Story map** (`artifact: "story-map"`) — provides scope, activities, tasks, personas
2. **Flow map** (`artifact: "flow-map"`) — provides ordered steps, error branches, state transitions
3. **Source code** — read handlers, services, models to trace the actual flow
4. **Route list** — route files, API docs, CLI commands
5. **Existing flow document** — for update mode (extend or revise)

**When both story-map and flow-map are present:**
- Use story-map for scope and surrounding context
- Use flow-map for ordered steps, dependencies, and error branches

**When only story-map is present:**
- Read source code to trace the flow yourself
- Ask the user which activity/task to document if not specified

**When nothing is provided:**
- Ask: "Which flow should I document? Give me a feature name, route, or activity."

---

## Workflow

### Step 1: Identify the Flow

Determine what journey to document:

- **Single flow**: one critical user journey (e.g., "User creates an account")
- **Multi-flow**: 2-5 linked journeys written as one integrated narrative (e.g., "Billing lifecycle: subscribe → invoice → pay → cancel")
- **All-tasks-derived**: exhaustive mode — one document per task in the story map

If the user didn't specify scope, ask: "Should I document one specific flow, a cluster of related flows, or every task?"

### Step 2: Gather Evidence

Read the source code to trace the flow. For each step in the journey:

1. Find the entry point (route, command, menu action, shortcut)
2. Trace through the handler/controller
3. Follow service calls and business logic
4. Identify state changes (DB writes, cache updates, event dispatches)
5. Map failure paths (guards, validations, error handling)
6. Note side effects (emails, notifications, queue jobs, webhooks)
7. **Follow side-effect chains to their end** — don't stop at "dispatches event X". Find what X actually triggers. Trace: events → listeners → handlers, observers → callbacks, middleware → hooks, queue jobs → their execute methods. The most important bugs hide at the END of these chains, not at the dispatch point.

Side-effect chain tracing is framework-specific — see `references/` for where to look:
- Laravel: `EventServiceProvider` → listener classes → `handle()` methods
- React/Next.js: `useEffect` → API calls → state updates → re-renders
- Swift: `NotificationCenter` → observers, delegate callbacks

**Evidence-first rule:** Every step, state transition, and failure path needs a code reference. If you can't find evidence in code, put it in `assumptions` or `unknowns` — never invent behavior.

### Step 3: Identify Actors

From auth middleware, permission checks, or story-map personas:
- Who initiates this flow?
- Who else is involved? (e.g., "admin creates user" involves admin AND the new user)
- Are there system actors? (cron jobs, webhooks, background workers)

### Step 4: Map State Transitions

For each step, identify what changes:
- Database state (record created, updated, deleted)
- Session/auth state (logged in, role changed)
- UI state (page redirect, modal shown, toast notification)
- External state (payment processed, email sent, webhook fired)

Write these as explicit transitions: `state_before → action → state_after`

### Step 5: Map Failure Paths

For each step, check:
- What validations exist? (form requests, inline checks, DB constraints)
- What happens on failure? (error message, redirect, exception)
- Is the failure recoverable? (can the user retry, or is the flow dead?)

Every failure path needs a `codeRef`. If you find a potential failure without code evidence, mark it as an unknown and ask the user.

### Step 6: Assess Browser Testability

For each flow, determine:
- **High**: fully UI-driven, all steps are browser-clickable
- **Medium**: mostly UI but has async steps (queue jobs, webhooks) that need waiting/polling
- **Low**: backend-heavy, only entry/exit points are visible in browser
- **None**: pure backend, no UI involvement (CLI, cron, API-only)

Be honest — don't pretend a backend flow is browser-testable.

### Step 7: Write the Document

Produce both JSON and Markdown outputs with all 13 required sections.

---

## Output: JSON Schema

```json
{
  "artifact": "flow-document",
  "version": "1",
  "project": "{project}",
  "flow_id": "FL-{NNN}",
  "title": "User Management Lifecycle",
  "scope": "single-flow|multi-flow|all-tasks-derived",
  "source_artifacts": ["story-map", "flow-map"],
  "actors": [
    { "id": "ACTOR-001", "name": "System Admin", "role": "admin" }
  ],
  "overview": "Short narrative of what this journey accomplishes and why it matters.",
  "preconditions": [
    "Admin is authenticated",
    "Team exists in the system"
  ],
  "entry_points": [
    { "type": "route", "path": "/admin/users/create", "method": "GET" }
  ],
  "routes": [
    { "method": "GET", "path": "/admin/users/create", "handler": "ManageUsers::render" },
    { "method": "POST", "path": "/admin/users", "handler": "ManageUsers::save" }
  ],
  "modules_touched": [
    { "name": "ManageUsers", "type": "livewire-component", "file": "app/Livewire/Admin/ManageUsers.php" },
    { "name": "UserService", "type": "service", "file": "app/Services/UserService.php" }
  ],
  "steps": [
    {
      "step": 1,
      "action": "Admin navigates to user creation form",
      "actor": "ACTOR-001",
      "components": ["ManageUsers::render"],
      "state_transition": { "before": "user list page", "after": "create form shown" },
      "failure_paths": [],
      "code_ref": "ManageUsers.php:45"
    },
    {
      "step": 2,
      "action": "Admin fills form and submits",
      "actor": "ACTOR-001",
      "components": ["ManageUsers::save", "UserService::create"],
      "state_transition": { "before": "form filled", "after": "user created in DB" },
      "failure_paths": [
        { "condition": "Email already taken", "result": "Validation error shown", "code_ref": "UserForm.php:22" },
        { "condition": "Missing required fields", "result": "Field-level errors", "code_ref": "UserForm.php:15" }
      ],
      "code_ref": "ManageUsers.php:78"
    }
  ],
  "state_transitions": [
    { "from": "no user", "action": "create", "to": "user exists (active)", "reversible": false }
  ],
  "failure_paths": [
    { "trigger": "Duplicate email", "step": 2, "recovery": "User corrects email and resubmits", "code_ref": "UserForm.php:22" }
  ],
  "notifications": [
    { "type": "email", "trigger": "User created", "recipient": "new user", "code_ref": "UserService.php:45" }
  ],
  "browser_testability": {
    "level": "high",
    "notes": ["All steps are UI-driven", "No async dependencies"]
  },
  "related_flows": ["FL-004: User Edit", "FL-005: User Delete"],
  "code_refs": [
    "app/Livewire/Admin/ManageUsers.php",
    "app/Services/UserService.php",
    "app/Forms/UserForm.php"
  ],
  "assumptions": [],
  "unknowns": [],
  "next_skill": "test-case-planner|flow-suite-composer"
}
```

---

## Output: Markdown Template

```markdown
# Flow Document: {title}

**Flow ID**: {flow_id}
**Scope**: {scope}
**Source artifacts**: {list}

## 1. Flow Overview
{overview narrative — what this journey does, who it's for, why it matters}

## 2. Personas
| ID | Name | Role |
|---|---|---|
| ACTOR-001 | System Admin | admin |

## 3. Preconditions
- {precondition 1}
- {precondition 2}

## 4. Modules Touched
| Module | Type | File |
|---|---|---|
| ManageUsers | livewire-component | app/Livewire/Admin/ManageUsers.php |

## 5. Routes / Entry Points
| Method | Path | Handler |
|---|---|---|
| GET | /admin/users/create | ManageUsers::render |

## 6. Flow Steps
### Step 1: {action}
- **Actor**: {actor}
- **Components**: {list}
- **State**: {before} → {after}
- **Code**: {code_ref}

### Step 2: {action}
- **Actor**: {actor}
- **Components**: {list}
- **State**: {before} → {after}
- **Failure paths**:
  - {condition} → {result} (`{code_ref}`)
- **Code**: {code_ref}

## 7. State Transitions
| From | Action | To | Reversible |
|---|---|---|---|
| no user | create | user exists (active) | no |

## 8. Failure Paths
| Trigger | Step | Recovery | Code |
|---|---|---|---|
| Duplicate email | 2 | User corrects email | UserForm.php:22 |

## 9. Notifications Triggered
| Type | Trigger | Recipient | Code |
|---|---|---|---|
| email | User created | new user | UserService.php:45 |

## 10. Browser Testability
**Level**: {high|medium|low|none}
- {notes}

## 11. Related Flows
- FL-004: User Edit
- FL-005: User Delete

## 12. Code References
- app/Livewire/Admin/ManageUsers.php
- app/Services/UserService.php

## 13. Assumptions / Unknowns
**Assumptions**: {list or "none"}
**Unknowns**: {list or "none"}
```

---

## Behavior Rules

1. **Evidence first** — Do not invent steps, states, or integrations. If a detail cannot be supported by source artifacts or code references, put it in assumptions or unknowns. This is the most important rule because downstream skills trust this document as ground truth.

2. **Narrative + technical grounding** — Each document should read as a real journey a person takes, not just a component list. But every major step must point back to code evidence. The reader should be able to follow the story AND verify it against the codebase.

3. **No duplicate module-level detail** — Describe the cross-module journey, not a full CRUD expansion of each module. If the user creates, edits, and deletes users, that's one flow with three branches — not three separate module analyses.

4. **Browser testability is honest assessment** — Mark whether the flow is realistically browser-testable and why. A payment webhook callback is not browser-testable even if the trigger is a button click. Say so.

5. **Granularity matches scope** — Single-flow gets maximum step detail. Multi-flow gets integrated narrative with shared state highlighted. All-tasks-derived gets systematic coverage prioritizing breadth.

---

## Update Mode

When an existing flow document is provided (`--existing <path>`):

1. Read the existing document
2. Re-trace the flow through current source code
3. Identify what changed:
   - New steps added
   - Steps removed or modified
   - New failure paths
   - Changed state transitions
4. Present diff to user before updating
5. Preserve any manually-added assumptions or notes from the original

---

## What This Skill Does NOT Do

- Generate test cases (that's test-case-planner)
- Generate test code (that's test-generator)
- Compose test suites (that's flow-suite-composer)
- Score risk (that's test-risk-classifier)
- Map the whole product (that's storymap)

This skill produces one thing: a durable, evidence-based, human-readable flow document that downstream skills can build on.
