# Direct Lane Dogfood: Agentbus and Scientificfloor

Date: 2026-07-30

## Isolation

- ACEF source commit: `40680caaf1670d7bcae310a9a950b54987595e68`
- Agentbus source repository: `/Users/ramazanayyildiz/CODE/Ram/agentbus`
- Agentbus source commit: `c6b2c35942379415e07b578035fbd219e626e331`
- Scientificfloor source repository: `/Users/ramazanayyildiz/CODE/Ram/scientificfloor-dynamic`
- Scientificfloor source commit: `958685c32fc7791e0d1725480a7e060a26e2ffea`
- Disposable root: `/tmp/acef-direct-smoke.N2bwUp`
- The active product worktrees were read only. Installation, direct-run sidecars, smoke changes, commits, and negative
  cases were created only in disposable local clones.

Both clones received the current repo-local tools and Codex, Claude, and OpenCode skills through:

```text
node scripts/update-acef-installation --repo <clone> --review-lenses
```

The installation changes were committed as disposable baselines before the direct task began, ensuring the validator
observed only the task change.

## Positive Runs

Each clone used its installed `.acef/bin/acef-state` to:

1. open an active direct run with technical boundary `docs`;
2. create `docs/acef-direct-smoke.md`;
3. run `test -s docs/acef-direct-smoke.md`;
4. record the changed path, successful command exit, and handoff;
5. run `.acef/bin/acef-process-validator --check lane-closeout`.

Results:

```text
PASS agentbus: lane-closeout: direct closeout bundle passed
PASS scientificfloor: lane-closeout: direct closeout bundle passed
```

The completed direct-run record hashes were:

```text
agentbus:       6b02410f2339eff3da4658cfce3f0bb0d5253d4899406b0d686f3f610ee51efb
scientificfloor: 78d0c2d3fbc7038089797384bfb5aaeea6a93c27c5ad20a241b99a315988c90e
```

## Intentional Negative Catch

After checkpointing the successful Agentbus run, a new direct candidate added:

```text
database/migrations/acef_direct_smoke.sql
```

The installed validator failed closed:

```text
FAIL lane-selection: direct task must promote: risk trigger migration; risk trigger persistence;
changed path outside direct task record: database/migrations/acef_direct_smoke.sql
```

This confirms that target-repository installation does not let migration-shaped work remain in the direct lane.

## Verdict and Limit

Verdict: deterministic target-repository dogfood passed for two repositories, including a positive closeout and an
intentional promotion catch.

This validates installation portability and the direct mechanical contract. It does not satisfy ACEF's empirical
`proven` threshold: these were disposable documentation smoke tasks, not 30 measured production tasks with
wall-clock, token, defect-escape, and false-positive comparisons. The capability remains `enforced`.
