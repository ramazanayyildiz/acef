# AGENTS.md

This is the short entry point for fresh agents working on ACEF.

## ACEF Admission

Do not bootstrap ACEF for reversible, contained work with one technical boundary and one product surface. Use the
repository's native workflow, make targeted reads, implement the smallest patch, run focused verification, and report
the result. Do not create ACEF run artifacts for that work.

Start ACEF only when the request needs its controls: persistence/migration, security/privacy/permissions, money,
provider integration, realtime, concurrency/fencing, state-machine behavior, tracking/reporting/analytics, a new
pattern, multiple technical boundaries/product surfaces, irreversible effects, or multi-session/worker coordination.

For admitted work, choose execution depth and assurance separately:

- ACEF Fix (`quick-fix`), ACEF Standard (`lightweight`), or ACEF Full (`full-bmad` / BMAD v2).
- Baseline or Guarded assurance. Guarded is additive; it is not a fourth workflow and must not duplicate the selected
  workflow's lifecycle.

Use typed active-run v2 fields `workflowId`, `assuranceProfile`, and `scopeUnit`. A legacy active `lane: guarded` is
ambiguous and must be explicitly migrated before writes are authorized.

The `direct` lane is retired for new runs after failing its repeated cost/reliability measurement. Existing
`ACEF_DIRECT_RUN.json` records remain readable and may be closed or promoted for compatibility.

## First Checks

Before reporting that an ACEF flow, gate, lane, reviewer, worker role, hook, validator, or enforcement change is
implemented, inspect the repo truth:

1. Read `docs/ai/capabilities/*.json` if present.
2. Read `CHANGELOG.md` for the human-readable framework history.
3. Run `node scripts/acef-process-validator --repo . --check capability-change`.
4. Report the smallest honest status from the capability record: `documented-only`, `specified`, `wired`, `enforced`,
   `proven`, or `installed`.

Do not call a capability implemented when only markdown changed. If only method docs changed, it is `documented-only`.

## Core Rule

ACEF claims are not evidence. Repository files, validators, tests, installed hooks/tools, and runtime evidence are the
evidence. Keep that boundary intact.
