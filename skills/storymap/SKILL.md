---
name: storymap
version: 1.1.0
description: 'Interactive story mapping agent for product planning and codebase understanding.
  Two modes: (1) Interview mode — guided Patton 5-step conversation BEFORE writing
  code, used for new projects, new epics, or new features at any planning boundary;
  (2) Extract mode — builds a story map from an EXISTING codebase by analyzing routes,
  controllers, auth, models, and git history. Use this skill whenever the user mentions
  story mapping, user flows, feature planning, product discovery, ''what should we
  build'', ''map the features'', ''plan the epic'', or wants to understand an existing
  codebase from a user perspective. Also use when the user wants to generate manual
  test cases from a product understanding rather than from code classes.'
permalink: ram/04-ai-toolkit/skills/test/storymap/skill
---

# Story Map

Build a 2D story map of a product — either by talking through it with the team (Interview mode) or by reading the codebase (Extract mode). The map shows what users do (left-to-right narrative), how deep each capability goes (top-to-bottom detail), and where to slice for releases.

Based on Jeff Patton's User Story Mapping methodology.

## Mode Detection

Parse the first argument:

- `interview` → Interview Mode (planning before code)
- `extract` → Extract Mode (from existing codebase)
- No argument → Ask: "Are we planning something new (interview) or mapping an existing codebase (extract)?"

Parse flags:
- `--format json|markdown|manual-test` (default: json)
- `--scope project|epic|feature` (default: ask user)
- `--existing <path>` — path to an existing story map to extend (optional)

---

## Interview Mode

A guided conversation that walks through Patton's 5-step process. You are a facilitator, not a generator. Ask questions, listen, confirm, build the map incrementally WITH the user.

### Before Starting

Ask these scoping questions:

1. **Scope**: "Is this a whole new product, a new epic within an existing product, or a specific new feature?"
2. **Existing map**: "Do you have an existing story map I should build on, or are we starting fresh?"
3. **Team context**: "Who are we building this for? Tell me about the users — not job titles, but what they're trying to accomplish."

If the user provided an existing map path (`--existing`), read it first. New activities/tasks will be added to the existing structure.

### Step 1: Frame the Opportunity

Before any mapping, understand WHY this exists. Ask:

- "What's the big idea? What problem are we solving?"
- "Who are the users? Not personas — real people. What do they do today without this?"
- "Why are we building this NOW? What's the trigger?"
- "If this succeeds, what changes for the user? What's the outcome they'd celebrate?"

Capture this as the map's `opportunity` field. Don't rush past this — Patton says "your first story discussion is for framing the opportunity."

### Step 2: Map the Backbone (Activities)

Now build the horizontal backbone — the big things users do, left to right in narrative order.

Ask: "Walk me through what a user does from start to finish. Not features — actions. What do they do FIRST? Then what? Then what?"

Guide with:
- "Think of the user's day. When do they first touch this product? What triggers it?"
- "What's the LAST thing they do before they leave? What's the natural ending?"
- "Is there a sequence that makes sense — something that has to happen before something else?"

As the user describes activities, write them as short verb phrases:
- "Manage workspaces" not "Workspace Management Module"
- "Set up a project" not "Project Configuration"

Confirm: "So the backbone reads: [Activity 1] → [Activity 2] → [Activity 3]. Does this feel like the right story? Is anything missing or out of order?"

Keep the backbone to 5-10 activities. If more, you're probably too detailed — some of those are tasks, not activities.

### Step 3: Map Tasks Under Each Activity

Go activity by activity. Don't try to map everything at once — depth over breadth.

For each activity, ask: "Inside [Activity], what are the concrete things a user does? Give me the steps — short verb phrases."

Guide with:
- "What's the FIRST thing they do inside this activity?"
- "What's the most COMMON thing? The thing they do every time?"
- "What's something they do only SOMETIMES? Only the first time? Only when something goes wrong?"

Tasks should be **functional-level** (Cockburn's goal levels):
- Too high: "Manage workspace" (that's an activity)
- Right: "Create workspace", "Switch workspace", "Add app to workspace"
- Too low: "Click the plus button" (that's a UI step, not a user task)

Confirm each activity's tasks before moving to the next one.

### Step 4: Explore Depth (The What-About Game)

This is where the map gets rich. For each task, play "What About":

- "What about when this goes WRONG? What happens if [task] fails?"
- "What about a DIFFERENT kind of user? Would they do this differently?"
- "What about the FIRST TIME vs the 10th time? Any difference?"
- "What about EDGE CASES? What's the weirdest thing someone might try?"
- "What about ALTERNATIVES? Is there another way to accomplish this?"

Capture these as:
- **Subtasks**: concrete sub-steps within the task
- **Variations**: alternative paths (single monitor vs multi-monitor)
- **Failure modes**: what goes wrong and what the user sees
- **Edge cases**: unusual but valid scenarios

Stack these vertically under each task — more important/common at top, less important at bottom.

This is the most important step. Don't rush it. Patton: "Every time we do this we find holes. We find things that another team should be taking care of but didn't know."

### Step 5: Slice for Outcomes

Draw horizontal lines through the map to create release slices.

Ask: "If we could only ship ONE thin slice that proves this works end-to-end, what would be in it?"

That first slice is the **walking skeleton** — the minimum end-to-end path.

Then: "What would we add in the SECOND slice to make it actually useful? What outcome would that achieve?"

Each slice needs a **target outcome** — not a feature list:
- Bad: "Add browser profile support"
- Good: "Users can switch between work and personal Chrome profiles in one shortcut"

Label each slice with:
- Name (MVP, v1.1, Nice-to-have)
- Target outcome (what changes for the user)
- Order (top = most essential)

Patton's rule: "Don't prioritize features — prioritize outcomes."

### Step 6: Story Categories (Optional)

If relevant, tag stories with Patton's categories:
- **Differentiator** — sets us apart from competition
- **Spoiler** — counters someone else's differentiator
- **Cost reducer** — reduces organizational costs
- **Table stakes** — necessary to compete

Ask: "Are any of these tasks your secret weapon? What makes this product DIFFERENT from alternatives?"

### Interview Mode Output

After all steps, present the complete story map and ask: "Does this feel right? Anything missing, misplaced, or wrong?"

Then emit the structured output (see Output section below).

---

## Extract Mode

Build a story map from an existing codebase. This is a **collaborative extraction** — you read the code but confirm with the user at every uncertainty.

### Before Starting

Ask:
1. "What's the project root? Where should I look?"
2. "What framework is this? (I'll auto-detect, but confirming saves time)"
3. "Who are the main users of this product? What do they use it for?"

### Phase 1: Ingest

Read the codebase structure to identify user-facing capabilities.

#### Git Availability Check
Before running git commands, check if the directory is a git repo:
- If yes: proceed with git co-change analysis and history-based slicing
- If no: skip git phases, note "No git history available — feature boundaries based on file structure only", and do NOT attempt git commands

#### Framework Detection and Reference Loading
After detecting the framework, ALWAYS read the corresponding reference file:
- Swift/SPM → read `references/swift-spm.md`
- Laravel → read `references/laravel.md`
- React/Next.js → read `references/react-nextjs.md`
- Other → proceed with generic extraction, note "No framework reference available"

**What to read (in order):**

1. **Route files** — the table of contents of what users can do
   - Swift/SPM: `Sources/*/Commands/*.swift` (CLI commands), menu bar actions
   - Laravel: `routes/web.php`, `routes/api.php`
   - React/Next.js: `app/` directory structure, `pages/`, route definitions
   
2. **Controllers/handlers** — what actions users take
   - Swift: Command structs, `@main` app body, menu actions
   - Laravel: `app/Http/Controllers/*.php`
   - React: page components, form handlers, API calls

3. **Auth/middleware** — who can do what (= actors)
   - Swift: permission checks, accessibility gates
   - Laravel: middleware, policies, gates
   - React: auth guards, role checks, protected routes

4. **Models/schemas** — what entities exist (= nouns)
   - Swift: config structs, data models
   - Laravel: `app/Models/`, migrations
   - React: TypeScript interfaces, API response types, Prisma schema

5. **Test files** — what's already validated (= coverage overlay)

6. **Git co-change analysis** — feature boundaries
   Run: `git log --name-only --pretty=format:'' | sort | uniq -c | sort -rn`
   Files that change together = same feature. This is more reliable than folder structure.

### Phase 2: Cluster into Activities

Group the discovered routes/commands by feature area:

- URL prefix grouping (`/workspace/*`, `/tile/*`, `/window/*`)
- CLI command grouping (workspace commands, tile commands)
- Module/folder grouping
- Git co-change clustering

**Present to user and ASK**: "I'm seeing these feature groups: [list]. Does this grouping make sense? Should anything be combined or split differently?"

### Phase 3: Map Tasks

For each activity, list the controller actions / command handlers as tasks.

Map technical verbs to user verbs:
- `store()` / `create()` → "Create [thing]"
- `update()` → "Edit [thing]"
- `destroy()` / `delete()` → "Remove [thing]"
- `index()` / `list()` → "Browse [things]"
- `show()` / `get()` → "View [thing]"
- `switch()` / `toggle()` → "Switch [thing]"

**Present to user and ASK**: "Under [Activity], I found these user actions: [list]. Do these look right? Am I missing any? Are any of these internal-only and not user-facing?"

### Phase 4: Detect Depth

For each task, analyze the code for:

- **Subtasks**: method calls within the handler, sequential steps
- **Variations**: if/else branches, switch cases, feature flags, optional parameters
- **Failure modes**: guard clauses, throw statements, error handlers, catch blocks
- **Edge cases**: boundary checks, nil coalescing, fallback defaults

**Present to user and ASK**: "For [Task], I see these variations: [list]. And these failure modes: [list]. Does this match your understanding?"

### Phase 5: Detect Actors

From auth middleware, permission checks, role-based logic:
- Extract actor types (admin, user, guest, unauthenticated)
- Map which actors can access which activities/tasks

If no auth exists (like milayout — single-user desktop app):
- Ask: "This looks like a single-user app. Is that right, or are there different modes/contexts?"

### Phase 6: Coverage Overlay

Check test files against the map:
- ✅ Task has test coverage (test file exists, assertions for this behavior)
- 🟡 Partial coverage (test file exists but doesn't cover all variations)
- ❌ No test coverage

**Present**: "Here's the coverage status across the map: [summary]. The biggest gaps are: [list]."

### Phase 7: Narrative Ordering

Arrange activities left-to-right in the order a user would encounter them:

- What does a NEW user do first? (onboarding, setup, first-run)
- What does a DAILY user do? (the main loop)
- What does an OCCASIONAL user do? (settings, config, admin)

**ASK**: "I've ordered the backbone as: [list]. Does this match how a user actually experiences the product?"

### Phase 8: Slicing (Optional in Extract Mode)

If the user wants release slices:
- The walking skeleton = routes that have both controller AND tests
- Slice 1 = most-used features (by git commit frequency)
- Later slices = less-used features

### Anti-Inference Rules

These rules are critical for Extract mode. Violating them produces unreliable maps.

1. **Never invent routes that don't exist in code.** If a feature seems missing, note it as a gap, don't add it.
2. **Never assume actor types without evidence.** If there's no auth middleware, ask.
3. **Never silently group ambiguous routes.** If a route could belong to multiple activities, ask which.
4. **Mark everything uncertain as `"confidence": "assumed"`** — but prefer asking over assuming.
5. **When you hit 3+ assumptions in a row, STOP and have a conversation.** You're probably missing context.
6. **Every failure mode needs a codeRef.** Failure modes MUST cite the specific code line (guard clause, throw, catch) that evidences them. If no code evidence exists, do NOT list it as a failure mode — list it as a QUESTION to ask the user. No codeRef = not a failure mode, it's a question.

### Assumption Tracking

Track assumptions as you extract. After EACH uncertain inference, add to a running list.

When you hit 3 assumptions WITHOUT user confirmation, STOP. Present the assumptions and WAIT for user response before continuing.

Format:
```
Assumptions so far:
1. [assumption] — confidence: low/medium
2. [assumption] — confidence: low/medium
3. [assumption] — confidence: low/medium ← STOPPING HERE

Do these hold? Should I adjust anything before continuing?
```

---

## Coverage Detection Algorithm

For each task:
1. Find test files that reference the handler/route/method name
   - If no test files reference it → mark as untested
2. Check for failure case assertions (4xx, error, fail, throws, XCTAssertThrows)
   - If no failure assertions → mark as partial (happy path only)
3. Check for variation coverage (multiple test methods per task, parameterized tests)
   - If only one test per task → mark as partial
4. Mark as tested only if: happy path + failure case + at least one variation

## Pre-Output Validation

Before emitting the story map, verify:
- [ ] Backbone reads left-to-right as a USER JOURNEY (not alphabetical, not technical grouping)
- [ ] Each task is a VERB PHRASE at functional level ("Create workspace" not "Click button")
- [ ] Each slice has an OUTCOME statement ("Users can..." not "Add feature X")
- [ ] Walking skeleton is END-TO-END (not just one activity)
- [ ] In Extract mode: every failure mode has a codeRef (no invented failure modes)
- [ ] No more than 2 unconfirmed assumptions remain

If any check fails, revise the map BEFORE presenting to user.

## Extending an Existing Map

When `--existing <path>` is provided:
1. Read the existing map
2. Extract/interview new content
3. Compare and present diff:
   - New activities/tasks not in existing map
   - Missing: in existing map but not found in code (possible dead features)
   - Changed: different names, order, or depth
4. Ask user: "Should I merge these changes, keep them separate, or adjust?"
5. Never silently overwrite the existing map

---

## Output

Both modes produce the same structured output. Format determined by `--format` flag.

### JSON Format (default)

```json
{
  "artifact": "story-map",
  "version": "1",
  "project": "{project name}",
  "mode": "interview|extract",
  "scope": "project|epic|feature",
  "opportunity": {
    "bigIdea": "",
    "targetUsers": "",
    "trigger": "",
    "desiredOutcome": ""
  },
  "personas": [
    {
      "name": "power user",
      "role": "daily user",
      "goals": ["switch contexts quickly", "tile windows without thinking"]
    }
  ],
  "activities": [
    {
      "id": "ACT-001",
      "name": "Manage Workspaces",
      "order": 1,
      "narrativePosition": "middle",
      "tasks": [
        {
          "id": "TSK-001",
          "name": "Create workspace",
          "goalLevel": "functional",
          "type": "core",
          "subtasks": [
            { "id": "SUB-001", "name": "Add normal app", "type": "core" },
            { "id": "SUB-002", "name": "Add browser window", "type": "variation" }
          ],
          "variations": [
            "single monitor vs multi monitor",
            "new window vs existing window"
          ],
          "failureModes": [
            "app not found on system",
            "browser profile undefined in Chrome"
          ],
          "testableOutcomes": [
            "workspace config saved to YAML",
            "apps launched in correct positions"
          ],
          "slices": ["MVP"],
          "confidence": "confirmed",
          "codeRefs": {
            "handler": "WorkspaceEngine.swift:switch()",
            "routes": ["workspace switch <name>"],
            "tests": ["WorkspaceTests.swift"]
          },
          "category": "differentiator|spoiler|cost-reducer|table-stakes|null"
        }
      ]
    }
  ],
  "slices": [
    {
      "id": "SLC-001",
      "name": "Walking Skeleton",
      "outcome": "user can switch between two workspaces with one shortcut",
      "order": 1,
      "strategy": "opening|midgame|endgame"
    }
  ],
  "coverage": {
    "tested": ["TSK-001"],
    "partial": ["TSK-003"],
    "untested": ["TSK-005", "TSK-006"]
  },
  "gaps": [
    "No undo for workspace switch",
    "Browser profile list not discoverable"
  ],
  "next_skill": "test-user-flow-mapper|test-case-planner",
  "unknowns": [],
  "handoff": {
    "artifact": "story-map",
    "version": "1",
    "activity_count": 0,
    "task_count": 0,
    "persona_count": 0,
    "slice_count": 0,
    "coverage_summary": { "tested": 0, "partial": 0, "untested": 0 },
    "next_skill": "test-user-flow-mapper",
    "unknowns": []
  }
}
```

The `handoff` block follows the same convention as `test-case-planner`, `test-risk-classifier`, and `test-generator` — a machine-readable footer that the next skill validates before proceeding. The `unknowns` array lists anything the storymap could not determine (e.g., "No auth middleware found — actor types assumed").

### Markdown Format (`--format markdown`)

```markdown
# Story Map: {project}

## Opportunity
{bigIdea}. For {targetUsers} who need {desiredOutcome}.

## Personas
- **{name}** ({role}): {goals}

## Backbone (left → right)

| ACT-001: {Activity 1} | ACT-002: {Activity 2} | ACT-003: {Activity 3} |
|---|---|---|
| TSK-001: {Task} | TSK-004: {Task} | TSK-007: {Task} |
| TSK-002: {Task} | TSK-005: {Task} | TSK-008: {Task} |
| TSK-003: {Task} | TSK-006: {Task} | |

## Release Slices

### 🔵 Walking Skeleton
**Outcome**: {outcome}
- TSK-001, TSK-004, TSK-007

### 🟢 Slice 2: {name}
**Outcome**: {outcome}
- TSK-002, TSK-005, TSK-008

## Detail: {Activity 1}

### TSK-001: {Task Name}
**Subtasks**: {list}
**Variations**: {list}
**Failure modes**: {list}
**Testable outcomes**: {list}
**Coverage**: ✅ tested | 🟡 partial | ❌ untested
```

### Manual Test Cases Format (`--format manual-test`)

```markdown
# Manual Test Cases: {project}

Derived from story map. Priority order.

## {Activity 1}

### MT-001: {Task — Happy Path}
- **Activity**: {activity name}
- **Task**: {task name}
- **Type**: ui | manual-backend
- **Priority**: critical | important | nice-to-have
- **Preconditions**: {what must be true before starting}
- **Steps**:
  1. {step 1}
  2. {step 2}
  3. {step 3}
- **Expected Result**: {what should happen}
- **Failure Signals**: {how to know it failed}
- **Notes**: {edge cases, things to watch for}

### MT-002: {Task — Variation}
...

### MT-003: {Task — Failure Mode}
...

### MT-004: {Task — Permission Denied}
...

### MT-005: {Task — Boundary / Edge Case}
...
```

#### Case generation depth rules

For each task in the story map, generate test cases using this minimum mapping:

| Task element | Generates | Priority |
|---|---|---|
| Task itself | 1 happy path case | critical |
| Each variation | 1 case per variation | important |
| Each failure mode | 1 negative case per failure mode | critical |
| Permission/auth | 1 unauthorized access case per actor type that should be blocked | critical |
| Search/filter (if present) | 1 search case + 1 filter case + 1 clear/reset case | important |
| Sort (if present) | 1 sort toggle case | nice-to-have |
| Pagination (if present) | 1 pagination case | nice-to-have |
| Delete (if present) | 1 confirmation modal case + 1 cancel case | critical + nice-to-have |
| Form validation (if present) | 1 empty required fields case + 1 per unique constraint | important |
| Team scoping (if multi-tenant) | 1 cross-team isolation case per user-facing activity | critical |
| Embedded mode (if supported) | 1 embedded vs standalone behavior case | nice-to-have |

**Target**: each task with CRUD operations should produce 6-12 test cases.
A task with only read/view should produce 3-5 test cases.
Backend-only tasks (non-UI): tag as `type: manual-backend`, still generate cases.
```

---

## Integration with Test Pipeline

The story map produces `artifact: "story-map"` — its own artifact type, NOT a `flow-map`. It feeds into the pipeline as an upstream input:

```
/storymap (story-map) → test-user-flow-mapper (flow-map) → test-case-planner → test-risk-classifier → test-generator
```

Or it can feed directly into `test-case-planner` with activities and tasks as input (skipping the flow-map step):

```
/storymap (story-map) → test-case-planner → test-risk-classifier → test-generator
```

The story map is NOT directly compatible with the `flow-map` handoff schema. The `test-user-flow-mapper` skill transforms `activities[]/tasks[]` into `flows[]` when a flow-map is needed.

When handing off directly to `test-case-planner`:
- Activities map to feature groupings
- Tasks map to components
- Variations + failure modes map to test case scenarios
- Coverage overlay tells the planner what's already tested

---

## Framework Reference Files

For Extract mode, framework-specific extraction patterns live in `references/`:

- `references/swift-spm.md` — Swift Package Manager projects (CLI commands, MenuBarExtra, SPM targets)
- `references/laravel.md` — Laravel route files, controllers, middleware, models
- `references/react-nextjs.md` — Next.js app router, page components, API routes

Read the relevant reference file after detecting the framework. If no reference exists for the detected framework, proceed with generic extraction and note the gap.

---

## What NOT to Do

- Don't generate the entire map silently in Interview mode — this is a CONVERSATION
- Don't skip the "What-About" game in Step 4 — depth is where the value is
- Don't invent flows that aren't in the code in Extract mode
- Don't assume actor types without evidence
- Don't treat the backbone as a feature list — it's a NARRATIVE (chronological user journey)
- Don't produce test code — this skill produces story maps and manual test cases, not executable tests
- Don't prioritize features — prioritize OUTCOMES for each slice