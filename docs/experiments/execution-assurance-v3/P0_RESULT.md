# P0 v3 candidate result — faster, but not promotable

Date: 2026-08-02
Attempt run: `P0-candidate-v3` (ordinal 1)
Treatment: Full + Guarded, `four-actor-v3`
Framework commit: `23b58de`
Result: `FAIL`

The preregistered candidate completed its conductor process and produced immutable actor, verification, attempt,
blind-judgment, and derived-verdict records. It is a scored failure, not a discarded run. The conductor stopped at
`REPLAN/SPLIT` when Story 4's Test Author could not produce uncontaminated red evidence under the frozen SQLite
harness. The independent blind product Judge also returned `FAIL` with one unresolved HIGH finding: the two webhook
ingress defects were not implemented.

## Measured result

- Active delivery time: 5,270.2 seconds (87.8 minutes).
- Story delivery time: 1,269.1s, 809.9s, 847.4s, and 408.0s respectively.
- Aggregate tokens: 39,915,092 input, 38,812,416 cached input, and 212,189 output.
- Aggregate tool calls: 461.
- Actor invocations: 17, with no infrastructure retry and no Developer repair cycle.
- Harness wait: 1,981.3 seconds, or 37.59% of active delivery time.
- Actor process exit: 0; independent integration verification exit: 2.
- Product outcome: incomplete; automated oracle `FAIL`; blind Judge `FAIL`; promotion eligibility `false`.

Against the completed `six-actor-v2` P0-r2 candidate, active time fell 52.8%, input tokens fell 29.5%, and physical
actor invocations fell 34.6%. Tool calls increased 5.5%. This is useful speed evidence, but it is not a successful
delivery comparison because neither candidate reached product-done.

## Why the candidate failed

1. Story 4's required SQLite runner observed both intended product failures, but also encountered an unrelated
   MySQL-only `DATE_ADD(... INTERVAL 1 MONTH)` migration/bootstrap error across the feature suite. The Test Author
   correctly returned `REVISE`; the frozen actor budget did not permit the multi-actor ATDD adjudication/correction
   path, so the conductor stopped instead of accepting contaminated evidence.
2. The conductor used unbound reviewer follow-ups to repair malformed completion/report payloads. The independent
   oracle rejected these calls even though the final local story gates passed.
3. Final-sweep durability checks treated later, unrelated story application changes as stale earlier-story review
   trees. A sequential multi-story epic therefore needs a scoped application/test digest; a repository-wide digest
   makes earlier story close packages impossible to preserve without replaying assurance.
4. The frozen cost budgets were missed: input tokens were 39,915,092/36,000,000, tool calls 461/300, harness wait
   1,981.3s/1,200s, and harness-wait share 37.59%/25%.
5. The exact lifecycle broad suite never ran because the conductor stopped before epic close. The harness oracle ran
   separately and failed; it is not counted as a lifecycle broad-suite invocation.

## Harness recovery, without rerunning the candidate

The first finalization attempt hit Node's default one-megabyte synchronous output buffer while capturing the full diff
(`git ENOBUFS`). The durable actor and verification receipts were preserved. Finalization was recovered against the
same checkpoint by increasing only the process output buffer; no actor, product commit, or verification was rerun.

The first blind-judgment ingestion then exposed a binary-hash bug: the shared SHA helper coerced the pinned client
binary to UTF-8 text before hashing, while the receipt correctly contained the raw-byte hash. The helper now preserves
Buffer bytes, the original fresh Judge session/receipt was revalidated, and its existing `FAIL` judgment was ingested.
Regression tests cover both a patch larger than Node's default one-megabyte buffer and raw binary provenance hashing.

## Decision

Keep capability maturity at `enforced`. Do not mark it `proven`, do not install it into target repositories as the new
default, and do not reinterpret the speed reduction as success. A separately preregistered v3.1 candidate must first:

- execute the real per-story test environment during preflight;
- bind story close to a scoped product/test digest that survives unrelated later stories;
- eliminate reviewer artifact-repair follow-ups by validating the completion payload before actor termination; and
- reduce conductor inspection/tool use enough to meet the frozen token, tool, and harness-wait budgets.
