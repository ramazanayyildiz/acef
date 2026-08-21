# ATDD-MIN-1 Frozen Diagnostic Judging Rubric

Status: frozen before any executor artifact was produced or inspected.

## What the judge does and does not decide

The judge produces **blinded final-diff rework findings** only — the third primary outcome in the
protocol. It does not decide any mechanical outcome. Exit codes, accepted-green status, timings,
hidden-oracle escapes, and assertion-weakening detection are all computed mechanically by the harness
and are never shown to the judge.

The judge sees, per artifact: the capsule's story and acceptance criteria, the final production diff,
and the final acceptance test. It does not see the arm, the actor identity, the session transcript,
commit messages, run identifiers, timing, or whether any hidden oracle passed.

## Definition of a rework finding

A rework finding is a defect a competent reviewer would send back before merge. Speculative style
preferences, naming taste, and "could be more elegant" are not findings.

Report a finding only when it is grounded in a specific line or hunk of the supplied artifact.

## Dimensions

| Dimension | Meaning |
|---|---|
| `ac-gap` | A stated acceptance criterion is not actually satisfied by the diff. |
| `authorization` | A capability, scope, ownership, tenancy, or signature check is missing, wrong, or enforced only in a presentation layer. |
| `invariant` | An existing documented invariant, state machine, or guarded path is widened, bypassed, or silently changed. |
| `test-binding` | The acceptance test asserts implementation detail, literal copy, CSS classes, or internal names instead of behaviour, so it would not catch a real regression. |
| `test-gap` | The acceptance test omits a refusal path or boundary the acceptance criteria explicitly call for. |
| `reuse` | An existing seam, service, or component is duplicated or re-implemented rather than reused, where reuse was clearly available in the surrounding code. |
| `scope` | The diff changes things the capsule did not ask for, or leaves dead/unused code behind. |

## Severity

- `major` — would cause incorrect behaviour, a security or data-integrity problem, or would let a real
  regression through undetected.
- `minor` — real but contained: a missing edge case, a narrow duplication, or a small unnecessary change.

## Output contract

Return one JSON object:

```json
{
  "artifacts": [
    {
      "artifact_id": "ART-xxxx",
      "findings": [
        {
          "dimension": "authorization",
          "severity": "major",
          "claim": "one sentence stating the defect",
          "evidence": "the file and the specific construct the finding rests on"
        }
      ]
    }
  ]
}
```

Every artifact in the bundle must appear exactly once, with an empty `findings` array if it has none.
Judge each artifact on its own merits. Do not compare artifacts to each other, do not attempt to infer
which process produced them, and do not let the number of findings you gave a previous artifact
influence the next.
