---
name: acef-router
description: "Route a user request through ACEF brownfield paths before any execution. Use when a user wants work on an existing codebase but the right path is unclear: small feature, large feature, bug fix, test-case extraction, test automation setup, or unit/integration tests. Produces a short route decision, minimum required inputs, expected next artifact, and whether project adapter extraction is needed. Does not create files or change code without explicit approval."
---

# ACEF Router

Use this skill as the front door for ACEF brownfield work.

## Sources

- `references/ACEF_BROWNFIELD_ROUTES.md`
- `references/ACEF_AGENT_BEHAVIOR.md`
- `references/ACEF_PROJECT_ADAPTER_EXTRACTION.md`
- `references/ACEF_DELIVERY_RULES.md`

## Rule

Route first. Execute later.

Do not start implementation, tests, installs, or broad repo scans unless the user explicitly approves that next step.

Ask at most three yes/no clarifying questions before choosing a provisional route. If confidence is low or risk is
high, route upward to the safer/larger path; never route downward to reduce ceremony.

## Procedure

1. Ask only what cannot be inferred:
   - existing codebase or new project?
   - feature, bug, test-case extraction, test automation, or unit/integration tests?
   - repo/product area?
   - requirement clear or unclear?
   - platform if relevant?
   - likely risk: multi-repo, new pattern/contract, auth/payment/data/migration?
2. Check whether a project adapter exists and is fresh.
3. Choose one route:
   - A: small feature
   - B: large feature
   - C: bug fix
   - D: test-case extraction
   - E: test automation setup
   - F: unit/integration test expansion
4. Return:
   - selected route
   - why
   - minimum next inputs
   - next artifact
   - missing prerequisites
5. Use READY / DRAFT / MISSING language for capabilities.

## Confidence And Escalation

Start with the smallest plausible route, then escalate when evidence requires it.

Escalate from Route A to Route B when:
- more than one module/repo is affected
- no qualified golden neighbor exists
- a new pattern/contract is introduced
- auth, payment, data, migration, generated client, shared/core, or release risk appears
- confidence is low after three questions

Escalate from Route C bug fix to Route A/B when root cause reveals new behavior or design change.

Route D/E/F are test-specific routes. If they reveal missing project adapter or missing test pattern, pause and make
adapter extraction or test bootstrap the next artifact.

## Output

Keep it short:

```md
Route:
Why:
Need from user:
Next artifact:
Prerequisites:
Do not run yet:
```

## Guards

- Do not make the user pick a skill or SDLC phase.
- Do not run all SDLC phases; run only what the route needs.
- If adapter is missing or stale, say adapter extraction is the next step.
- If work is guarded/critical, require human approval before execution.
- Brownfield vs greenfield is determined from repo/project evidence, not by asking the user to choose methodology.
