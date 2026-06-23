# Bug Hunter PR Review Pilot

Date: 2026-06-24

## Summary

This pilot ran the new `bug-hunter` review lens through the codemap-backed `acef-pr-review` entry point on 10 bounded
temporary fixtures. The goal was to check whether the lens behavior is useful in practice, not only whether the skill
metadata and schemas are valid.

Raw run records:

- `docs/experiments/bug-hunter-pilot/runs/bug-hunter-pr-review-2026-06-24.jsonl`

## Method

Each fixture used a temporary local Git repo with:

- a bounded changed-file set;
- an explicit `--work-shape`;
- a small issue/AC artifact;
- a focused test command;
- a minimal adapter and pattern registry;
- `acef-pr-review` to generate the targeted diff and codemap review profile.

The lens was applied report-only against the generated PR-review context. No fixture touched an active product repo. The
pilot did not add a security lens, new dependency, runtime, UI, vector store, graph, SQLite projection, or default skill
promotion.

## Case mix

| Group | Count | Cases |
| --- | ---: | --- |
| Known behavioral defect | 3 | `bh-01-null-boundary`, `bh-02-boundary-branch`, `bh-03-resource-lifecycle` |
| Hollow-green / framework-fighting risk | 2 | `bh-04-hollow-green-test`, `bh-05-framework-fighting` |
| Conformance-only | 2 | `bh-06-helper-conformance`, `bh-07-registration-conformance` |
| Clean / no finding | 2 | `bh-08-clean-service`, `bh-09-clean-boundary` |
| Scope escape | 1 | `bh-10-scope-escape` |

## Results

| Metric | Result |
| --- | ---: |
| Total cases | 10 |
| `acef-pr-review` prepared bounded context | 9 |
| Scope escape blocked | 1 |
| Known findings recalled | 7 / 7 |
| False positives | 0 |
| Clean cases incorrectly flagged | 0 / 2 |
| Conformance-only cases classified as behavioral defects | 0 / 2 |
| Patch attempts | 0 |
| Gate approval attempts | 0 |
| Approx. source bytes reviewed | 56,926 |
| Approx. returned bytes | 4,615 |

## Answers

### Did `bug-hunter` find real defects?

Yes, in the bounded pilot fixtures. It found all 3 behavioral defects:

- null/empty boundary regression;
- incorrect branch/boundary condition;
- resource-lifecycle cleanup regression.

It also found both hollow-green risks:

- a test replaced the production path with a tautology;
- code introduced a `NODE_ENV === "test"` branch that bypassed the production reader.

### Did it avoid style-only noise?

Yes. The pilot did not record style-only findings. Clean cases stayed clear, and conformance-only cases were not inflated
into behavior bugs.

### Did it correctly separate behavioral defects from conformance findings?

Yes for these fixtures. Helper bypass and missing registration were reported as `conformance`, not as
`behavioral-defect`. That separation is important because conformance findings should be dispositioned through code,
pattern-registry update, do-not-copy update, a mechanical check, or explicit deferral.

### Did it ever try to patch or approve a gate?

No. Every case stayed report-only. The lens did not mutate implementation files, approve a gate, mark work complete,
spawn a worker, or claim a Process Judge verdict.

### Did `acef-pr-review` keep scope bounded?

Yes. Nine valid cases generated targeted diff/profile artifacts for changed files. The explicit scope-escape case
attempted `--path docs/issue.md` while the changed file was `src/services/scope.js`; `acef-pr-review` blocked with:

```text
ACEF_PR_REVIEW_ERROR: requested --path escapes the changed-file scope
```

### Should `bug-hunter` remain optional, become recommended, or be revised?

Recommendation: make `bug-hunter` recommended as a JIT lens for bounded PR/lightweight review, but keep it out of the
minimal default install for now.

Reason:

- It recalled all known defects in this pilot.
- It avoided style-only noise.
- It respected report-only and no-gate boundaries.
- It benefited from the generated codemap review profile.

But this pilot used controlled fixtures, not live production PRs. Before any default-install promotion, run the same
measurement on at least 10 real ACEF PR/lightweight reviews and compare false positives, defect recall, extra-file-read
count, and token/cost against review without the lens.

## Limitations

- Fixtures were synthetic and intentionally small.
- The pilot measured one agent applying the lens, not cross-agent variance.
- Byte counts are approximate local context sizes from diff/profile/issue/adapter/pattern/test inputs and compact
  report output.
- No security findings were tested; security remains out of scope for `bug-hunter`.
- No default installer promotion was made.

## Next measured pilot

Run `bug-hunter` as an injected JIT lens on 10 real PR/lightweight reviews using `acef-pr-review`, then compare:

- blocker/high defect recall;
- false positives;
- style-only noise;
- conformance-vs-behavior classification accuracy;
- extra files read;
- source bytes and returned bytes;
- whether any reviewer-authored patch or gate-approval violation occurs.
