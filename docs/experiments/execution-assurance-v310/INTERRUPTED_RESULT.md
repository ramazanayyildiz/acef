# Execution Assurance v3.10 rehearsal interrupted result

Status: **INTERRUPTED / consumed / non-replayable**

`REHEARSAL-v310` was the single non-scored attempt frozen by
`rehearsal-manifest.json` against candidate implementation
`ad2df8cfc1da328d52e1f6a0facbba8497259b2f`. Clean preflight passed and Stage 0 passed 6/6 before the actor run.

The parent session ran from `2026-08-02T23:45:08.059Z` to `2026-08-02T23:52:01.149Z`, approximately 413.1 seconds.
It was stopped fail-fast after the Story 1 ATDD lifecycle became irreversibly process-invalid. The remaining stories,
reviewers, broad suite, Epic Process Judge, and blind Judge did not run.

## What happened

1. The ATDD actor committed the correct one-file test-only red tree at
   `392a7bd3e81e4630d9eb13beb54c256302263a8c`.
2. It invoked `acef-state evidence-run --kind atdd-red`. The writer correctly rejected that invented kind before
   PHPUnit ran; allowed kinds include `runtime-test`, not `atdd-red`.
3. The conductor reactivated the same ATDD actor twice with `followup_task`. The frozen four-actor-v3 contract forbids
   retrying an ATDD actor after `REVISE`; it requires one fresh report-only adjudication and, only after `UPHOLD`, one
   fresh bounded correction actor.
4. The same ATDD child therefore emitted three terminal results: `REVISE`, `REVISE`, then `PASS`. Later success cannot
   erase the two prohibited lifecycle retries.
5. The conductor then started the Development actor. It modified the allowed production file, but the rehearsal was
   interrupted before a terminal Development receipt existed.

The harness `pilot-finalize` command refused to invent a result:

```text
REHEARSAL-v310 actor started but exited without a receipt; side effects are indeterminate and the attempt must be
adjudicated, not replayed
```

## Root cause and disposition

The reviewer atomic-handoff implementation was not reached and is therefore neither passed nor disproved by this run.
The new failure is earlier in the compiled ATDD protocol:

- the actor prompt did not provide the exact valid evidence-run kind/template, allowing an invented semantic kind;
- the conductor treated a mechanical evidence-command failure as permission to reactivate the ATDD author; and
- the no-ATDD-followup rule was post-run audited rather than stopped at the first forbidden transition.

A successor must bind the exact `runtime-test` evidence command into the ATDD prompt and enforce the ATDD transition
state machine before Development dispatch. It must fail immediately if an ATDD actor receives any follow-up, rather
than relying on eventual transcript closeout. V3.10 must not be replayed.

Capability maturity remains `enforced`, not `proven` or `installed`.

## Measured partial evidence

- Parent + ATDD + partial Development input tokens: `2,248,781` (`2,109,440` cached)
- Output tokens: `15,644`
- Tool calls: `54`
- Parent raw SHA-256: `73d7682ede169dbe5883c34210e8db1ff5a1873265ffcd50eca61f6d84ebfe63`
- Checkpoint SHA-256: `1161f59614208207d77131be14cef474c440dff81f6eb9f679ba2d530694557b`
- Parent transcript SHA-256: `68ed404694b5bc143d78005483147f2da3d9e7248c8f1ebaeddf87152b183a77`
- ATDD transcript SHA-256: `2265782bd9f8d220508c4de45e307a90b65ad9cf42c2b2324ad47677898e240a`
- Interrupted clone HEAD/tree: `c700507e5c596e0e4da160b1d2158c0d66afe577` /
  `95d39925441b3c8503d6cb4edd4b61815c5c98b9`
- Dirty application path at interruption:
  `packages/platform/authz/src/Http/RouteRequirementResolver.php`
