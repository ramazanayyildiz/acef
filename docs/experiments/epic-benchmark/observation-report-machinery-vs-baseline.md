# Observation Report — ACEF Machinery vs Disciplined Baseline on Real Delivery

Status: **in progress** — baseline arm complete; machinery arm accruing. This is the observational study the v3
epic benchmark could not produce: same repo (jakomeet), same conductor, same worker pool, real product work
(E-PKG packaging/entitlements epic), two halves — S1–S7 run WITHOUT ACEF machinery (disciplined-conductor
baseline), everything from the review-fix story onward run WITH fully installed ACEF typed state.

Method note: this is not a controlled experiment (arms are sequential, stories differ, conductor learned along
the way). It is structured observation with named incidents mapped to specific ACEF controls.

## Arm 1 — Disciplined baseline (E-PKG S1–S7, review, 2026-07-03)

Setup: conductor/worker separation, stop-on-ambiguity, conductor-only verification and commits, guarded stories
to stronger models with hand-reviewed diffs, known-failure ledger — the ACEF *operating model* re-derived and
enforced entirely through prompts and chat discipline. No `.acef` install, no typed records, no hooks.

### What discipline alone achieved
- 7 stories shipped with zero verified regressions against a 2,400-test suite in a repo with 31 documented
  pre-existing failures; every commit conductor-verified.
- Stop-on-ambiguity fired correctly twice with real value: S3 halted on the fortified `billing_charge_attempts`
  invariant (module CLAUDE.md said "coordinate with maintainer" — the worker read it and stopped); S7 was
  tests-only and respected a hard no-production-code rule.
- Fresh-context adversarial review caught a genuine revenue-leak blocker (one €9 pass → unlimited publishable
  webinars) that three implementation workers and the conductor's own hand-reviews all missed — the strongest
  single data point for independent review as a correctness-producing control.

### What broke, mapped to the ACEF control that addresses it
| Incident | Cost | ACEF control that would have bounded it |
| --- | --- | --- |
| Child agent disputed which principal owned it; ran an hour-long test job through three of the conductor's "quiet" verification windows; conductor's serial verification produced 26/148/153 phantom-failure counts across identical runs | ~2h of forensic triage; three corrupted verification attempts | **Actor records + worker identity**: a typed principal chain makes "who owns this worker" a lookup, not a dispute |
| Workers ran broad test suites despite prompt-level prohibition (queued "wait for quiet DB then run" loops that survived two kill sweeps) | DB contention; false regression signals | **Worker-scope / hard-wall hooks**: prompt text is advisory; a hook is not |
| Scope enforcement was post-hoc: conductor inspected `changed_paths` after work, nothing prevented an out-of-scope write at write time | Latent (no violation occurred — but detection was after-the-fact by design) | **Worker-scope write fence** |
| Entire run state (verified-story list, standing decisions, known-failure list, protocol rules) lived in conductor chat context until the run ledger was created at the owner's prompting mid-epic | Session compaction/death would have orphaned the run | **Ledger + typed state + `acef-status`/`acef-next`** |
| A worker session died mid-report with complete code on disk; conductor had to reverse-engineer completion state from `git status` | ~15 min; recoverable only because file layout was legible | **Evidence records**: typed per-step evidence makes worker death a non-event |
| "Done" claims were chat messages; verification evidence lived in conductor context and commit messages | Auditable only by replaying the conversation | **Gate verdicts + evidence manifests** |

### Baseline-arm conclusion
The operating model carried ~90% of the value — but its failure modes were exactly the ones the v2/v3 benchmarks
could not provoke on single-worker single-session tasks: identity disputes, advisory-only scope, chat-resident
state. All three occurred naturally within one real epic. The machinery's price (measured in v3: +16–26% tokens
per guarded epic) buys insurance against precisely these, plus audit.

## Arm 2 — Full machinery (review-fix story onward)

Setup (2026-07-03): repo-local ACEF installed on jakomeet (`install-acef-tools` + skills). Typed state
bootstrapped: `ACEF_ACTIVE_RUN.json` (guarded lane, goal-carrying), actor record `REVIEW_FIXER_OPUS` pinned to
input commit fc48b023, atomic worker-scope singleton, approval record carrying the owner's exact words, compiled
`ACEF_CURRENT_CONTEXT.md`; `acef-status` = ready, `acef-next` = `implement_to_green`.

**Topology change (owner directive):** the observing Claude session steps out of the conductor seat entirely and
takes the owner/observer role. The CONDUCTOR is an external **codex** agent on agentbus (`epic-conductor`),
cold-started exclusively from repo truth (AGENTS.md → `acef-status` → `acef-next` → current context → ledger);
it dispatches codex/opencode workers over agentbus, binds their typed actors/scopes before dispatch, records
evidence-runs, decides gates via a distinct Process Judge actor, commits, and reports to the owner at gate
boundaries. This makes Arm 2 the strictest form of the validation: ACEF machinery driving and constraining
NON-Claude agents end to end, with the observer intervening only at approvals — and it directly tests the
authority-chain failure mode from Arm 1 (typed principals over agentbus instead of disputed prompt-claims).

Disclosure (per the goal's violation rule): the review-fixer worker was dispatched minutes before the goal was
set; its actor record is retroactive (correctly pinned). Every subsequent worker is bound before dispatch.

### Observations (accruing)
- (pending) Story closeout mechanics: evidence-run records for each verification command; typed gate verdict
  decided by the conductor-as-Process-Judge; independent reviewer re-verification before push.
- (pending) Overhead: wall-clock and friction cost of the typed ceremony per story, vs the baseline arm's
  equivalent steps.
- (pending) Whether any control *fires* (blocks or catches something) versus merely records.

## Deliverable criteria (from the owner's goal sentence)

Every jakomeet change from Arm 2 onward has a corresponding typed ACEF record verifiable in `.acef/` and
`docs/ai/`; violations are surfaced, not rationalized. This report is the comparison artifact.
