# Execution Assurance v3.7 rehearsal result

Status: **FAIL — immutable non-scored rehearsal; capability remains `enforced`.**

`REHEARSAL-v37` exercised framework commit `e59bfaab8c02381c94ff4faa8f353298d30cd006` against the unchanged four-story
product contract. Clean preflight passed the task binding, collaboration canary, environment probe, and four
baseline-red/reference-green validations. Stage 0 passed 6/6. The manifest was explicitly non-scored and
non-promotable, so no blind Judge was launched.

## Measured result

- Active delivery: 4,209.6 seconds (70 minutes 9.6 seconds).
- Story delivery: S1 1,019.8s, S2 578.2s, S3 508.4s, and S4 1,333.3s.
- Actor invocations: 24; base actors: 17; infrastructure retries: 0; maximum repair cycles: 1.
- Input tokens: 28,611,776; output tokens: 170,582; tool calls: 513.
- Harness wait: 2,317.4s (55.05%), of which 2,307.0s was delegated actor execution and 10.4s was coordination idle.
- Initial Code Review and Patch Assurance dispatches were concurrent for all four stories.
- Scope violations: 0; frozen verification exit code: 0.
- Broad lifecycle suite: 0/1 because S4 did not close; product/process/automated verdicts: FAIL.

## What v3.7 proved

The trusted reviewer parser canonicalized case-only vocabulary and the explicit informational aliases in a real run.
Lowercase verdict/severity/status values and `INFO`/`CLOSED` no longer stopped one-shot completion. Unknown values and
real open risks remained fail-closed.

All four stories reached implementation and initial review. S1's real HIGH malformed-permission finding reached one
bounded Developer repair, both affected reviewers reran, and deterministic close passed. S2 and S3 closed without a
repair. S4's Code Review found a real HIGH SQLite duplicate-classification defect while Patch Assurance passed; the
Developer repaired the defect and the Code Review retry passed. The final frozen verification command itself was green.

## Rehearsal failure

S4 exposed a contradiction in the affected-only retry contract. The compiled prompt said never to rerun a reviewer
whose prior verdict was PASS, but deterministic close correctly requires Patch Assurance to bind the final
application/test tree. The production repair changed that tree. Retrying only Code Review left Patch Assurance stale,
so cycle 1 remained `REVISE` with `patch-assurance actor did not inspect the final application tree`. The run entered
replan closeout rather than weakening the gate.

The immutable oracle also exposed measurement/contract defects that must not be confused with product failures:

- repair receipt lines with Markdown trailing spaces were not recognized, which cascaded into missing reactivation
  bindings and an apparently unbound Developer follow-up;
- reviewer read/test commands containing quoted `|` characters were classified as shell pipelines even though the
  metacharacters were inside arguments;
- the conditional Judge's typed decision carried its trigger, but the collaboration oracle redundantly required the
  same trigger in final prose;
- the formal close-package oracle required every final artifact to be introduced by one commit, which is incompatible
  with an immutable earlier `REVISE` package followed by a repair delta package.

## Decision

V3.7 is not promoted. A separately versioned successor must:

1. rerun Patch Assurance after every application/test-tree-changing repair, while rerunning Code Review only after a
   production change or an unresolved Code Review finding;
2. accept harmless trailing whitespace in machine-carried repair bindings;
3. distinguish quoted shell metacharacters from actual separators and make `review-completion` the sole report-shape
   validation command;
4. derive conditional Judge triggers from the typed decision artifact instead of duplicate prose;
5. validate immutable close packages as an initial layer plus bounded repair-delta layers; and
6. pass focused regressions and the complete repository suite before another non-scored rehearsal.

Capability maturity remains `enforced`, not `proven` or `installed`.
