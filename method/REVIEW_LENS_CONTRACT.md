# ACEF Review-Lens Contract

A review lens is a short, just-in-time specialist prompt supplied to an existing review actor. It is not an actor,
workflow, gate, or source of approval. The Code Reviewer remains responsible for the review verdict and ACEF remains
responsible for actor separation, scope, evidence, and disposition.

## Activation metadata

Every review lens declares this profile in `SKILL.md` frontmatter:

```yaml
kind: review-lens
contract: acef-review-lens-v1
mode: report-only
scope: bounded
permissions: advise-only
finding-contract: file-line-severity-impact-confidence-evidence
disposition: separate-implementation-or-verify-patch
```

`scripts/validate-acef-skills` validates this profile mechanically. `name`, a narrow activation `description`, and an
informational semantic `version` remain required for every skill.

## Authority boundary

`advise-only` means the lens:

- advises the actor that received it; it never becomes a distinct actor or satisfies independent review;
- is report-only by default and cannot patch code or mutate delivery state;
- cannot approve a gate, set a verdict, or mark work complete;
- cannot expand the active diff/path/budget scope;
- cannot spawn workers, delegate, retry, or create follow-up tasks;
- cannot silently absorb another specialist domain such as security review.

An actionable finding is dispositioned by the Code Reviewer. Any required edit moves to a separately identified,
scoped implementation or `verify-patch` actor. The author of the reviewed change cannot use a lens to self-approve.

## Bounded input

A lens receives at least one explicit boundary: a targeted diff, a finite path set, or a numeric scan budget. It also
receives only the issue/acceptance-criteria text, focused tests, and adapter/pattern slice needed for that boundary.
Broad reads require a recorded reason in the PR-review context. No lens may default to an unlimited repository scan.

## Finding contract

Every actionable finding contains:

| Field | Requirement |
|---|---|
| `file:line` | Verified location that the reviewer actually read. |
| severity | `blocker`, `high`, `medium`, or `low`. |
| impact | Concrete user, runtime, data, test, or conformance consequence. |
| confidence | `high`, `medium`, or `low`, with uncertainty stated. |
| evidence | Short code/runtime/contract evidence supporting the claim. |

The detailed report is file-backed. Chat receives only a short summary, the report path and hash when available, the
review verdict, and the next allowed action. Empty or speculative findings are not padded to meet a quota.
