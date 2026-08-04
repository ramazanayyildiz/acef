# Execution Assurance v3.25 Rehearsal Result

## Verdict

`REHEARSAL-v325` is an immutable **FAIL** and is not promotable. It stopped fail-closed during Story 2 Development;
the run identity will not be replayed and no blind external Judge was launched.

## Timing and cost

- Active delivery: **1,398.4 seconds (23m 18.4s)**.
- Story timing: s1 801.2s including one real repair cycle; s2 stopped at 342.0s. Both stayed below the 900s target.
- Aggregate input: 7,603,459 tokens; 7,246,592 cached. Aggregate output: 46,789 tokens.
- Model cycles: 79. Tool calls: 164/320.
- Conductor: 5,332,243 input tokens and 95 tool calls; it remained the dominant context/tool consumer.
- Harness wait: 608.6s, of which 605.9s was delegated execution and only 2.7s was coordination idle.
- Invocations: nine total, consisting of eight base actor records plus one same-session Developer repair follow-up.

## What passed

- Typed Current Context stayed synchronized across s1 ATDD, Development, Review, and the transition to s2.
- Story 1 ATDD and Development reached discovered green evidence.
- Independent Code Review found a genuine HIGH: malformed trailing/repeated operators could drop an empty operand and
  authorize instead of failing closed.
- The original Story 1 Developer repaired that HIGH in the same session and executed the exact supervisor-owned
  `docs/ai/repairs/s1_resolver_fail_closed-repair1.json` receipt command.
- Both fresh retry reviewers passed the repaired tree and the deterministic repair-cycle gate closed PASS.
- The corrected two-layer durability validator did not report the V3.24 false split-package failure.
- Time, token, cycle, tool, and observed-story budget measurements remained within their calibrated limits at stop.

## Why Story 2 stopped

The ATDD test used an outer PHP arrow function containing an inner closure that captured `$terminalExecutions` by
reference. PHP arrow functions capture outer variables by value, so the inner reference pointed at the arrow's copy;
the test's final assertion could never observe the increment. Missing product behavior also made the initial run red,
so focused execution and discovery alone could not distinguish this harness defect before immutable red binding.

The Developer correctly refused counterfeit green evidence. Because the red artifact was already bound and immutable,
the supervisor returned REPLAN rather than rewriting tests after Development began. Stories 3–4, the one broad suite,
and Epic Process Judge therefore did not run.

## Successor repair

- Add a deterministic `acef-state atdd-precheck` command owned by the supervisor and run it after test editing but
  before the clean red commit.
- Reject nested arrow/by-reference mutable-observation traps both in precheck and again failure-atomically inside
  `evidence-run` before actor/evidence creation.
- Keep the existing focused run and frozen discovery checks; this is an additional harness-integrity guard, not a
  replacement for behavioral red evidence.

The new guard is covered by state, supervisor, experiment, and installer regressions. Capability maturity remains
`enforced`, not `proven` or installed in target repositories.
