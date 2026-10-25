# Experiment evidence archive

The experiments in this folder are finished and their results are frozen. To keep the repository small, the main
branch keeps only what readers and tools use:

- every experiment's top-level files (README, DESIGN, PROTOCOL, RESULT/report, manifests, summaries);
- nested files that a method doc, capability record, script or experiment report cites by path;
- `empirical-validation/fixtures/`, which `scripts/test-acef-empirical-validation` reads.

The raw per-run data (run logs, transcripts, oracle and judge outputs, diffs, prompts) was removed on 2026-10-25. The
complete evidence stays addressable at the tag `experiments-archive-2026-10-25` (commit `c51e26f`):

```bash
git show experiments-archive-2026-10-25:docs/experiments/<experiment>/<path>
```

```bash
git checkout experiments-archive-2026-10-25 -- docs/experiments/<experiment>
```

A cited path that no longer exists on main resolves at that tag.
