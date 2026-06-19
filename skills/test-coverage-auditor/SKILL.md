---
name: test-coverage-auditor
description: 'Scan an existing codebase and test suite to find coverage gaps. Produces
  a prioritized audit report showing what''s untested, undertested, or tested only
  at the happy path level. Framework-extensible core (currently Laravel-aware). Laravel-specific when PHP files are
  detected. Two modes: Quick Scan (file-level, large codebases) and Deep Audit (method-level,
  per module). Triggers on: "what''s not tested", "find coverage gaps", "audit my
  tests", "what am I missing in tests", "coverage report", "what should I test next",
  "scan my test suite", "find untested code". Run this for scenario B (existing project)
  or after initial test suite is written. Output feeds into test-risk-classifier and
  test-generator.

  '
permalink: ram/04-ai-toolkit/skills/test/test-coverage-auditor/skill
---

# Test Coverage Auditor

**Pipeline position: Scenario B entry point**
```
[test-coverage-auditor] → test-risk-classifier → test-generator
```

Scans source code and existing tests to find what's missing.
Does not write tests — produces a prioritized **Audit Report** that tells
you exactly what to work on next and which skill to use.

Two modes:
- **Quick Scan** — file-level overview, works on any size codebase
- **Deep Audit** — method-level gap analysis, focused on one module at a time

---

## Step 1: Determine Mode

**Quick Scan** — use when:
- You don't know where to start
- The codebase is large (50+ source files)
- You want a high-level picture first

**Deep Audit** — use when:
- You've already done a Quick Scan
- You want to fully cover a specific module or feature
- You have a specific class or area in mind

If the user hasn't specified, ask:
> "Would you like a quick overview of the whole codebase, or a deep audit of a specific module?"

---

## Step 2: Discover the Codebase

### With Claude Code (preferred — use the bundled scripts):

```bash
# Full pipeline: scan source + tests + generate gap report in one command
python skills/test-coverage-auditor/scripts/gap_report.py --scan app/ tests/ --summary

# Or run steps individually:

# 1. Scan source classes (outputs source_map.json)
python skills/test-coverage-auditor/scripts/scan_source.py app/ --out source_map.json --summary

# 2. Scan test suite (outputs test_map.json)
python skills/test-coverage-auditor/scripts/scan_tests.py tests/ --out test_map.json --summary

# 3. Generate prioritized gap report
python skills/test-coverage-auditor/scripts/gap_report.py source_map.json test_map.json --summary

# Top N gaps only:
python skills/test-coverage-auditor/scripts/gap_report.py source_map.json test_map.json --summary --top 15
```

The scripts handle multi-language (PHP, Python, JS/TS), spaces in filenames,
and produce structured JSON — avoiding the fragility of shell pipelines.

### Without Claude Code (files provided manually):
- Ask user to paste directory listing, route list, or specific files
- Work from what's available — note limitations in the report

### With Serena MCP (best for deep audit):
```
Query: "List all public methods in the {module} module"
Query: "Find all classes in app/Services"
Query: "What classes have no corresponding test file"
```

---

## Step 3: Discover the Test Suite

The `scan_tests.py` script handles this automatically. It detects:
- Test method count per file
- Failure case presence (`assertStatus(4xx)`, `expectException`, etc.)
- Fake usage (`Queue::fake`, `Event::fake`, `Mail::fake`)
- Auth testing (`actingAs`, `assertGuest`)
- Quality label: GOOD / PARTIAL / SHALLOW / MINIMAL

If running manually without scripts:
```bash
# Quick method count per test file (Laravel)
grep -rn "public function test" tests/ | awk -F: '{print $1}' | sort | uniq -c | sort -rn
```

---

## Step 4: Build the Gap Map

For each source file/class, determine its coverage status:

### Classification:

**🔴 RED — No tests at all**
- Source file exists, no corresponding test file
- No test references this class

**🟠 ORANGE — Exists but shallow**
- Test file exists but only covers happy path
- No failure cases, no edge cases
- Side effects not asserted (no `assertDispatched`, `assertSent`, etc.)

**🟡 YELLOW — Partial coverage**
- Some methods tested, others not
- Integration tested but no unit tests (or vice versa)
- Happy path + some edge cases, but missing critical failure modes

**🟢 GREEN — Good coverage**
- Happy path + failure cases present
- Side effects asserted
- Edge cases covered

### Method-level signals to look for in existing tests:

The `scan_tests.py` script detects all of these automatically and scores each file.
If running manually:

```bash
# Side effects that should be asserted
grep -rn "Queue::fake\|Event::fake\|Mail::fake\|Notification::fake" tests/

# Auth testing
grep -rn "actingAs\|assertGuest\|assertAuthenticated" tests/

# Failure cases (correct pattern — pipe-separated alternatives)
grep -rn "assertStatus(4[0-9][0-9]\|assertStatus(5[0-9][0-9]\|assertThrows\|expectException" tests/

# Validation testing
grep -rn "assertJsonValidationErrors\|assertSessionHasErrors" tests/
```

---

## Step 5: Score and Prioritize

For each gap found, calculate a priority score:

```
Priority Score = Coverage Gap Weight + Complexity Estimate + Business Risk

Coverage Gap Weight:
  RED    = 3 (no tests)
  ORANGE = 2 (happy path only)
  YELLOW = 1 (partial)

Complexity Estimate (from file size / method count heuristic):
  Large file (200+ lines)  = +2
  Medium file (100-200)    = +1
  Small file (<100 lines)  = +0

Business Risk:
  Contains "payment", "billing", "subscription", "auth", "permission" = +3
  Contains "publish", "distribute", "send", "notify", "delete"       = +2
  Contains "get", "list", "show", "index", "read"                    = +0
```

Sort all gaps by score descending — highest score = test first.

---

## Step 6: Output — The Audit Report

````markdown
## Coverage Audit Report: {Project / Module Name}
Generated: {date}
Mode: Quick Scan | Deep Audit
Source files scanned: {n}
Test files found: {n}
Overall coverage estimate: 🔴 Low | 🟡 Partial | 🟢 Good

---

### Summary

| Status | Count | % of codebase |
|---|---|---|
| 🔴 No tests | {n} | {n}% |
| 🟠 Happy path only | {n} | {n}% |
| 🟡 Partial coverage | {n} | {n}% |
| 🟢 Good coverage | {n} | {n}% |

---

### Priority Gap List

Sorted by priority score — work top to bottom.

#### 🔴 Priority 1 — {ClassName} (Score: {n})
**File**: `app/Services/PressReleasePublishingService.php`
**Status**: No tests
**Why critical**: Contains payment and distribution logic
**Gaps**:
- No test file exists
- 4 public methods completely untested
- Side effects (Queue dispatch, Event fire, Mail send) never asserted
**Next step**: Run `test-case-planner` on this file, then `test-risk-classifier`

---

#### 🟠 Priority 2 — {ClassName} (Score: {n})
**File**: `app/Http/Controllers/PressReleaseController.php`
**Status**: Happy path only
**Why important**: Core CRUD controller, 6 routes
**Gaps**:
- `store()` tested only for 200 success — missing 422, 401, 403
- `destroy()` not tested at all
- No auth guard tests (unauthenticated requests)
- `Queue::fake()` never used — job dispatch never asserted
**Next step**: Run `test-risk-classifier` on existing test + source, then `test-generator`

---

#### 🟡 Priority 3 — {ClassName} (Score: {n})
...

---

### What's Well Covered ✓
- `{ClassName}` — happy path + failure cases + side effects asserted
- `{ClassName}` — validation fully covered
- ...

---

### Routes Without Test Coverage

| Method | Route | Controller | Status |
|---|---|---|---|
| POST | /press-releases/{id}/publish | PressReleaseController@publish | 🔴 None |
| DELETE | /press-releases/{id} | PressReleaseController@destroy | 🔴 None |
| GET | /admin/users | AdminController@index | 🟠 Auth not tested |

---

### Test Quality Issues Found

- **No failure cases**: {n} test files have zero 4xx/5xx assertions
- **Missing fakes**: {n} controllers dispatch jobs/events with no `Queue::fake()` or `Event::fake()` in tests
- **No auth tests**: {n} protected routes never tested as guest
- **Validation untested**: {n} FormRequests have no dedicated test

---

### Recommended Next Steps

**This week (CRITICAL gaps):**
1. `{ClassName}` — run `test-case-planner` → `test-risk-classifier` → `test-generator`
2. `{ClassName}` — same pipeline

**Next sprint (IMPORTANT gaps):**
3. `{ClassName}` — run `test-risk-classifier` on existing tests → `test-generator` for missing cases
4. Routes without auth tests — add to existing test files

**Backlog (STANDARD gaps):**
5-N. {remaining items}
````

---

## What NOT to Do

- Do not write test code
- Do not run the full audit if the user only asked about one module — use Deep Audit mode
- Do not flag framework internals as gaps (Eloquent core, Laravel middleware pipeline, etc.)
- Do not report 🔴 for abstract base classes or interfaces with no direct behavior
- Do not fabricate coverage data — if you can't determine status, mark as "Unknown — needs manual check"