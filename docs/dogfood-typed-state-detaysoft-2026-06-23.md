# Typed-State Dogfood: Detaysoft

Date: 2026-06-23

## Isolation

- Source repository: `/Users/ramazanayyildiz/CODE/OPA/detaysoft2026`
- Source commit cloned: `98aa35ac3b4c3c01552c619dd851d2a8f6fd1973`
- Disposable clone: `/tmp/acef-detaysoft-typed-state-dogfood`
- The active Detaysoft worktree was read only. All sidecars, test output, SQLite setup, and installed ACEF tools were
  created in the disposable clone.
- The disposable clone, including its copied local `.env`, was removed after the evidence below was recorded.

## Real Run

The installed `.acef/bin/acef-state` created:

- six distinct actor records for `Dogfood 1`;
- a Process Judge worker scope;
- `ACEF_ACTIVE_RUN.json`;
- an exact human-style Epic 99 approval fixture;
- runtime evidence for `php artisan test --compact --filter FoundationSmokeTest`;
- a Process Judge PASS gate citing the successful runtime evidence.

The first runtime attempt correctly recorded exit `1`: the disposable clone had no
`database/database.sqlite`. After creating the ignored disposable database file, evidence
`dogfood-foundation-smoke-v2` recorded exit `0` and retained the raw command output hash.

## Validator Results

```text
PASS actor-separation: Six typed full-BMAD phase actors are distinct for Dogfood 1
PASS worker-scope: dogfood-process-judge is bound to Dogfood 1/process-judge
PASS evidence-manifest: 2 typed evidence manifest(s) verified for Dogfood 1
PASS gate-verdict: dogfood-story-gate PASS is actor-bound and evidence-backed
PASS epic-transition-approval: Typed human approval dogfood-epic-99 authorizes Epic 99
```

## Intentional Negative Catch

The successful runtime log was modified after its manifest was written. The validator failed closed:

```text
FAIL gate-verdict: evidence dogfood-foundation-smoke-v2 raw artifact hash mismatch
```

Restoring the original bytes returned the gate to PASS.

## Finding Promoted During Dogfood

Detaysoft has `"type": "module"` in its root `package.json`. The initial installed parser was therefore interpreted as
ESM and failed because it uses CommonJS. The installer now writes `.acef/bin/package.json` with
`{"private":true,"type":"commonjs"}`. `test-install-acef-tools` reproduces the module-typed host and verifies the
installed CLI, so this portability bug is now a regression test rather than a prose warning.
