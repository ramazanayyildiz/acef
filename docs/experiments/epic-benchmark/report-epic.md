# ACEF Epic Benchmark Report — authz-fail-closed-hardening (v3 instrument)

Experiment `acef-epic-authz-v3`: one real 4-story epic from jakomeet's deferred-work backlog, run 6 times
(3 lanes × 2 clients) in git worktrees of the live repo, **each story a fresh agent session** — 24 story sessions
on the final clean matrix. Rows: `runs/results-epic.jsonl`; instrument-bug attempts archived alongside.

## Final matrix

| Lane | codex | opencode |
| --- | --- | --- |
| baseline | **epic_pass 4/4** — 1,076,543 tok | **epic_pass 4/4** — 154,847 tok |
| lightweight | **epic_pass 4/4** — 1,111,582 (+3.3%) | **epic_pass 4/4** — 154,202 (−0.4%) |
| guarded | **epic_pass 4/4** — 1,353,696 (+25.7%) | **epic_pass 4/4** — 178,820 (+15.5%) |

Zero scope violations in 24 sessions (S4's billing files were visible-and-forbidden during S1–S3 and vice versa —
the structural cross-story bait was never taken). Integration verify + oracles green in all 6 runs.

## Findings

1. **The v2 verdict extends to the multi-session regime at this scale.** Every lane, both clients, passed a
   4-story sequential epic with real session teardown between stories. Baseline resumed correctly from nothing but
   the story prompt + worktree state; the ledger/current-context machinery was not needed for resume correctness
   at this epic size.
2. **Cost profile confirms the WS3 result and prices the guarded lane.** Lightweight is now free (+3.3% codex,
   −0.4% opencode — noise). Guarded costs +25.7% (codex) / +15.5% (opencode) per epic for actor/scope/state
   ceremony that caught nothing here: its enforcement value was not exercised because no agent ever attempted a
   scope escape.
3. **What this does NOT show:** n=1 epic; 4 self-contained stories, each with a provided failing test; one
   sequential worker; no parallelism; no ambiguity about what to do next. The regimes where drift/separation
   controls plausibly earn their +16–26% — parallel workers on adjacent scopes, stories without per-story oracles,
   longer horizons, ambiguous next actions — remain unmeasured. That is the honest next frontier, and it is a
   harder instrument to build.
4. **Client-environment limitation (documented):** opencode intermittently auto-rejects file access in git
   worktrees under the tmp workspace ("permission requested: external_directory … auto-rejecting"), concentrated
   in the `--pure` baseline variant (~10% of opencode sessions across attempts; three affected runs were purged
   and rerun clean). Likely cause: a worktree's `.git` is a file pointing at the source repo, confusing project-
   root resolution. One additional run was lost to a machine sleep hitting the 20-minute client timeout.
5. **The campaign's instrument bugs were themselves the dogfood value.** Six real integration defects were found
   and fixed by building and running this harness: Laravel's gitignored storage skeleton missing in worktrees;
   phpunit.xml referencing untracked suite dirs (`setupDirs`); `fs.cpSync` resolving composer path-repo relative
   symlinks to absolute (tests silently loading unpatched source-repo package code); `must()`'s stdout trim
   mangling the first porcelain line into phantom scope violations; target-repo pre-commit hooks gating harness
   checkpoint commits; and `acef-state`'s (correct) immutable actor records rejecting same-id rebinding — the
   harness now opens a distinct actor per story, as real conductors do.

## Deliverable side-effect

Each passing run produced a working fix-set for four items of real jakomeet deferred-work debt (resolver
fail-closed, middleware idempotency, legacy alias cleanup, webhook ingress correctness). Run worktrees were
disposed after scoring, but the **canonical patches** in `canonical/` passed the full dry-run ladder
(red→green per story + integration + authz package suite) and can be applied to jakomeet directly to close the
debt — recommended follow-up.

## Evidence

- Rows: `runs/results-epic.jsonl` (24 story + 6 epic rows, 0 errors); confounded attempts:
  `runs/results-epic.attempt1-instrument-bugs.jsonl`.
- Harness: `scripts/acef-epic-benchmark` @ repo HEAD; dry-run gate ladder documented in `DESIGN.md` and the
  session CHANGELOG entries.
- Raw transcripts under the tmp workspace, referenced by SHA-256 per row.
