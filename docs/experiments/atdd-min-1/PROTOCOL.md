# ATDD-MIN-1 Frozen Protocol

Status: preregistered before oracle authoring or execution.

## Decision

Determine whether Native/Fix/Standard should default to one continuous Developer session that writes an authentic
critical-path RED before implementation, instead of a separate minimal Test Author handoff. This experiment cannot
retire Full's independent Test Author or the migration, money, authorization, concurrency, state-machine, and new-test-
architecture preservation triggers.

## Target and isolation

- Target: JakoMeet at one pinned commit.
- Reuse the existing ACEF epic-benchmark worktree/vendor/sqlite setup.
- Every run uses a disposable detached worktree; no existing JakoMeet worktree, branch, active run, or product file may
  be modified.
- Use the same Claude Opus model and effort, task capsule, base commit, allowed paths, and command budgets in both arms.
- Randomize arm order per task and run at most four sessions concurrently.

## Arms

- **A — separate minimal ATDD:** one Test Author session creates at most one focused Feature test and, only when the
  capsule requires it, one minimal Dusk journey; makes one test-only RED commit and one authentic RED run; creates no
  test-design document and does not reread PRD/NFR material. A fresh Developer implements from that RED handoff.
- **B — integrated RED:** one continuous Developer session creates the same-scope RED, makes the test-only RED commit
  and authentic RED run, then implements without a handoff.

The active ATDD budget is approximately ten minutes; actual verification command runtime is recorded separately and
excluded symmetrically. Handoff/orchestration time in A is included.

## Six task categories

1. UI-only shortcut versus a directly authorized admin/publish action.
2. Shared Event Center shell adoption across a new and an existing page.
3. Mobile navigation plus browser Back/Forward and scroll-state preservation.
4. Publish/admin route and capability authorization.
5. Landing Preview authentication, scroll behavior, and token/security handling.
6. One preservation probe covering money or a state-machine invariant.

Each frozen capsule contains story text, acceptance criteria, target test paths, allowed paths, focused verification,
and one frozen FAQ. Mid-run readiness edits are forbidden.

## Hidden oracles

- A fresh Opus context authors and seals executable hidden oracles outside every executor worktree before execution.
- Executors never receive oracle paths or contents.
- Every oracle must fail on the base commit and on a deliberately sabotaged shortcut variant.
- Oracles assert behavior, not literal strings.
- Invalid oracles are reported separately and cannot count as agent failures.

## Measurement

Primary outcomes per paired task:

1. Active time to accepted green, excluding test-command runtime but including A's handoff/orchestration.
2. Hidden-oracle escapes at accepted green, classified S1 (security/authorization/data) or S2 (functional).
3. Blinded final-diff rework findings.

Diagnostics: time to first product commit, harness-failure REDs, tool calls, context rereads, and any weakening/removal/
skipping of an assertion between the RED commit and accepted green.

## Blinding

Sanitize arm labels, actor identities, commit messages, and ledger traces. Randomize artifact order. A fresh Opus judge
context sees only sanitized artifacts and the frozen rubric. Mechanical outcomes are not model-judged.

## Decision rule

1. If B escapes an S1 defect where A does not, retain separate Test Author for that category. If this occurs in two or
   more categories, retain separate ATDD as Standard's default.
2. B-only test weakening counts as an S2 escape.
3. If tripwires are clean, make integrated RED the Standard default when median paired active-time saving is at least
   20% or B is faster in at least five of six pairs.
4. If tripwires are clean and B saves 0–20%, simplicity wins: adopt B but report the smaller measured saving honestly.
5. If B is slower, retain A.
6. Report `no detected quality difference at n=6`, never statistical equivalence.
7. The verdict applies only to Native/Fix/Standard. Full and all preservation triggers remain unchanged.

## Durable output

Write one result report and machine-readable run table under this directory. Decompose every non-pass into agent failure,
oracle failure, or infrastructure failure. Do not change ACEF policy or JakoMeet product branches during the experiment.
