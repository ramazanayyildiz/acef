---
name: test-gen
version: 1.0.0
description: 'Generate and run Swift/XCTest tests with coverage-driven iteration (swift test
  + llvm-cov). Use when asked to generate, write, or add tests for Swift package code or
  to raise its coverage, or on /test-gen. For Laravel/PHP or Risk-Profile-driven test
  code use test-generator.'
permalink: ram/04-ai-toolkit/skills/test/test-gen/skill
---

# /test-gen — Intelligent Test Generation

## When to Use
- User says "generate tests", "write tests", "test this file/module", "add tests for X"
- User wants to increase test coverage
- After implementing a new feature that needs tests
- Arguments: optional file path or module name to target

## How It Works

### Phase 1: Analyze (before writing any test code)

1. **Identify target**: If user specified a file/module, use that. Otherwise, find the most under-tested code:
   - Read existing tests to understand what's already covered
   - Identify source files with zero or minimal test coverage

2. **Read the source code** thoroughly. For each function/method, classify:
   - `[HP]` Happy path — normal successful execution
   - `[EP]` Error path — throws, returns nil, guard failures
   - `[BV]` Boundary values — empty arrays, zero, max values, nil optionals
   - `[EC]` Edge cases — concurrent access, race conditions, type mismatches
   - `[INT]` Integration — interactions between components

3. **Read existing tests** to understand:
   - Test naming convention (e.g., `test_descriptiveName`, `testMethodName_condition_expectedResult`)
   - Helper functions and builders already available
   - Mock patterns in use
   - Which assertions the project prefers

4. **Output a test plan** (show to user before generating):
   ```
   Target: WindowEngine.swift (0% covered)
   Existing patterns: XCTestCase, makeWindow() helper in tests
   
   Tests to generate:
   - [HP] matchWindows returns correct matches for exact hints
   - [HP] matchWindows handles multiple windows per app
   - [EP] matchWindows with empty window list returns empty
   - [EP] matchWindows with no matching rules returns unmatched
   - [BV] matchWindows with single window, single rule
   - [EC] matchWindows tiebreaking when scores are equal
   - [INT] matchWindows with mixed hint + title matching
   ```

### Phase 2: Generate

5. **Generate tests following these rules:**

   **Structure:**
   - One test method = one behavior. Name describes the scenario.
   - Use Arrange-Act-Assert pattern. Keep each test under 20 lines.
   - Group related tests with `// MARK: -` sections
   - Put new tests in a NEW test file, don't modify existing test files (unless user explicitly asks)

   **Quality gates (MUST follow):**
   - Every `guard`, `throw`, `if-else`, and `switch` branch gets at least one test
   - Test the ABSENCE of behavior too (ensure X does NOT happen when Y)
   - Prefer concrete values over random/generated data
   - No `XCTAssertTrue(true)` or meaningless assertions
   - No tests that test the language/framework (e.g., testing that arrays append works)
   - Tests must not depend on: file system, network, running apps, Accessibility permissions, or specific macOS state

   **Mocks and helpers:**
   - Check if protocol interfaces exist for the service being tested
   - Create mock implementations that conform to the protocol
   - If no protocol exists, test the public API directly with real instances
   - Put shared helpers/mocks in a dedicated file (e.g., `Mocks.swift`, `TestHelpers.swift`)
   - Reuse existing helpers — don't create duplicates

   **Naming:**
   - Match existing test naming convention in the project
   - If no convention exists, use: `test_methodName_condition_expectedResult`
   - Example: `test_matchWindows_emptyList_returnsEmpty`

### Phase 3: Validate

6. **Run the tests:**
   ```bash
   swift test --filter TargetTestClass
   ```

7. **If tests fail:**
   - Read the failure message
   - Fix the TEST (not the source code) — unless you find an actual bug
   - If you find a real bug, report it to the user and ask before fixing
   - Re-run until all pass

8. **If tests pass, check coverage** (if available):
   ```bash
   swift test --enable-code-coverage
   xcrun llvm-cov report .build/debug/<Package>PackageTests.xctest/Contents/MacOS/<Package>PackageTests --instr-profile .build/debug/codecov/default.profdata --sources Sources/
   ```

9. **Report results:**
   ```
   Generated: 12 tests in WindowEngineTests.swift
   All passing: 12/12
   Coverage delta: WindowEngine.swift 0% -> 78%
   Uncovered: lines 142-156 (requires Accessibility permission — skipped by design)
   ```

### Phase 4: Iterate (if user asks for more)

10. Re-run coverage, identify remaining gaps, generate targeted tests for uncovered branches

## Rules

- Change source code only to fix a genuine bug, and ask first: the tests should describe current behavior.
- Test private methods through the public API.
- Keep tests that need real macOS permissions (Accessibility, Screen Recording) out of unit tests; they belong in integration tests.
- Run the tests before presenting them; an unrun test is a guess.
- Match the project's existing test conventions; read existing tests first.
- Prefer fewer high-quality tests over many shallow ones.

## Arguments

- `/test-gen` — auto-detect most under-tested module
- `/test-gen Sources/<Module>/<File>.swift` — target specific file
- `/test-gen --plan-only` — show test plan without generating code
- `/test-gen --gaps` — run coverage and show uncovered areas only