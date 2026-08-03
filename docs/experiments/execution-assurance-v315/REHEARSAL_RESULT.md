# Execution Assurance v3.15 rehearsal result

Status: **immutable non-scored FAIL; capability remains `enforced`.**

V3.15 was frozen against candidate commit `79ddd83d626dfdf4ba43257e131d121baf073e65`. Clean preflight passed, all
six Stage 0 traps passed, and the complete 30-entrypoint repository suite had already passed in 227 seconds.

The first attempt row, `runs/rehearsal.jsonl`, was environmentally interrupted after the host entered clamshell sleep.
Its wall-clock cap includes host sleep and is not used as the candidate decision. The same preregistered attempt was
then repeated without changing the candidate, manifest, task, preflight, or Stage 0 inputs. The repeat ran under a
host sleep inhibitor and is recorded immutably in `runs/rehearsal-r2.jsonl`.

## Decisive repeat result

- Automated oracle: **FAIL**
- Process oracle: **FAIL**
- Product done: **false**
- Blind Judge: **not launched** (`pending`)
- Active delivery: **3,016.3 seconds** (50 minutes 16 seconds)
- Time cap: **not reached**
- Actor invocations: **13**, including two follow-ups and zero infrastructure retries
- Story delivery: S1 433.8s, S2 607.3s, S4 517.7s; S3 was dependency-quarantined
- Harness wait: 1,507.0s (49.96%); delegated execution 1,502.6s (49.82%); coordination idle 4.4s (0.15%)
- Team cost: 17,135,054 input tokens, 105,438 output tokens, and 286 tool calls
- Scope violations: **0**
- Frozen integration command: invoked exactly once with a typed exit receipt; **exit 1**

## What happened

Story 1 closed at deterministic cycle 0 with both independent reviewers PASS and all nine deterministic checks true.

Story 2 did not close. Both independent reviewers emitted canonical typed `REVISE/HIGH` findings because the new Unit
regressions were not discovered by the frozen PHPUnit command; the apparent green evidence had executed a different
Feature benchmark. The original Developer's one repair follow-up moved the tests into the discovered class, but the
fresh run then exposed a real closure-capture failure (`expected 1, got 0`). The Developer correctly returned
non-PASS. The current contract permits no second Developer follow-up inside that repair cycle and cannot dispatch
retry reviewers before a Developer PASS, so Story 2 was quarantined as REPLAN. Dependency-bound Story 3 was therefore
quarantined without actor dispatch.

Story 4 produced an authentic discovered red chain, but Development never reached an accepted green result. Its first
run passed 13 of 14 tests and failed the frozen generic-MySQL signature check in the job classifier. A same-identity
continuation repaired that file, but the fresh run again passed 13 of 14 and exposed the same frozen signature issue in
the dedup service. Story 4 was quarantined before review. The terminal Epic Process Judge then persisted the expected
run-bound FAIL gate and completed the active run fail closed.

V3.15 did prove three intended mechanics: reviewer findings used the typed plain CLI and were stored as canonical OPEN
findings; the lifecycle integration wrapper emitted and preserved an explicit inner exit code; and the terminal Judge
could close a partially quarantined epic without pretending product completion. None is sufficient for promotion.

## Framework findings

1. A repair that returns Developer non-PASS is a dead end even when one small bounded correction would make the repair
   reviewable. The repair budget is expressed around reviewer cycles, but the implementation also imposes an implicit
   one-follow-up-per-cycle limit that forces premature REPLAN.
2. Same-identity evidence/development continuations outside a post-review repair receipt are not represented in the
   collaboration contract. The harness therefore reports them as unbound follow-ups and child/parent result mismatch.
3. Bootstrap still omits close-hook surface declarations and the Lean Evidence Contract section. The conductor had to
   add control-only metadata before Story 1 close.
4. The pre-commit hook still rejects an exact immutable intermediate REVISE package because it requires the latest gate
   to be PASS. The conductor had to preserve the valid Story 2 REVISE layer with a hook bypass.
5. The frozen webhook compatibility assertion is source-shape-sensitive: behaviorally equivalent local-variable
   refactors fail its literal-expression check. That contract must either be intentionally documented as shape
   conformance or replaced with a behavioral compatibility assertion.

## Decision

V3.15 is not promotable and does not change capability maturity. Do not run another recovery rehearsal unchanged. A
successor must first remove the repair dead end, type same-identity pre-review continuations or prohibit them cleanly,
initialize close-hook metadata at bootstrap, admit exact intermediate REVISE packages, and resolve the source-shape
test contract. The next experiment should remain bounded to one clean sleep-inhibited attempt; another open-ended
version/rehearsal loop is not authorized by this result.
