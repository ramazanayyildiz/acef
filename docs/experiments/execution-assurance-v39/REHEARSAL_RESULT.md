# Execution Assurance v3.9 rehearsal result

Status: **FAIL — immutable non-scored rehearsal; capability remains `enforced`.**

`REHEARSAL-v39` exercised framework commit `28fa3e4f2816df262987e91527e191be39b0f509` against the unchanged four-story
contract. Clean preflight passed task/canary/environment and four reference validations; Stage 0 passed 6/6. The run
was non-scored and non-promotable, so no blind Judge was launched.

## Measured result

- Active delivery: 908.7 seconds (15 minutes 8.7 seconds).
- S1 delivery window: 694.6 seconds.
- Actor invocations: 4; repair cycles: 0; infrastructure retries: 0.
- Input tokens: 3,737,777; tool calls: 111.
- Harness wait: 435.0s (47.87%), including 433.7s delegated execution and only 1.3s coordination idle.
- Scope violations: 0.
- Broad suite: 0/1 because deterministic S1 close did not run.

## What v3.9 proved

The real Developer actor stored canonical
`/root/acef_s1_resolver_fail_closed_development`, and the new validator accepted it while independently retaining the
hidden receiver UUID in transcript provenance. The unobservable UUID defect from v3.8 is closed.

S1 produced genuine test-only red evidence, a production implementation commit, green evidence, and two independent
review reports with PASS/no findings. Reviewer work completed in the expected parallel window and the run failed before
starting later stories, avoiding a long doomed execution.

## Rehearsal failure

The live run exposed an older reviewer-handoff contradiction:

- `review-completion` requires a typed reviewer actor record before it runs;
- the final durable actor record must bind the reviewer-created report path and SHA-256;
- actor records are immutable, so a conductor-created pre-review record with null artifact fields cannot be enriched
  after the report exists; and
- the compiled instructions incorrectly told the conductor to create the artifact-bound actor after the child returned,
  which is too late for the child's final `review-completion` command.

Patch Assurance used the pre-created review-transition commit/tree and its completion command passed, but its actor
record still had null artifact binding. Code Review instead bound its report to the earlier implementation commit/tree,
so its completion command correctly rejected the actor/report identity mismatch. The two reports therefore did not
share one exact input tree, and deterministic story close was not attempted.

The command audit also recorded avoidable reviewer probes/mutations: Code Review ran `mkdir -p` and `php -r`; Patch
Assurance ran `pwd`. These are not product failures, but they violate the frozen report-only command contract.

## Decision

V3.9 is not promoted. A successor must:

1. commit all conductor review-transition state before either reviewer spawn;
2. freeze one shared review input commit/tree for both reviewers;
3. have each reviewer write only its own report and its own artifact-bound actor record before the final one-shot
   `review-completion` command;
4. allow exactly those two reviewer-owned control paths in transcript write auditing;
5. have the conductor create the reports directory before spawn, without adding a package file;
6. prohibit separate schema/help/directory probes and allow harmless `pwd` only if it is needed as a read; and
7. pass focused regressions and the complete repository suite before another rehearsal.

Capability maturity remains `enforced`.
