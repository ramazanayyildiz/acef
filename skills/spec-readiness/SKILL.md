---
name: spec-readiness
version: 1.0.0
description: "Use when a feature request, product brief, or user story may be too vague before ACEF planning or dispatch. Produces a file-backed readiness verdict with blocking questions, risk flags, routing, and a PASS/NEEDS_* status."
---

# Spec Readiness

Use this skill before ACEF route dispatch, planning, story creation, or implementation when the request is broad, vague,
product-shaped, persistence/data-shaped, or touches money, PII, RBAC, schema, migrations, CRM, notes, tracking,
reporting, dashboards, finance, payouts, billing, or accounting.

## Rule

Classify the request before writing the spec.

The output is not chat state. Write the verdict to `docs/ai/ACEF_SPEC_READINESS.json`; append notable reruns to
`docs/ai/ACEF_SPEC_READINESS_LOG.jsonl` when the project keeps a readiness history. Dispatch may proceed only when the
current verdict is `PASS`, or when a human explicitly accepts risk for a reversible low-risk exception.

Clarifying questions are not approval. A PASS must show that missing product facts were answered and that the user has
approved the resulting brief/spec boundary when the work is guarded or full-BMAD.

## Statuses

- `PASS`: ready for route dispatch, planning, or implementation.
- `NEEDS_PM`: product intent, persona, scope, or value is unclear; route back to PM/product interview.
- `NEEDS_DISCOVERY`: technical feasibility, existing behavior, or data ownership is unknown; run discovery before spec.
- `NEEDS_BMAD`: large coherent feature needs full requirements/design/story breakdown.
- `NEEDS_GUARDED_DISCOVERY`: vague or incomplete request touches irreversible/high-cost surfaces such as schema, RBAC,
  money, payouts, finance, PII, CRM persistence, migrations, or auth.
- `REJECT`: unsafe, contradictory, or out of scope.

## Procedure

1. Read the user's request and any existing brief/story. Do not start implementation.
2. Apply proportional bypass:
   - reversible copy/UI text/no-op docs changes may PASS with `fastTrack: true` if acceptance is obvious;
   - schema, RBAC, money, PII, persistence, migrations, CRM notes, finance, payouts, billing, or accounting never bypass.
3. Score four dimensions from 0 to 1:
   - goal: user/problem/value is explicit;
   - boundary: in-scope, out-of-scope, and affected surfaces are bounded;
   - constraint: data, security, policy, technical, and migration constraints are known;
   - acceptance: Given-When-Then or measurable fit criteria exist.
4. Compute ambiguity as `1 - weighted_score`; default equal weights unless a repo defines stricter weights.
5. Run Tier 1 detectors:
   - problem/persona/success metric/non-goals present;
   - at least one Given-When-Then scenario;
   - named aggregate/data entity owns any new persisted state;
   - acceptance criteria prevent fake completion;
   - smell words such as add, notes, tracking, dashboard, finance, accounting, improve, manage are resolved.
6. Run Tier 2 risk review for persistence, PII, RBAC, schema, migration, money, payout, billing, CRM, audit, integration,
   auth, security, and irreversible changes.
7. Emit only the missing facts and blocking questions needed for the next route. Batch questions; do not interrogate the
   user one tiny question at a time.
8. Write the verdict file and stop. The next allowed skill is PM/discovery/specification, not implementation, unless the
   verdict is `PASS`.

## Verdict Shape

```json
{
  "status": "NEEDS_GUARDED_DISCOVERY",
  "ambiguity": 0.34,
  "dimensions": {
    "goal": 0.6,
    "boundary": 0.4,
    "constraint": 0.7,
    "acceptance": 0.3
  },
  "tier1": {
    "problem": "pass",
    "persona": "fail",
    "success_metric": "fail",
    "non_goals": "fail",
    "given_when_then": "fail",
    "data_entity": "fail",
    "acceptance_criteria": "fail",
    "smell_words": ["add", "notes"]
  },
  "riskFlags": ["persistence", "pii"],
  "missing": ["persona", "success_metric", "data_model", "acceptance_criteria"],
  "blockingQuestions": [
    "Whose notes are these, and who can read or edit them?",
    "What entity owns the note: lead, student, session, invoice, or teacher?"
  ],
  "assumptions": [],
  "nextArtifact": "product-brief",
  "repositoryCommit": "abc1234",
  "verdictReason": "Vague feature label touching persistence and PII; route to guarded discovery."
}
```

## Worked Routing

- "Add CRM notes" -> `NEEDS_GUARDED_DISCOVERY`: notes imply persisted state and possible PII. Ask actor, entity owner,
  permissions, retention/audit, surfaces, and acceptance scenarios before spec writing.
- "Add finance tracking, not full GL" -> `NEEDS_GUARDED_DISCOVERY`: finance implies money, balances, payouts, and data
  entry. Ask tracked entities, sales/payment flows, teacher accrual rules, period filters, permissions, and non-goals.

## Guards

- Do not make informed defaults for missing product facts on guarded surfaces.
- Do not call a list of assumptions a PASS when data ownership, security, or acceptance is blank.
- Do not produce PRD, UX, architecture, tasks, tests, or code when the verdict is not `PASS`.
- Do not let score-only output pass; every non-PASS needs concrete missing fields and blocking questions.
