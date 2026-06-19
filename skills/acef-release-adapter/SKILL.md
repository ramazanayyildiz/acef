---
name: acef-release-adapter
description: "Extract and use a project's release/CD adapter for ACEF. Use when preparing release, deployment, rollback, changelog, or post-release checks for a brownfield project. Stack-agnostic: reads project workflows and scripts, distinguishes deploy-only workflows from real gates, and produces a release readiness checklist. Does not deploy without explicit approval."
---

# ACEF Release Adapter

Use this skill for release/CD preparation after implementation and review are complete.

## Inputs

- project adapter
- repo path
- target environment
- change summary
- risk level

## Procedure

1. Read release/deploy evidence:
   - workflow files
   - package scripts
   - deployment docs
   - environment config references
2. Identify:
   - deploy command/workflow
   - required checks before deploy
   - manual approval points
   - rollback path
   - changelog/release notes location
   - post-deploy health check
3. Distinguish:
   - deploy workflow
   - CI/test gate
   - smoke/canary check
4. Produce release readiness checklist.
5. Ask for explicit approval before any deploy or external side effect.

Gate rule: release readiness is a Process Judge input. Do not accept "CI exists" or "deploy exists" from a summary.
Record the exact workflow/script path and the checks it actually runs. A deploy-only workflow is not a test gate.

## Readiness Checks

Before release, identify whether the project has:

- build/lint/typecheck/test evidence
- changelog or release notes location
- rollback command or revert path
- canary/smoke/health check
- owner for guarded/critical release
- environment and secret/config dependency notes

If any item is missing, report it as missing. Do not invent a release process.

## Output

```md
Release target:
Deploy mechanism:
Required pre-release checks:
Rollback path:
Post-deploy check:
Release notes/changelog:
Approval needed:
```

## Guards

- Do not deploy without explicit approval.
- Do not claim deploy workflows are test gates unless they actually run tests.
- For guarded/critical changes, require rollback path and human owner.
- Keep release flow project-adapter based; generic ship/canary skills are references, not universal truth.
