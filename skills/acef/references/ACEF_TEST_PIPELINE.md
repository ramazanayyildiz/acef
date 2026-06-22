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

Test setup status is a gate input. A subagent summary like "no tests" is not enough; the conductor must verify
project manifests, config files, scripts/commands, and existing test files before recording `wired`,
`installed-but-not-wired`, or `missing` in the preflight artifact.

## Grounding rule (applies to all test generation)
Ground at the **symbol level, not the file level**: read the actual signature/return shape of the target and assert
against that. A file-level "this is the validator/formatter" pointer hides contract mismatches. Never ground in
commented-out/dead code or non-test scaffolding (a benchmark harness in a `test/` dir is not a test idiom).

## External framework API grounding
When a story's ATDD depends on third-party framework behavior, prove the real API before writing acceptance tests.
Examples: CMS block registration/forms, router internals, ORM relationship conventions, payment SDK callbacks, queue
middleware, or component-library field builders.

Required behavior:
- run a small grounding spike or probe against the installed framework version;
- prove one real reference implementation using the framework's real public API;
- record the API contract in the ledger before ATDD starts;
- write ATDD against that proven contract, not against guessed introspection methods;
- reject framework-fighting fixes such as fake descriptors, vendor facade/class overrides, monkey patches, or test-only
  shims unless the human explicitly accepts them as product architecture.

If the proven API contradicts the planned test contract, the right outcome is `REPLAN`, not a green test.

## Real runtime smoke
When behavior depends on a runtime entrypoint, at least one test or verification must execute that same entrypoint. Do
not accept a green test that exercises only a shortcut path when production uses a command, HTTP route, scheduler, queue,
middleware stack, template renderer, or CMS/admin runtime.

Examples:
- seeders: run the real seed command, not only an in-process seeder shortcut;
- routed pages: issue the real HTTP request and assert meaningful rendered content, not only `200`;
- queues/jobs: dispatch through the configured queue path when queue wiring is the behavior under test;
- scheduler/cache/indexing: run the command or scheduler entrypoint;
- CMS blocks/templates: render through the page/template route used in production, not only an isolated component helper.

Every status assertion on a user-visible runtime path should be paired with a content or negative assertion that proves
the body is correct. `assertOk()` alone is not enough; a page returning raw JSON, fallback HTML, or an error shell can
still be `200`.

A discovered runtime-smoke gap is a test gap: write the failing real-entrypoint test first, then fix.

## How it maps to routes
- **Test-case extraction (D):** `test-user-flow-mapper → test-case-planner`.
- **Test automation (E):** add `test-browser-generator` (E2E) after the cases.
- **Unit / integration (F):** `test-gen` / `test-generator` (+ `acef-test-bootstrap` if the repo has no tests yet).

All frameworks, commands, and tools are **adapter values** — detected per repo, never assumed.

## Where cases sit in delivery

For risky or large work, test cases are not a late documentation task. They are the oracle that stories and automation
use:
- before implementation: map the affected flows and produce the first test-case plan;
- during story slicing: attach relevant cases to each story/task;
- before automation: use the test-case plan as the source for browser/unit/integration generators;
- at epic close: regenerate or reconcile the flow/test-case/manual-QA set so every Critical/High persona path is
  executed, explicitly deferred, or marked blocked/failing.
