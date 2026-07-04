# Observation Report — ACEF Machinery vs Disciplined Baseline on Real Delivery

Status: **first full machinery cycle COMPLETE** (2026-07-03) — baseline arm complete; machinery arm has one
end-to-end story cycle recorded and pushed; further cycles accrue as the epic continues. This is the observational study the v3
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

**O2-1 — Cold-start from repo truth: PASS.** The codex conductor, given only a read order, reported back the
typed contract from `acef-next` including constraints the owner's brief never mentioned: the per-phase evidence
requirements (`failing_before_implementation`, `green_test_command`, `changed_files_summary`), the
`max_1_commit_then_report` stop condition, and the forbidden-action list (`docs/ai/ACEF_*` edits, `spawn_worker`,
`push`, `approve_gate`, `edit_ledger` during development). The state machine, not the prompt, supplied the rules —
the exact mechanism the worker short-circuit work (v2) was building toward, now observed steering a non-Claude
agent.

**O2-2 — Contract-boundary behavior instead of drift.** When the owner's brief and `acef-next` disagreed about
`edit_ledger` at closeout, the conductor's response was to state its planned reconciliation and pre-commit to
stop-and-report if the contract still disagreed at decision time — rather than silently picking one authority.
Compare Arm 1's authority dispute, where a worker picked an authority unilaterally and burned hours.

**O2-3 — Degraded-worker recovery, machinery vs baseline (direct repeat of an Arm-1 incident).** The review-fix
developer session degraded before delivering its report, leaving complete code on disk — the same failure shape
as Arm 1's S6. Baseline recovery: the conductor reverse-engineered completion from `git status` in chat.
Machinery recovery: the disk state was handed to the conductor as a typed story with an existing actor record and
scope; verification proceeds as evidence-runs and the gate decision is explicitly allowed to FAIL if the B1 kill
cannot be confirmed from tests+diff. Recovery cost shifted from forensic reconstruction to normal closeout.

- (pending) Gate mechanics outcome: evidence ids + verdict + commit for the review-fix story (conductor
  mid-verification).
- (pending) Overhead accounting: typed-ceremony cost per story vs baseline equivalent.
**O2-4 — A control FIRED: phase discipline blocked a premature gate.** With seven PASS evidence records in hand
and diff review complete, the conductor attempted closeout — and `acef-next` still projected the *developer-phase*
contract (`implement_to_green`; `approve_gate`/`edit_ledger` forbidden) because no one had advanced the typed
state. The conductor halted and reported the exact projection rather than gating anyway. Contrast Arm 1, where
"done" was whatever the conductor's chat context said it was: here the state machine made skipping the phase
transition impossible to do silently. Resolution was the legitimate path — bind the Process Judge actor, rewrite
the active-run singleton to the review phase, re-read the projection.

**O2-5 — The gate artifact replaces the conductor's word.** The story closed with a typed PASS verdict
(`docs/ai/gates/gate-review-fixes-b1-w2-w3-n2n3n4.json`) decided by a distinct Process Judge actor
(`EPKG_REVIEW_FIXES_PROCESS_JUDGE_CODEX` — not the developer actor), pinned to the input commit, citing eight
evidence records: seven single-class test evidence-runs plus the independent review report recorded as evidence,
with per-surface round-trip mapping (database/config/internal/http). In Arm 1 the equivalent information was a
chat paragraph and a commit message; here it is machine-checkable repo truth that `acef-process-validator` can
audit. The full review-phase pipeline that produced it — developer forbidden to gate, review report demanded
before gating, judge distinct from developer — was enforced by `acef-next` projections at every step (see O2-4),
not by anyone's discipline.

**O2-6 — Ceremony overhead (qualitative, this story).** The typed machinery added, beyond Arm-1 discipline:
state bootstrap (~10 CLI invocations, one-time per run), two phase transitions, eight evidence-run wrappers
around commands that would have run anyway, one gate write, and two conductor-halts that each cost one
owner-roundtrip on the bus. Net wall-clock overhead was dominated not by the ceremony but by the halts —
and both halts were the machinery *correctly* refusing shortcuts, i.e. the cost center is also the control
working. A quantitative token comparison remains with the v3 benchmark data (+16–26% guarded-lane premium).

**O2-7 — The machinery caught the BASELINE CONDUCTOR, not just workers.** At commit time, jakomeet's own
pre-commit selfcheck (project-context hard rules) blocked the conductor. The Arm-1 conductor had silently
bypassed this gate with `--no-verify` on all ~15 baseline commits — a shortcut habit invisible until an agent
bound by "never bypass verification" refused and enumerated the failures. Root cause of the failures themselves:
the repo's hard rules are stale relative to owner-approved decisions (rules still demand the removed
`route.permission` aliases and the dead Starter/Pro taxonomy). Resolution kept the chain typed: an ACCEPT_RISK
approval record documenting the bypass rationale, a single verification-backed `--no-verify` commit referencing
it, and a ledgered follow-up to update the stale rules. The contrast in one line: **Arm 1 normalized the bypass;
Arm 2 turned it into a recorded, owner-approved exception with a remediation path.**

**O2-8 — Full cycle closed, with unscripted judge behavior.** The story completed the entire typed pipeline:
worker → disk handoff after worker death → 7 targeted evidence-runs + 2 parallel-suite evidence records +
3 UNSCRIPTED isolation-clear evidence records (the conductor isolated parallel-suite suspects on its own,
following the ledger's "isolation is authoritative" methodology — nobody instructed those three runs) →
independent review recorded as evidence → phase transitions enforced by projection → Process Judge PASS gate
citing all evidence → documented ACCEPT_RISK bypass approval → commit `682b2580` → repo's own pre-push gate
PASS → push to origin confirmed. Every artifact machine-checkable under `docs/ai/`.

### Cycles 2–3 (selfcheck-rules, ab-audit-fail-closed)

**O2-9 — Friction collapsed once the path was worn.** Cycle 2 (selfcheck rules) and cycle 3 (fail-closed audit
gate) ran with ZERO conductor halts: fresh actor bound before dispatch, evidence, independent review, judge gate,
normal commits (no bypass), owner-approved pushes. Ceremony cost settled at roughly code-review overhead. Failed
DoD harness attempts (2 in cycle 2) and a superseded gate (v1 in cycle 3) were preserved uncited rather than
deleted — evidence append-only discipline held without enforcement.

**O2-10 — The machinery improved itself and the improvement fired immediately.** Cycle 2's deliverable was fixing
the stale pre-commit rules (the same gate Arm 1 bypassed 15 times). Cycle 3's commit was then caught by one of
those fixed rules (Rule 48 flagging a fixture literal), fixed properly, and re-gated as v2. One story's output
became the next story's working control — the compounding loop ACEF's docs promise, observed within two hours.

### Cycles 4–5 (E-POOL planning + S1) — fleet operations and the gate-friction curve

**O2-11 — Worker-fleet operations are a real skill layer the machinery records but does not automate.** E-POOL S1
burned two workers before shipping: a codex dev killed mid-delivery because the conductor's stall window was
tighter than codex's long single turn (autopsy: 'Working (4m03s)', files landed at the kill), and an opencode
replacement hijacked by its own interactive update dialog — the second client-self-update casualty in this
project. The salvage path was machinery-native: the killed worker's immutable actor record let its 85–90%
complete patch be adopted WITH authorship credit, a gap-filler finished it under corrected doctrine
(transcript-tail reads before kills; first-minute dialog checks), and the gate cited evidence from the whole
chain. New doctrine ledgered.

**O2-12 — The commit-gate friction curve completed.** Arm 1: 15 silent bypasses. Machinery cycle 1: blocked →
documented bypass approval. Cycle 2: stale rules fixed as a story. Cycles 3–4: normal commits. Cycle 5: one
residual over-broad rule (34: 'every module has views') hit a deliberately viewless module — fixed in-line as a
micro-commit with a bidirectional fixture proof (viewless exempt, view-bearing still enforced), then the story
committed through the front door. No bypass. The gate's lifecycle under machinery: ignored → fought → maintained.

### Cycles 6–7 (E-POOL S2–S3) — the review layer's hit rate

**O2-13 — Structural independent review is catching real defects at a steady rate.** Three review-caught defects
in three consecutive E-POOL stories, all pre-commit, all inside the machinery's mandatory review step: S2's
adverse-verdict-overwritable-to-active (a bounced/unsubscribed address could re-enter the targetable pool) and
S3's two duplicate-poisoning blockers in seed ingestion. Combined with Arm 1's B1 (review-caught revenue leak),
the pattern across both arms is consistent: implementation workers + conductor verification miss a class of
defect that only fresh-context adversarial review finds — and the machinery's contribution is making that review
impossible to skip (Arm 1 ran it by choice; the review-phase projection makes it a precondition). Evidence
hygiene held throughout: superseded records (including the conductor's own test-DB collision mistake) preserved
uncited rather than deleted.

### Cycles 8–12 (E-POOL S4–S8, epic complete) — steady state, and the machinery corrected the OWNER

**O2-14 — Steady-state characterization.** E-POOL ran eight stories to completion under full machinery with zero
bypasses, zero worker churn after the fleet doctrine landed, two test-only stories (S5, S7 — the architecture
repeatedly proved contract-clean, so those stories became regression pinning), and review-caught defects in five
of eight stories (verdict overwrite, duplicate poisoning ×2, warmth provenance, erasure-registry gaps). The
review layer's hit rate held from first story to last; nothing else in the pipeline caught that defect class.

**O2-15 — The machinery corrected the owner, completing the set.** Before S8 (erasure), a read-only pre-check
scout falsified the owner's standing decision that "erasure rides the existing Super Admin GDPR deletion flow":
no such executable flow exists (scope.md's claim was aspirational; only Jetstream soft-delete exists, RETAINING
PII — file:line evidence). The decision was corrected on the record before any code was written, S8 was redesigned
(registry-driven erasure service, permanent hash-only tombstones so erased people cannot be re-imported), and
the platform-wide gap was ledgered as an owner follow-up instead of silently absorbed. With this, the machinery
has now caught all three roles: workers (scope/test drift, Arm 1), the conductor (bypass habit, cycle 1), and
the owner (decision on a false premise, cycle 12). No role's claims survived contact with typed evidence — which
is, in one sentence, ACEF's thesis.

### Cycles 13–21 (E-SEG S1–S8 + closeout) — boring is the result

**O2-16 — A full epic with nothing to report is the report.** E-SEG ran eight stories plus closeout with zero
bypasses, zero worker churn, zero escalations beyond routine gate approvals, review catches where they mattered
(notably S5's silent data loss: only the first extracted topic was being persisted), and reviewer-verified reuse
constraints (S7 riding E-POOL's targetable seam instead of paralleling it). The epic closeout oracle then caught
a stale cross-story test assertion and healed it through its own mini typed cycle — fix commit, gate, evidence —
before declaring the epic green (72 tests / 1009 assertions across the Audience surface). Steady-state machinery
delivery is operationally indistinguishable from a disciplined human team's cadence, with the difference that
every claim in the previous sentence is verifiable from state files rather than testimony.

### Cycles 22–24 (E-QRY closeout → E-AIA S1–S3) — provider onboarding under typed approvals

**O2-17 — Owner inputs enter the system as typed records, not chat.** The owner's real AI-provider credentials
(self-hosted vLLM endpoint) were onboarded mid-epic: endpoint validated out-of-band, secret placed only in the
untracked `.env`, and the decision captured as a typed approval record (`approval-ai-audit-provider`) that the
conductor then cited when upgrading S6 from a seam story to a real-implementation story. The interesting property
is directional: a *product requirement change* (seam → live provider) flowed into an already-authorized batch
without renegotiating the batch — the approval record carried the delta. In the baseline arm the same input
would have been a chat message with no artifact for the S6 reviewer to check the security AC against.

**O2-18 — The review layer keeps hitting at the same rate in a new module.** E-AIA S2's reviewer caught a
readiness-check side effect (readiness probe mutated state; fix made it pure, publish stays the sole command
path) and S3's reviewer caught verdict context binding to a mutable event title — the same
immutability-vs-display distinction the snapshot design exists for. Both were design-level catches, not lint;
both were fixed and re-reviewed before gating (S3 took three evidence generations, v1→v3, all preserved). Six
review cycles into net-new modules, the independent-review stage has caught a real defect in roughly every
second story — a stable hit rate that no longer looks like early-codebase luck.

### Cycles 25–28 (E-AIA S4–S6 + closeout) — epic complete; the review layer peaks on the riskiest story

**O2-20 — Review catch density tracked story risk.** E-AIA closed 6/6 with the independent-review layer catching
real defects on four of six stories, and the two catches on S6 (the highest-risk story: live AI provider deciding
publish outcomes) were the epic's most material — a conflicting LOW-risk model output could have auto-approved,
and manual overrides still triggered provider calls. Both would have shipped under test-green-only discipline;
both were design-level, not lint. The owner independently re-scanned the S6 commit for the provider secret (zero
occurrences) — a control the machinery made cheap because the evidence chain names exactly one commit to scan.

**O2-21 — The closeout oracle self-heal is now a pattern, not an anecdote.** E-AIA's epic closeout reproduced
E-SEG's shape exactly: first oracle run FAILED on stale cross-story assertions (S3/S4 tests unaware of what S6
added), the failed evidence was preserved rather than rerun-until-green, a scoped test-only fix landed through its
own mini typed cycle, and v2 passed (39 tests / 11207 assertions across the AI-audit surface). Two epics, same
failure class, same recovery shape — cross-story test staleness at epic close appears to be a structural cost of
per-story worker isolation, and the closeout oracle is the control that pays it down.

### Cycles 29–34 (E-CERT S1–S6) — the guarded-vs-heavy-lane delta, measured

**O2-22 — Retro-applying the heavy lane's epic wrappers to four guarded-lane epics quantified exactly what the
lighter lane missed.** Four independent auditors (codex/opencode split, fresh identities with prior-role
exclusions) ran drift audit, AC↔test trace, test-quality scoring, real-surface smoke, and adversarial boundary
review over E-PKG/E-POOL/E-SEG/E-QRY. Result: **three of four epics CERTIFIED retroactively** — ~30 guarded-lane
gate cycles produced work that passed heavy-lane close criteria without modification — and **one HIGH
production-path defect found** (F-ECERT-S4-F1): returning registrants silently skip TOPIC interest writes because
the real validator classifies already-pooled emails as DUPLICATE and the ingestion service re-validates without
`ignore_member_id`. The defect survived E-SEG's story tests, independent review, epic closeout, AND the E-SEG
suite's 72-test green because the tests stubbed the validator — a masked-by-fake escape that only the heavy
lane's *real-surface smoke* requirement could catch. Nine further findings triaged defer/accepted-risk with typed
owner dispositions. Reading: the guarded lane's per-story controls deliver ~certified quality on most epics at
lower ceremony cost, but the heavy lane's epic wrappers catch a distinct failure class (test-double masking of
production paths) that per-story review structurally cannot — supporting a hybrid dosing: guarded lane per story
+ heavy-lane wrappers at epic close, rather than full BMAD v2 per story. Closure: the fix story landed with a
real-validator regression and an erasure-tombstone guard (8 tests / 57 assertions), an independent reviewer
confirmed the duplicate-poisoning/suppression walls were untouched, and a narrow re-certification flipped E-SEG
to CERTIFIED — end-to-end, the audit-to-certified loop for four epics cost seven typed cycles and found/fixed one
HIGH escape.

**O2-19 — Self-surfaced lane-routing deviation (owner-side).** Prompted by the owner asking "are we using ACEF
1:1, and if so aren't we in the BMAD v2 flow?", an audit of the active run found: the typed control layer IS
running 1:1 (`lane: "guarded"`, every story with actor/scope/evidence/gate records, zero exceptions since Arm 2)
— but `DELIVERY_RULES.md` routes *epic-scale* work to the full BMAD v2 heavy lane, and five epics have now run in
the guarded lane with `laneRationale: null` and no ledgered lane decision. The deviation predates the machinery
install (Arm 1 set the pattern) and survived ~30 typed gate cycles without any control firing, because lane
routing is decided at intake — before the machinery that would check it is bound. Per the goal directive this is
surfaced, not rationalized: the framework lesson is that ACEF's controls enforce the *chosen* lane completely but
nothing audits whether the chosen lane matches the routing table (a missing intake-conformance check — candidate
F-2). Owner decision now pending: record risk acceptance for guarded-lane epics, or promote the remaining backlog
to real BMAD v2 (BMAD-METHOD is installed in the repo; the external codex conductor is not wired to it).

### Framework findings from live deployment (fed back to ACEF itself)

**F-1 — `acef-next` has no conductor-bookkeeping affordance (freeze-compatible bug-fix candidate).** Reproduced
twice on consecutive stories: after a PASS gate, the conductor transitioned the active-run to `phase=closeout,
role=conductor` and the projection still returned `allowed.can_write=false` with `edit_ledger` forbidden — no
reachable phase permits the conductor to write its post-gate ledger row. The agent's response validated the
design intent (it queued the rows and reported rather than editing around the state machine), but the projection
needs a legitimate bookkeeping affordance: either `edit_ledger` allowed in a conductor-role closeout phase, or an
explicit `ledger_bookkeeping` action in the projection's allowed set post-gate. Companion finding to the v2
pilot's precommit-bootstrap gap: both are cases where the state machine models the WORKER's lifecycle completely
but the CONDUCTOR's only partially. Supplement (third data point, E-QRY S4): the gate-phase projection reported
`approve_gate` forbidden while the typed `acef-state gate` command succeeded — the projection and the state tool
disagree about what is permitted, i.e. the projection under-models the state layer's actual affordances rather
than merely lacking one. Fourth reproduction (E-AIA S3): identical `approve_gate`-forbidden-while-typed-command-
succeeds mismatch, now logged inside the gate record itself per standing instruction — the finding is stable
across two epics, two conductors' story styles, and both the ledger-write and gate-approve affordances.
Reproductions 5–7 (E-AIA S4, S5, S6): identical on every remaining story of the epic — the mismatch is fully
deterministic in the gate phase, which upgrades the fix from "affordance gap" to "projection/state-tool contract
divergence" and makes it the top candidate for the first post-freeze framework change.

## Conclusions (first cycle)

1. **The operating model is portable; the machinery is what makes it inescapable.** A disciplined Claude
   conductor reproduced ~90% of ACEF's value by discipline alone (Arm 1) — and then normalized a quality-gate
   bypass 15 times without noticing. The machinery caught that habit on its first story (O2-7).
2. **Projections beat prompts for external agents.** The codex conductor's correct behavior — halting twice,
   refusing premature gates, deriving its own constraints — came from `acef-next`'s typed contract, not from
   the owner's brief (O2-1, O2-4). This held for a non-Claude agent with no ACEF training.
3. **The controls that fired were the cheap ones.** Phase discipline and commit gating produced the catches;
   the expensive ceremony (evidence wrappers) mostly recorded. But the recordings are what made worker death
   (O2-3) and the bypass dispute auditable after the fact.
4. **Cost profile:** ceremony overhead was minutes per story; the two halts each cost one owner round-trip and
   were both correct. Combined with v3's measured +16–26% guarded-lane token premium, the machinery's price is
   real but bounded — and in this cycle it purchased two genuine catches and one habit correction.
5. **Open items for the next cycles:** stale repo selfcheck rules (the bypass-approval treadmill is
   unsustainable — ledgered); AB purchase-dedup UX; the AI-audit gate must flip to fail-closed before E-INV;
   quantitative overhead accounting across multiple stories.

## Deliverable criteria (from the owner's goal sentence)

Every jakomeet change from Arm 2 onward has a corresponding typed ACEF record verifiable in `.acef/` and
`docs/ai/`; violations are surfaced, not rationalized. This report is the comparison artifact.
