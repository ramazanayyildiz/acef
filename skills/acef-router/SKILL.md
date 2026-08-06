---
name: acef-router
version: 1.0.0
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

Splitting is decomposition, not admission. After `REPLAN/SPLIT`, reassess every child from the native/ACEF boundary;
never inherit the parent route, workflow, assurance profile, reviewer requirement, or run state. A native child creates
no ACEF active run or evidence package.

Route selection is not capability availability. A route says what the work needs; preflight proves whether the required
lane/tools can actually run. The router must not claim BMAD, tests, CI, or release readiness as available unless the
later preflight records resolved paths/commands and evidence.

Do not start implementation, tests, installs, or broad repo scans unless the user explicitly approves that next step.

Ask at most three yes/no clarifying questions before choosing a provisional route. Low confidence or planning/scope
uncertainty may increase execution depth. High risk increases assurance to Guarded; it does not by itself select Full
BMAD. Reversible single-boundary/single-surface work is a native repository task outside ACEF; do not create ACEF state
for it.

Before planning, dispatch, or implementation, run `spec-readiness` for thin, broad, product-shaped, CRM/notes/tracking,
finance/accounting, persistence, RBAC, schema, PII, or money-related requests and write
`docs/ai/ACEF_SPEC_READINESS.json`. The dispatcher must not proceed unless that verdict is `PASS` or a reversible
low-risk exception has explicit human risk acceptance.

For admitted ACEF tasks, also record the route decision in `docs/ai/ACEF_ACTIVE_RUN.json` as
`intakeDecision`: selected route, confidence, clarifying questions asked, facts inferred without asking, unresolved
questions, interview brief approval, and execution approval. If no question was needed, record the inference. If the
idea is thin, broad, CRM/notes/tracking/reporting/accounting/finance-related, or medium/low confidence, interview for
details before producing a spec or plan. If unresolved questions remain, do not mark execution approved.

## Procedure

1. Ask only what cannot be inferred:
   - existing codebase or new project?
   - feature, bug, test-case extraction, test automation, or unit/integration tests?
   - repo/product area?
   - requirement clear or unclear?
   - platform if relevant?
   - likely risk: multi-repo, new pattern/contract, auth/payment/data/migration?
2. If the work is a native contained task, return that decision and stop before ACEF artifacts or adapter work. Apply
   this check again to every item produced by a split.
   Otherwise check whether a project adapter exists and is fresh.
3. Choose one route:
   - Native/outside ACEF: reversible contained change with one technical boundary and one product surface
   - A: small feature
   - B: large feature
   - C: bug fix
   - D: test-case extraction
   - E: test automation setup
   - F: unit/integration test expansion
4. Return:
   - selected route
   - why
   - intended lane/track if inferable
   - minimum next inputs
   - next artifact
   - missing prerequisites
   - capability checks still required
5. Use READY / DRAFT / MISSING language for capabilities.

## Confidence And Escalation

Start with the smallest plausible route, then escalate when evidence requires it.

Before choosing execution depth, inventory defect/root-cause units. Two or more independent root causes, unrelated
audit findings, or shared-suite failures are `REPLAN/SPLIT`, not one Full story. Split first, then route each unit. A
single defect that crosses surfaces may remain ACEF Fix only when `root-cause-proven` and `bounded-patch` are both true.
Do not use Full BMAD as an umbrella for a repair batch.

Admit a native task to Route A/B/C when it is irreversible, crosses more than one product surface or technical boundary,
needs a new pattern, or touches persistence, auth/security/privacy, money, migration, provider integration,
realtime/concurrency/state-machine, tracking/reporting/analytics, or multi-session/worker coordination.

Escalate from Route A to Route B when:
- more than one module/repo is affected
- no qualified golden neighbor exists
- a new pattern/contract is introduced
- confidence is low after three questions

Auth, payment, entitlement, data, migration, provider, realtime, security, or public-surface risk selects Guarded
assurance on the chosen execution route. It escalates execution depth only when it also introduces a new contract,
architecture, product workflow, broad refactor, scope expansion, or unresolved planning ambiguity.

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
Capability checks still required:
Do not run yet:
```

## Guards

- Do not make the user pick a skill or SDLC phase.
- Do not run all SDLC phases; run only what the route needs.
- A reproduced defect with proven root cause, bounded patch, and no new contract may use ACEF Fix + Guarded even when
  it touches money, entitlement, auth, realtime, or a public surface. This is correct routing, not a non-BMAD exception.
- Never aggregate CI/config/runtime/test audit findings merely because they share a release theme. Mark the intake with
  the relevant aggregate-defect trigger and return `REPLAN/SPLIT` before writing active-run state.
- NFR assessment is required only when the change adds or changes a non-functional contract or an acceptance criterion
  names one. Risky subject matter alone is not an NFR trigger.
- During Fix/Standard work run focused verification. During Full stories run focused verification and run the broad
  integration suite once at closeout; reviewers reuse the bound result unless adjudicating a named evidence conflict.
- If adapter is missing or stale, say adapter extraction is the next step.
- If work is guarded/critical, require human approval before execution.
- Brownfield vs greenfield is determined from repo/project evidence, not by asking the user to choose methodology.
- If Route B is selected, say full BMAD v2 is the intended lane but still requires real BMAD conductor/skill preflight.
  Do not say "BMAD lane is active" until that preflight passes.
- Do not propose fallback from Route B to lightweight guarded. If BMAD is missing, the next state is `HALT` and the
  human must choose install/wire BMAD or explicitly accept a non-BMAD exception.
