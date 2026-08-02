# Execution Assurance v3.1 Recovery Candidate

V3.1 is a separately preregistered successor to the failed v3 P0 candidate. It does not rewrite the v3 manifest,
result, or judgment.

The candidate changes four mechanics exposed by that run:

1. A deterministic story gate freezes the explicit production/test paths changed by that story. Later work outside
   that set cannot stale the story package; later work inside it still invalidates review, evidence, and tree binding.
2. Reviewer completion is produced by the read-only `acef-state review-completion` command. It validates the typed
   report against the active run, exact reviewer identity, active story, phase, commit, and tree before emitting the
   completion payload consumed by the conductor and experiment oracle.
3. The task contract freezes explicit test paths and executes the exact scored SQLite story oracle both during pilot
   preflight and again immediately before timed execution. The expected result is a genuine behavioral red; migration,
   bootstrap, or dependency errors fail preflight. Broad project tests that require the unsupported full SQLite
   migration chain are outside the frozen test envelope, preventing the contamination seen in v3.
4. The `v31-empirical` budget profile keeps the original 17/21 actor topology and 9,000/10,800-second time bounds, but
   preregisters hard measurement ceilings of 50M input tokens, 520 tool calls, and 2,700 seconds/38% harness wait. These
   limits were selected before the rerun from the incomplete v3 observation; they are not retroactive exceptions.

Promotion remains fail-closed: deterministic and blind product PASS, zero Critical/High findings, process PASS, and
every hard budget must pass. Until that happens, capability maturity remains `enforced`.
