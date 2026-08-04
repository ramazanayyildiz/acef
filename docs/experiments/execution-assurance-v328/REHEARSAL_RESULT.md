# Execution Assurance v3.28 rehearsal result

## Verdict

The frozen attempt is immutably **PRODUCT PASS / PROCESS FAIL**.

- All four stories closed with cycle-0 deterministic `PASS` gates.
- The one lifecycle integration command passed, and the independent harness oracle passed 48 tests / 122 assertions.
- The terminal typed Epic gate is `PASS` with every frozen story present and `PASS`.
- The fresh artifact-only `gpt-5.6-sol/high` Blind Judge returned `PASS`, with no findings, scope violation, or test
  weakening.
- The consumed pilot row remains `FAIL` because the outer transcript scorer required `ACTOR_RESULT=PASS` in the Epic
  Judge's prose even though the Judge had already persisted the authoritative typed `PASS` gate. The Judge wrote
  “Terminal verdict: PASS”; this produced the only two process failures.
- The corrected scorer reanalyzes the exact frozen transcript as 17/17 valid actors with zero collaboration failures,
  but does not rewrite the immutable row. Formal promotion therefore remains blocked.

## Timing and budget

| Measure | Result | Frozen bound |
|---|---:|---:|
| Active delivery | 2,795.4s (46m35.4s) | target 45m; hard 60m |
| Wall time to product done | 2,807.6s (46m47.6s) | informational |
| Story 1 | 435.5s (7m15.5s) | target 10m; hard 15m |
| Story 2 | 379.7s (6m19.7s) | target 10m; hard 15m |
| Story 3 | 640.9s (10m40.9s) | target 10m; hard 15m |
| Story 4 | 855.7s (14m15.7s) | target 10m; hard 15m |
| Actor invocations | 17 | 25 |
| Repair cycles | 0 | 2 per story |
| Input tokens | 14,242,544 (13,618,176 cached) | 18,000,000 |
| Output tokens | 84,670 | informational |
| Model cycles | 174 | 220 |
| Tool calls | 273 | 320 |
| Coordination-idle wait | 10.0s / 0.36% | 300s / 5% |
| Broad lifecycle suites | 1 | exactly 1 |

The hard budget passed. The 45-minute target was missed by 95.4 seconds; Story 3 missed its soft target by 40.9
seconds and Story 4 by 255.7 seconds, while all per-story hard caps passed. Total recorded wait was 1,801.6 seconds,
but 1,791.6 seconds was productive delegated actor execution; only 10 seconds was coordination idle.

## Role routing and topology

- Conductor: `gpt-5.6-sol/medium`.
- Four Code Review actors: `gpt-5.6-sol/medium`.
- ATDD, Development, Patch Assurance, and terminal Epic Judge: `gpt-5.6-sol/high`.
- Mechanical supervisor/state/capsule/gate actions: model-free.
- Every initial Code Review / Patch Assurance pair was concurrent and bound one shared review tree.
- No conditional Story Judge, infrastructure retry, Developer repair follow-up, or ATDD correction actor was needed.

V3.28 therefore validates the role matrix on a complete product run. It does not live-trigger the new post-red ATDD
correction route: Story 3's Developer fixed only the five authorized production route files and did not mutate the
bound test. The correction transition is covered by deterministic and adversarial repository tests, including frozen
explicit paths, replacement-red command replay, same-session Developer resumption, and forged evidence-ID failure
atomicity, but still lacks a live-trigger receipt.

## Product evidence

- Story 1: resolver empty-operand fail-closed behavior — deterministic gate `PASS`.
- Story 2: middleware request idempotency — deterministic gate `PASS`.
- Story 3: legacy route-permission alias cleanup — deterministic gate `PASS`; `atddTestOnlyRed=true`.
- Story 4: webhook ingress retry/dedup correctness — deterministic gate `PASS`.
- Lifecycle integration: one exact command, exit 0.
- Independent oracle: 3 benchmark authz tests / 8 assertions; 6 webhook tests / 16 assertions; 39 platform authz
  tests / 98 assertions. Total: 48 tests / 122 assertions.
- Changed application/test paths stayed inside the frozen catalog; `scopeViolations=[]` and
  `expectationFailures=[]`.

## Immutable process anomaly and repair

The Epic Process Judge persisted `docs/ai/gates/rehearsal_v328-epic-close.json` with `gateType=actor-decided-v1`,
`decisionMode=actor`, `verdict=PASS`, `decidedBy=acef_epic_process_judge`, and all four story verdicts `PASS`. Its final
prose omitted the redundant `ACTOR_RESULT` line. Reviewer verdicts were already machine-carried by typed reports; the
Epic result was inconsistently parsed from prose.

The scorer now derives the terminal Epic Judge result from exactly one validated actor-decided gate belonging to that
Judge and treats that gate as the single result channel during child/parent reconciliation. A focused experiment test
passes, the full exact frozen transcript reanalysis passes with 17 child sessions and no failures, and the original
pilot row remains unchanged. See `POST_RUN_REANALYSIS.json`.

## Blind judgment and maturity

Judgment `J-1-2829743fc664` is bound to judge packet
`1b73698f93b452433137bca47fe0edf7cd54574d1246863b8bdff7184757210d` and diff
`7d4ba6724b6bd6d6f0eeb534e67e99309b2d7ee650dc001aa14974bcf0711b18`. It is treatment-blinded, transcript-withheld,
and returns product `PASS` with zero findings. The immutable derived verdict is nevertheless
`PRODUCT_PASS_PROCESS_FAIL`, with `productEligible=true`, `budgetEligible=true`, `processEligible=false`, and
`promotionEligible=false`.

Accordingly, `capsule-supervisor-v1` and provider-neutral role routing remain **enforced**, not proven or generally
installed. The evidence supports a controlled canary only after explicit review; formal promotion requires a fresh,
separately frozen successor whose pre-registered scorer already contains the typed Epic-gate repair.
