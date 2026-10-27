# Running product review (opt-in, Standard + Guarded)

`productReviewContract: running-product-review-v1` is an opt-in contract for the Standard (lightweight) workflow with
Guarded assurance. It adds no new actor, Judge, parallel state machine or global hook: the independently dispatched
Code Reviewer owns source and running-product verification. Runs without the contract behave exactly as before.

## What PASS requires

Before a complete lifecycle or terminal PASS, `ACEF_LIGHTWEIGHT_RUN.json` keeps the contract and binds
`productReview: {reportPath, sha256}`. The JSON report uses schema `acef.product-review.v1` with the same runId, a PASS
verdict, reviewerActorId, the reviewer's own sessionId (distinct from the developer's), reviewedAt, applicationCommit
and applicationTree. The application identity is `applicationTreeDigest(repo, commit, workerScope.allowedPaths)` from
the runtime; commit the product before review. A later change inside the scope invalidates the report; control-only
recording does not. Glob scopes such as `app/**` or `src/**/*.ts` resolve against tracked files (`**/` also matches
zero directories), so a changed nested or root-level file changes the identity instead of hashing as `<missing>`.

The browser record must be `VERIFIED` at a local loopback origin (`http://127.0.0.1:<port>` or
`http://localhost:<port>`). A host that reserves one review port pins it, first match wins: the lightweight run's
`productReviewOrigin`, the active run's, or the host-owned `.acef/product-review-policy.json`
(`{"browserOrigin": "http://127.0.0.1:<port>"}`; the installer never writes this file). A pinned origin must match
exactly. Artifact records carry a unique id, a repository-relative path, a SHA-256 and kind `browser-trace` or
`screenshot`; desktop and mobile screenshots are mandatory. Ignored local evidence is supported, but hashes and local
bytes must still be available at certification. Evidence is never invented.

Checks: componentReuse, persistenceRoundtrip, validation, navigation, responsiveKeyboard, loadingFailureRetry,
tenancy, operationsVisibility, copy, dialog and pagination. Each records PASS, a concrete observation and artifactIds.
Only dialog and pagination may be NOT_APPLICABLE, with a specific reason. The reviewer exercises a real authenticated
HTTP/database roundtrip and direct-route data isolation between tenants or accounts; code reading or static
screenshots alone are not enough. Screenshots are visual evidence, not substitutes for behavioral traces.

componentReuse also requires `reuseAudit`: existing `[{path, usage}]`, introduced
`[{path, kind: component|helper, rationale, alternativesChecked: [path]}]`, sharedChanges
`[{path, consumers: [{path, verification: source|browser|test|source+browser|source+test, artifactIds}]}]` and a
duplicationReview note. Paths must be real repository files and notes must give concrete reasons. Empty introduced or
sharedChanges arrays are allowed when the diff warrants them. This checks the structure of the recorded evidence; it
cannot detect every semantic duplicate. Before implementation the Developer searches existing components and code,
records the chosen reuse mapping and explains unavoidable additions; a mapping completed afterwards is recorded as such.

## Enforcement points

- `checkLightweightLifecycle` runs the product evidence validator (`scripts/lib/acef-product-review.js`);
  `validateTerminalCandidate` runs that lifecycle on PASS. The contract cannot be dropped from a complete lifecycle.
  Non-PASS terminal behavior is unchanged.
- Actor separation and gate integrity use the same-run independent Code Reviewer (distinct actual sessions) instead of
  a Process Judge; Lean Evidence then does not require a Process Judge report. The surface-evidence projection accepts
  that reviewer's successful hash-bound evidence; other workflows keep the implementation-actor restriction.
- Objective accounting counts distinct reviewed application trees from independent same-run bindings and hash-bound
  observations or native browser invocation receipts. A failed partial tour is a review cycle, not acceptance; a green
  receipt can coexist with REVISE after manual inspection. Completion revalidates the full report and local artifact
  hashes. The per-run opt-in and the PASS binding survive when a later story replaces the singleton lifecycle.
- `acef-state objective-control-budget` grants one audited, finite control-time extension (1..3600 s, expiry within
  2 hours, authority file and hash) to exactly one named next run after an authentic opted-in terminal PASS. The
  default 1800-second guard and every non-time guard stay; nothing renews or resets itself.

## Limits

Files cannot prove that a browser visit happened or that an observation is honest; authentic independent dispatch is
still essential. The tests (`scripts/test-acef-product-review`, `scripts/test-acef-product-review-accounting`) use
synthetic fixtures for missing, stale, tampered, non-independent and unverified evidence; they establish validator
behavior, not product quality. No automatic executor or unattended-reliability claim is made.
