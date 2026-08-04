# Execution Assurance v3.23 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v323` attempt stopped after 851.2 seconds. It must not be replayed.

The V3.22 discovery repair worked: Story 1 ATDD completed with its frozen discovery contract bound into the exact red
evidence command, and no partial actor/evidence state was produced. Development reached green. Code Review then found a
real MEDIUM mixed-operator edge case: filtered permission clauses retained sparse array keys and could raise a type
error instead of the required `InvalidArgumentException`. Patch Assurance passed. The original Developer session
implemented the repair and returned green focused tests.

The lifecycle stopped before retry review because repair receipt ownership was ambiguous. The Developer created a
valid typed receipt at `docs/ai/repairs/s1-resolver-fail-closed-developer-repair-cycle1.json`, while the supervisor's
retry capsule command required `docs/ai/repairs/s1_resolver_fail_closed-repair1.json`. The conductor correctly refused
to rename, rewrite, or synthesize the receipt.

The successor makes the identity deterministic. A `resume` action now carries the exact `repairCommand` and
`repairReceiptPath`; the original Developer executes that command once after accepted green evidence. A missing or
alternate receipt is REPLAN. The experiment's ATDD transcript recognizer was also updated to accept the new frozen
discovery options without weakening the exact-one runtime-test requirement.

## Measurements

| Measure | Result |
|---|---:|
| Active duration | 851.2 s |
| Story 1 initial review delivery | 392.5 s |
| Actor invocations | 5 |
| Total input tokens | 4,335,285 |
| Cached input tokens | 4,099,840 |
| Output tokens | 31,090 |
| Model cycles | 64 |
| Tool calls | 106 |
| Conductor input tokens | 2,149,575 |
| Conductor tool calls | 47 |
| Conductor resumes | 0 |

## Successor repair basis

1. The supervisor owns and emits the exact repair receipt command and path with every Developer resume action.
2. The same Developer executes that command only after green evidence and reports the exact resulting path/hash.
3. Green repair evidence without that exact receipt is mechanical REPLAN; the conductor never writes the receipt.
4. Transcript certification accepts discovery-bound red evidence while preserving exact actor, story, model, effort,
   runtime-test kind, and exact-one command requirements.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
