# Execution Assurance v3.22 rehearsal result

Status: **FAIL (fail-closed, not promotable)**

The single frozen `REHEARSAL-v322` attempt stopped after 2,223.7 seconds. It must not be replayed.

No root model-capacity error occurred, so the V3.21 transient-resume path was not used. Story 1 closed PASS in 1,118
seconds. Its initial Code Review found a real MEDIUM edge case: empty or whitespace-only expressions could bypass the
new fail-closed check when configured as a special-permission key. The original Developer session repaired it once;
both retry reviewers passed. Story 2 closed PASS in 355.4 seconds without repair.

Story 3 completed behavioral ATDD and a green product patch, but the Developer could not record typed green evidence.
The ATDD actor had named the editable PHPUnit method `test_legacy_route_files_do_not_redeclare_route_permission_alias`,
while the frozen discovery contract required `legacy_route_files_do_not_redeclare_route_permission_alias`. Renaming the
already bound red source during Development would violate test-source preservation, so the Developer correctly returned
terminal REVISE and the run stopped. Story 3 partial delivery was 442 seconds.

The successor validates frozen discovery identities directly inside ATDD before commit and also binds discovery into
the exact red-evidence command. The state writer now performs discovery before creating the canonical ATDD actor or any
evidence artifact, so a mismatch is failure-atomic and repairable inside the same ATDD turn.

## Measurements

| Measure | Result |
|---|---:|
| Active duration | 2,223.7 s |
| Story 1 delivery | 1,118.0 s |
| Story 2 delivery | 355.4 s |
| Story 3 partial delivery | 442.0 s |
| Actor invocations | 13 |
| Total input tokens | 9,855,601 |
| Cached input tokens | 9,399,296 |
| Output tokens | 62,937 |
| Model cycles | 116 |
| Tool calls | 208 |
| Conductor input tokens | 6,385,471 |
| Conductor tool calls | 106 |
| Conductor resumes | 0 |

## Successor repair basis

1. ATDD must directly run frozen test discovery and match every exact identity before its test-only commit.
2. The exact red-evidence command must carry the same discovery argv and expected identities.
3. Discovery failure must happen before canonical ATDD actor creation, raw evidence, or evidence-manifest writes.
4. Exact bootstrap, Developer pre-registration, one Developer session, independent reviewers, transient conductor
   resume, and all circuit breakers remain unchanged.

Raw telemetry is retained in `runs/pilot.jsonl`. Capability maturity remains `enforced`, not `proven`.
