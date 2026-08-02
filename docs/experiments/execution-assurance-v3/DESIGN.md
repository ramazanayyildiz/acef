# Execution Assurance v3 P0 Candidate

This preregistered candidate measures a versioned `four-actor-v3` Full workflow with Guarded assurance. It does not
rewrite or reinterpret the completed v2 attempts. Existing `six-actor-v2` manifests, traces, and result rows remain
valid under their frozen contract.

## Frozen topology

Each of the four stories has four mandatory independent actors:

1. ATDD test author
2. development worker
3. code reviewer (correctness, security, conformance, scope)
4. report-only Patch Assurance reviewer (final-tree patch verification, test quality, and runner proof)

The frozen epic/story specifications already exist. Readiness is therefore a deterministic conductor gate before the
first lifecycle dispatch; only a source conflict or ambiguity may add a conditional Architect/Judge invocation. New
PRD/architecture authoring is outside this execution treatment and may not be hidden in its 17-actor budget.

Code Review and Patch Assurance start from the same implementation tree and are dispatched together. Findings return
to the original developer through exactly one bounded `followup_task` per global repair cycle. The append-only
transcript must show the prior affected-reviewer `REVISE`, that original Developer reactivation, its repaired
`FINAL_ANSWER`, and only then the affected retry reviewers. The immutable attempt artifact preserves the transcript
hash plus the reactivation timestamps, repaired-final hash, and a typed repair receipt bound to the before/after tree.
Each Developer follow-up counts as an actor invocation. An `_infra_retry1` is admitted only when the original physical
invocation has no `FINAL_ANSWER` and a typed terminal infrastructure-failure event proves its session, failure
interval, identical pre/post tree, and empty write set. The failed transcript is independently audited for writes and
the retry starts strictly after terminal failure. It remains the same logical role, adds one invocation to the budget,
and may not duplicate the lifecycle. Only affected reviewers re-check the delta. Two repair cycles are allowed per
story; a third finding cycle is `REPLAN_SPLIT`.

Story close is deterministic. One story-close package binds the four actor records, direct red and green evidence ids,
final tree, review report hashes, resolved findings, evidence manifests, raw artifacts, and runner proof. The gate,
four actor records, two reviewer reports, and their evidence must be introduced together by exactly one package commit.
Reviewer completion messages carry the report path, canonical report bytes, report hash, and reviewed input tree; the
durable gate must bind that exact captured blob and tree. A story Process Judge is created only for ambiguity, waiver,
evidence conflict, or a deterministic-gate anomaly and cannot override a mechanical failure. Its typed decision is
run-bound. The active run id and ordered `expectedStories` inventory must exactly match the frozen attempt/catalog,
and the epic gate must close all four on that run. One independent epic Process Judge remains mandatory after the single final integration suite, and exactly
one run-bound PASS epic gate may close the run. The base topology is therefore 17 actors; the hard cap, including
Developer follow-ups, infrastructure retries, and conditional work, is 21 invocations. Any `followup_task` that is not
the single repair follow-up bound to a reviewer `REVISE` cycle is an unexpected invocation and fails the attempt.

## Frozen budgets

- Story target: 2,100 active seconds; hard story stop: 3,000 seconds.
- Epic target active delivery: 9,000 seconds; hard maximum: 10,800 seconds.
- Input tokens: 36,000,000 maximum.
- Tool calls: 300 maximum.
- Harness wait: 1,200 seconds and 25% of active delivery, whichever binds first.
- Infrastructure retry: one per invocation and three total.
- Lifecycle broad integration suite: exactly once, at epic close. It must match the frozen integration argv, return a
  successful exit receipt after all durable story PASS gates, and finish before Epic Judge dispatch. Zero, a different
  regex-matching command, and more than one all fail. The separate harness oracle verification is recorded
  independently and is not counted as a second lifecycle invocation.

The experiment runner measures harness wait separately from delivery work and treats hard-budget failure as an oracle
failure. Token and tool-call budgets aggregate the conductor and every accepted child session without double-counting
cumulative usage records; broad-suite detection also includes child commands. Missing story dispatch/completion
timestamps and incomplete harness wait calls fail closed instead of being counted as zero. Infrastructure retries are
checked both per logical invocation and across the epic. The candidate manifest is bound to implementation commit
`23b58de`; this binding commit must exist before Stage 0, and `pilot-preflight.json` must be generated before launching
P0.

## Product judgment and final result

The timed attempt row is immutable and remains a provisional process measurement. The runner creates an immutable,
product-only judge packet containing the frozen task/acceptance contract, hash-only withheld-oracle binding,
verification artifacts, and a redacted diff limited to allowed product paths. The separate full diff remains process
evidence and is never exposed to the Judge. `--pilot-judge` launches the pinned client/model/reasoning configuration in
an isolated fresh session and returns a receipt binding its request, actor receipt, client binary, prompt, input
bundle, transcript, and no-parent/no-cross-run-memory provenance. Judgment
is ingested append-only with bindings to experiment, attempt, run ordinal, run id, diff hash, packet, product receipt,
and judge receipt. Product-done time comes only from the harness verification receipt within the attempt interval.
At ingestion the runner rehashes both the packet and the patch path named inside it. The bound session transcript must
contain the Judge's timestamped final answer with `JUDGE_PACKET_SHA256`, `JUDGE_INPUT_BUNDLE_SHA256`,
`PRODUCT_CONTRACT_SHA256`, `JUDGE_VERDICT`, `PRODUCT_OUTCOME_COMPLETE`, `SCOPE_VIOLATION`, `TEST_WEAKENING`, and
`FINDINGS_SHA256` markers that exactly match the
judgment record; session metadata alone is not evidence of a judgment.
Only `PENDING` may be superseded by a fresh packet/session; `PASS` and `FAIL` are terminal. Each packet produces a
separate immutable verdict artifact and never rewrites the attempt JSONL. Product eligibility, process eligibility,
budget eligibility, and overall promotion eligibility remain separate fields so a product-correct but over-budget run
is not mislabeled as a product failure.

Ingest a completed independent packet with:

```bash
node scripts/acef-execution-assurance-experiment \
  --manifest docs/experiments/execution-assurance-v3/manifest.json \
  --pilot-judge P0-candidate-v3
```
