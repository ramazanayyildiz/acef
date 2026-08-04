# Execution Assurance v3.26 Rehearsal Result

## Verdict

`REHEARSAL-v326` is an immutable **FAIL** and is not promotable. All four story packages, the one broad integration
run, and the independent Epic Process Judge passed. The outer result failed because legacy story-level closeout
checks were reapplied to the new four-actor-v3 epic close commit, plus two measurement-contract label/read defects.
No blind external Judge was launched.

## Timing and cost

- Active delivery: **2,254.9 seconds (37m 34.9s)**.
- Story timing: s1 399.9s, s2 433.5s, s3 481.0s, and s4 414.3s. Every story closed on its first review cycle.
- Aggregate input: 14,850,335 tokens; 14,197,760 cached. Aggregate output: 80,645 tokens.
- Model cycles: 164. Tool calls: 291/320.
- Conductor: 10,049,141 input tokens and 144 tool calls; it remained the dominant context/tool consumer.
- Harness wait: 1,132.8s, of which 1,124.1s was delegated execution and only 8.7s was coordination idle.
- Invocations: the frozen 17 semantic actors, with no Developer repair follow-up and no infrastructure retry.

## Model and session conclusion

- The 17 semantic actors are the four-actor safety topology for four stories plus one Epic Judge, not 17 accidental
  restarts. ATDD is fresh per story; each Developer is one resumable story session; Code Review and Patch Assurance are
  fresh on the final reviewed tree; the Epic Judge is one fresh isolated session.
- Sessions are single-instanced where independence is not a control: one conductor spans the Epic, a repairing
  Developer resumes its original story session, typed state/capsule/gate work is model-free, and Epic closeout replays
  committed story packages instead of reopening story agents or rereading their full context.
- All promoted semantic roles remain `gpt-5.6-sol/high` because the measured candidate does not yet prove a cheaper
  routing floor. `gpt-5.6-terra/medium` remains a thin-proxy shadow only. The next speed target is the conductor, which
  consumed 10.0M input tokens and 144 tools; lowering its model/effort requires a separate shadow comparison rather
  than silently weakening reviewer roles.

## What passed

- All four stories produced authentic red evidence, focused discovered green evidence, independent Code Review PASS,
  independent Patch Assurance PASS, and one deterministic terminal story-close package.
- The one broad lifecycle integration command passed 48 tests with 122 assertions.
- Current Context reached `Epic closeout / epic-process-judge`, and the independent Epic Process Judge wrote an
  actor-decided PASS gate aggregating the four story green-evidence IDs.
- Model, effort, story time, actor count, token, cycle, tool, and measured wait budgets all passed.
- The deterministic ATDD precheck prevented recurrence of the V3.25 unobservable PHP harness trap.

## Why the outer run still failed

The terminal epic artifact commit entered the generic guarded/full pre-commit bundle. That bundle incorrectly treated
the aggregate Epic Judge gate as another story gate: it required the final story worker scope to equal `Epic closeout`,
required every earlier story green record to remain fresh against the entire final epic tree, required the epic gate to
repeat final-story surface evidence, and required a duplicate hand-maintained Lean Evidence section. The story packages
had already enforced those controls on their frozen paths, so the hook failed after a correct Epic Judge PASS.

Two experiment-only checks also failed. Durable validation compared the abstract contract scope `epic` literally with
the typed label `Epic closeout`. Patch Assurance first attempted one mistyped capsule ID, then displayed the correct
report-bound capsule and passed; the measurement validator rejected the harmless failed read because it required all
attempted capsule IDs to be identical.

## Successor repair

- At four-actor-v3 epic close, accept the still-bound final-story worker scope only when it belongs to the frozen run
  inventory; require the entire application tree to be clean during that exception.
- Revalidate each deterministic story-close package on its own frozen paths, then reuse those packages for aggregate
  freshness, surface, and Lean evidence instead of repeating story controls at epic scope.
- Resolve the abstract experiment scope `epic` through the installed active run's typed epic label and require the Epic
  gate evidence set to equal the terminal story green-evidence set.
- Require that the correct report-bound capsule was displayed at least once; retain wrong/mistyped attempts as measured
  tool waste only when the transcript proves the attempted read failed; reject any successful foreign capsule read.
- Freeze normalized surface, round-trip, input/output, and durable-state requirements in new story packages. Rebuild
  them from each gate commit's historical worker scope during Epic replay; this also provides fail-closed compatibility
  replay for the existing v3.0 packages without reopening their agent sessions. Preserve the union of explicitly
  declared and path-inferred surfaces when transitioning to review.
- After a terminal Epic Judge gate, execute the supervisor-owned `epic-complete` command and its exact control-only
  commit command. PASS retains full promotion checks; FAIL/REPLAN/BLOCKED use a record-only terminal bundle. Keep the
  typed disposition observable through Current Context/status/next, prohibit worker writes, and forbid reopening a
  completed run under the same run ID. Bind completion to the exact actor-decided Epic gate, canonical named-Epic
  scope, Judge identity, and synchronized Current Context; terminal verdict, scope, or context tampering fails both
  startup authorization and precommit validation.

The immutable V3.26 clone now passes `run-authorization`, `gate-verdict`, `lean-evidence`, and the complete guarded
`precommit-gate` under the successor validator. Durable replay also validates all 17 actor records and five gates with
zero failures. A disposable clone then reached typed `complete / closeout`, passed the staged guarded precommit bundle,
and passed the candidate treatment-state evaluator. After the final terminal-integrity hardening, the repository suite
passed **32/32 in 337 seconds**; the slowest packages were the execution-assurance experiment (121s), typed-state
validator (62s), capsule supervisor (48s), process validator (33s), and state lifecycle (24s). Focused adversarial regressions reject terminal
verdict/gate mismatch, Current Context mismatch, completed-Epic-to-story scope tampering, missing or mismatched Epic
Judge actors, and schema-derived field leakage. Capability maturity remains `enforced`, not `proven` or installed in target repositories; promotion still
requires a separately frozen successor rehearsal.
