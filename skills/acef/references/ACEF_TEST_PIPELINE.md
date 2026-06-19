# ACEF Test & Flow Pipeline (Layer 2)

The QA/automation engine. These are real skills in `skills/` — they are invoked **inside a route**, under whichever
lane the work is on (lightweight or BMAD v2), not as a separate lane.

## The chain (user flow → cases → tests)

```
test-user-flow-mapper     →  Flow Map (what users actually do, end-to-end, per persona)
        ↓
test-case-planner         →  Test Case Plan (happy / negative / edge / session, with priority)
        ↓
test-browser-generator    →  E2E/browser test files (detect the real tool from the adapter)
   or  test-gen / test-generator  →  unit / integration tests
```

Supporting skills:
- **test-strategy** — choose levels/boundaries and what to test where (shift-left, before writing tests).
- **test-risk-classifier** — rank what must be tested by risk × frequency.
- **test-coverage-auditor** — find untested behavior / weak coverage on existing tests.
- **storymap** — story map for planning and as the QA backbone (journeys → testable outcomes).
- **qa / qa-only** — QA passes.

## Bootstrapping when there are zero tests
Most brownfield repos start with no tests. The first test on a repo runs through `acef-test-bootstrap`:
- detect the framework from the adapter — and verify it's actually **wired**, not just installed (deps in the manifest
  ≠ a working config);
- if no framework exists, propose the stack default and get approval before installing;
- produce **one golden test**, grounded at **symbol/contract level** (real signature + return shape), preferably a
  pure/no-DOM target to de-risk the first green run;
- then expand coverage with the skills above.

## Grounding rule (applies to all test generation)
Ground at the **symbol level, not the file level**: read the actual signature/return shape of the target and assert
against that. A file-level "this is the validator/formatter" pointer hides contract mismatches. Never ground in
commented-out/dead code or non-test scaffolding (a benchmark harness in a `test/` dir is not a test idiom).

## How it maps to routes
- **Test-case extraction (D):** `test-user-flow-mapper → test-case-planner`.
- **Test automation (E):** add `test-browser-generator` (E2E) after the cases.
- **Unit / integration (F):** `test-gen` / `test-generator` (+ `acef-test-bootstrap` if the repo has no tests yet).

All frameworks, commands, and tools are **adapter values** — detected per repo, never assumed.
