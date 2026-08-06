# AGENTS.md

This is the short entry point for fresh agents working on ACEF.

## ACEF Admission

Do not bootstrap ACEF for reversible, contained work with one technical boundary and one product surface. Use the
repository's native workflow, make targeted reads, implement the smallest patch, run focused verification, and report
the result. Do not create ACEF run artifacts for that work.

Native work uses the installed speed contract: no subagents; at most three distinct focused verification commands,
two attempts per identical command, 180 seconds per focused command, and 10 active minutes. Run recognized tests or
static analysis through `.acef/bin/acef-native-test -- <focused-command>`. Broad verification is implementation-time
forbidden and may run once only as `.acef/bin/acef-native-test --closeout -- <broad-command>` on a clean worktree.
When the requested patch is green, stop; record unrelated failures as follow-up work instead of investigating them.

Start ACEF only when the request needs its controls: persistence/migration, security/privacy/permissions, money,
provider integration, realtime, concurrency/fencing, state-machine behavior, tracking/reporting/analytics, a new
pattern, multiple technical boundaries/product surfaces, irreversible effects, or multi-session/worker coordination.

For admitted work, choose execution depth and assurance separately:

- ACEF Fix (`quick-fix`), ACEF Standard (`lightweight`), or ACEF Full (`full-bmad` / BMAD v2).
- Baseline or Guarded assurance. Guarded is additive; it is not a fourth workflow and must not duplicate the selected
  workflow's lifecycle.

New ACEF Fix runs use `quickFixContract: single-review-v1`: one developer, one independent reviewer, focused red/green
and revert-proof evidence, then deterministic closeout. Guarded may strengthen evidence and scope controls, but it does
not add Process Judge, Patch Assurance, Verify-Patch, Test Review, or a second review cycle to Quick Fix.

Do not turn a batch of independent defects into one Full story. If intake contains multiple root causes or unrelated
audit findings, return `REPLAN/SPLIT` before active-run bootstrap and route each proven bounded defect independently.
Full is for one coherent planning-heavy contract, not a container for repair batches.

Splitting is followed by admission, not automatic ACEF bootstrap. New intake must record reversibility, technical
boundary count, and product-surface count. A reversible one-boundary/one-surface child without an ACEF control trigger
uses the native repository workflow and must not create ACEF run, evidence, reviewer, or closeout artifacts.

Use typed active-run v2 fields `workflowId`, `assuranceProfile`, and `scopeUnit`. New Full runs also use
`fullFlowContract: four-actor-v3`; an existing Full record without that field means compatibility
`six-actor-v2`. A legacy active `lane: guarded` is ambiguous and must be explicitly migrated before writes are
authorized.

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
