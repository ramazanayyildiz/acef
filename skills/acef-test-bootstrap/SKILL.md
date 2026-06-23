---
name: acef-test-bootstrap
version: 1.0.0
description: "Bootstrap the first accepted test pattern for a repository using the project's adapter. Use when a repo has no qualified test neighbor or test automation/unit/integration work needs a local pattern. Stack-agnostic: detect and follow the repo's existing framework if present; if none exists, propose options and ask for approval before adding dependencies. Produces one small approved test pattern, not broad test coverage."
---

# ACEF Test Bootstrap

Use this skill when a repo needs its first accepted test neighbor.

## Required Inputs

- project adapter or repo path
- target platform/module/flow
- test type: unit, integration, component, E2E, browser/device
- existing test framework status

## Procedure

1. Read the project adapter.
2. Verify test setup from source evidence: manifest dependencies, scripts/commands, config files, and existing test
   files. Do not accept a subagent's "tests exist/no tests" summary as gate evidence.
3. If tests exist:
   - choose a qualified golden test neighbor
   - do not bootstrap a new pattern
4. If framework exists but no tests exist:
   - create/propose one minimal test using that framework
   - keep it focused on stable behavior
5. If no framework exists:
   - identify likely framework from the stack
   - present options and tradeoffs
   - ask for approval before installing anything
6. Define the adapter values:
   - test folder
   - naming pattern
   - command
   - fixture/mock setup
   - CI hook if present
7. Run only the narrow command needed for the sample when approved.
8. Record the approved test as the golden test neighbor and update the preflight/process artifact with evidence.

## Detection Rule

Follow this order:

1. Mirror existing tests if a qualified test neighbor exists.
2. If a framework is configured but no tests exist, use that configured framework. **Verify it is actually wired, not just installed** — deps in the manifest do not mean a working config (e.g. vitest installed with no `test` block defaults to `node` env, so jsdom/component tests won't run until the config block is added). Check the config, not just `package.json`.
3. If multiple frameworks are configured, ask before choosing.
4. If no framework is configured, propose the stack-default option with evidence and ask for approval before install. Pin versions to a team standard if any exist; if the repo pins none, flag the proposed versions as approval-gated, not grounded.

**Ground the golden test at symbol/contract level.** Read the real signature, argument types, and return shape of the target symbol (`path:line`) and assert against THAT — not against an assumed shape. For the first test, prefer a pure, deterministic, no-DOM/no-DB target to de-risk the first green run. Do not ground in commented-out/dead code or non-test scaffolding (a benchmark/console harness inside a `test/` dir is not a test idiom).

## Filter Ladder

Only accept the bootstrap test as the golden pattern if it is:

1. buildable
2. runnable by a recorded command
3. passing
4. non-flaky under a narrow rerun when practical
5. behavior-focused, not just implementation snapshot

If it fails, run a narrow fix loop. Do not expand into broad coverage.

## Output

```md
Test bootstrap target:
Existing test status:
Evidence checked:
Selected framework:
Command:
Sample test path:
Golden test neighbor:
Approval needed:
Evidence:
```

## Guards

- Do not generate broad tests before one pattern is accepted.
- Do not install dependencies without explicit approval.
- Do not assume xUnit/Jest/Vitest/etc.; use adapter evidence.
- If no stable unit seam exists, suggest integration/E2E bootstrap instead.
- Do not claim coverage improvement as success unless the test also passes and is useful as a future neighbor.
