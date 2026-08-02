# Execution Assurance v3.7 reviewer-vocabulary recovery

Status: **executable rehearsal; non-scored and non-promotable.**

V3.6 remains an immutable non-scored FAIL. Its repaired frozen-verification red/green chain was accepted, but both
Story 1 reviewers failed their one-shot completion command because their semantically clear report vocabulary did not
match the exact uppercase enum schema. That mechanical stop prevented a real HIGH finding from entering bounded
Developer repair.

V3.7 changes only the trusted reviewer-report parsing boundary:

- verdict and canonical severity/status values are case-normalized;
- `INFO` is canonicalized to non-blocking `LOW`;
- `CLOSED` is canonicalized to `RESOLVED`;
- the raw report bytes remain hash/blob-bound to the reviewer completion; and
- all downstream gate dispositions use the canonical parsed values.

Unknown vocabulary remains invalid. HIGH/CRITICAL findings still cannot be dismissed or deferred, REVISE/REPLAN still
requires an OPEN finding, PASS still cannot contain OPEN findings, and report identity, path, hash, input commit/tree,
actor, run, story, and phase bindings remain unchanged.

## Rehearsal rule

The unchanged four-story v3.5 contract is reused. Candidate commit
`e59bfaab8c02381c94ff4faa8f353298d30cd006` must pass clean preflight and Stage 0 before one executable attempt named
`REHEARSAL-v37`. The attempt is non-scored: it receives no blind judgment and cannot authorize promotion, `proven`
maturity, installation, or rollout. Any future scored attempt requires a separate frozen manifest and run identity.
