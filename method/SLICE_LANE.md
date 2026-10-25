# ACEF Slice Lane (v3) — the default for attended single-team work

> Status: owner decision 2026-10-20 (METHOD-02: "ACEF'i güncelle, yeni repo açmak yerine"), merged to `main`, tag
> `v3.0.0-alpha`. Capability record: `docs/ai/capabilities/slice-lane.json` (`specified`: documented, with standalone
> self-tested scripts; the `/acef` front door selects it in prose, but no installer, hook, or validator routes to or
> enforces it).
> Source: slice-method `2a3ba48` (tag `v0.1.1` = `3951843` plus the METHOD-01 review records), imported unchanged
> at `v3.0.0-alpha`, then split (ACEF-NEUTRAL-01) into a stack-neutral core and stack adapters under `stacks/`.
> Source projects, commits, and short names (REB, CRM, JKM, LL, PLT, SES): `docs/slice-lane/SOURCES.md`.

The Slice lane is the development flow distilled in a source project (REB) after the heavy ACEF flow was retired there
for attended work on 2026-10-07, adopted by a second project (CRM), and run by the coordinator in the 2026-10-19
session (PLT). It is a set of templates, a few scripts, and rules. It has no runtime dependency, no typed run state, no
orchestration engine, and no stack: test, analysis, boundary, and standards commands are the placeholders
`{{test_command}}`, `{{static_analysis}}`, `{{boundary_check}}`, `{{standards_check}}`, filled by a stack profile
(see "Stack profiles"). The full Turkish source text is `docs/slice-lane/README.md`; this page is the English canonical
summary with acef paths.

## Why this lane exists

The source project's evaluation report (REB `observations/ACEF_EVAL_REPORT.md`, commit `056662ba2`, "Nihai yargı",
2026-10-08) measured ACEF against a native flow on the same product:

- Product quality was equal: 7/7 ACEF slices PASS (one after a REVISE round); both native comparison candidates PASS.
- ACEF caught 1 real defect in 7 slices (P03-EDIT-03: typed evidence re-run on a clean tree exposed a flaky race test).
  The rule behind that catch — re-run the evidence on a clean tree with the recorded command — needs no ACEF machinery
  and is kept here.
- The defects were found by the independent reviewer, mutation tests, the real-browser matrix, and the user checkpoint.
- Cost: ~10–20 min and ~0.3M tokens of admission plus closeout per slice, control commits ≥ product commits, 162
  friction items, 70+ manual interventions; 1.72× developer tokens on P03-LIST-01 (Codex client, single data point).
- Limits: one product, one team, one model family, small sample, interrupted sessions in the timings; escaped defects
  were not measured.

This matches the v2 status in `README.md`: the v1 quality edge did not replicate, and the value of the v2 controls lies
in unattended, multi-session, or multi-worker regimes (`method/CONTROL_RATIONALE.md`, "Worker scope" and "Evidence
manifests, runner proof, and gate verdicts" in the pricing model: a skeptical re-run is the stronger backstop when an
observer is present).

## Lane selection

| Situation | Lane |
|---|---|
| Attended single-team work: an owner or coordinator is present, writes the slice, and runs the clean-tree re-run | **Slice lane** (this page), TAM or HAFİF review class by domain |
| Unattended or asynchronous delivery, multi-session work without a standing coordinator, multi-worker fan-out that must be audited later | v2 lanes, unchanged: ACEF Fix / Standard / Full + Baseline or Guarded (`method/DELIVERY_RULES.md`) |

Risk does not move work out of the Slice lane. Money, permissions/tenant, state transitions, migrations, and security
select the **TAM** review class, which raises the review dose (below). Moving attended work to a v2 lane is an owner
decision; nothing promotes automatically. The lane sits beside admission (owner decision 2026-10-20): it does not go
through ACEF admission, typed approvals, `acef-next` model binding, or the Fix counters. Truly tiny contained work still
takes the native short-circuit of `AGENTS.md`; the Slice lane starts where that ends (see "Reconciled v2 statements").

### Sizing from the diff, not the name (owner decision 2026-10-25)

Agents repeatedly sized work by its title ("theme polish" became a slice for a three-line change) and applied full
ceremony to tiny fixes, although the rule already allowed a short path. Sizing is therefore a recorded, fact-based
decision, not a judgement call:

1. **Intake card** (`templates/slice/intake-card.md`): before any work the agent records six facts — expected files
   and directories; money; permissions/tenant; personal data; schema/migration/lock or race path; reversibility.
   Facts only, no recommendation.
2. **Route** from the facts with the routing table, not from the task name. Any risk fact → TAM; no risk fact and a
   small, single-surface, reversible change → **native** (no slice, no ACEF state, focused verification only);
   otherwise HAFİF. The decision is one visible line before work starts — `Yol: native | HAFİF | TAM — <reason>` —
   so the owner can overrule it.
3. **The route sets the ceremony.** Reviewer count, test scope (docs-only checks / affected tests and neighbours /
   full suite at checkpoints), required evidence files and documents are derived from the route through
   `method/control-dosing.json`, not chosen per task. A lighter route must reach the test runner too: a docs-only
   closing never runs the application suite.
4. **The diff confirms the route.** Before merge the actual diff is classified with the same facts (the A7 triage
   questions of `templates/slice/review-checklist.md`). A diff that needs a heavier route than declared stops and is
   re-routed; a heavy route on a trivial diff is reported as over-ceremony. Every route decision and correction is
   logged, so sizing errors become measurable.

### Outcome first (owner decision 2026-10-25)

Work is planned around **outcomes the owner can try** (for example: create project → create task → assign →
complete → persisted), not around prerequisite slices. Slices are the internal parts of an outcome:
- Prerequisites ship with the first outcome that needs them, not as a long chain of separately packaged slices.
- The real user journey is tried in a real browser early, before extensive backend proof.
- Affected checks run during development; the full gate and independent review run at integration points.
- The progress record shows usable outcomes first and infrastructure progress separately.

## Flow

```
coordinator              developer (separate session)    coordinator / reviewer        reviewer (separate session)
backlog -> slice file -> own worktree + port + DB    ->  simplify pass (2b)        ->  independent review
                                                     ->  clean-tree re-run
(numbered acceptance,    red test first, stays in the    (git status empty; the        (TAM: other model family,
 allowed files + usage   allowed list, writes the dev    dev report is not evidence)   mutations, real browser
 scan, review class)     report, never declares PASS                                   1280/390, checklist A–E)
                                         ┌──────────── REVISE <─────────────────────────────┤
                                         v                                                  v PASS
                 fix inside the same allowed list -> targeted re-review (SAME reviewer session, r2) -> closing note
                                                                                         -> merge --no-ff on the owner's
                                                                                            word or written branch policy
                                                                                         -> post-merge: gate + critical set
```

1. **Slice** (`templates/slice/slice.md`, ≤150 lines): task, numbered testable acceptance items (K1…), out of scope,
   allowed-file list built from a `git grep` usage scan, standards compliance table, size and depth, review class. If a
   product question is open, no slice is written; the owner is asked.
2. **Developer** works in an own worktree with an own port and test DB. Behaviour changes start with a red test in a
   separate test-only commit. The developer never leaves the allowed list: they stop, and the coordinator extends the
   list in the slice's dated "Ekler" section. Report: `templates/slice/dev-report.md` (with the pre-review self-check).
   The developer never declares PASS.
2b. **Simplify pass** (coordinator, after the dev report, before the clean-tree re-run; added 2026-10-27 from
   CursorPanel practice). A fresh-context pass over the branch diff with five read-only lenses — reuse (helpers the
   codebase already has, re-implemented), simplification (redundant state, copy-paste with variation, dead branches,
   duplicated tests), efficiency (repeated I/O, N+1, lock scope, work on hot paths), altitude (a symptom patched on
   shared infrastructure instead of the mechanism), cut (additions the accepted requirements do not need:
   unrequested behaviour, options or configuration, speculative extension points, redundant abstraction, demonstrably
   unused code; each reported as `file:line · what · which acceptance item it lacks · usage evidence · confidence`) —
   then ONE behaviour-preserving commit applying the accepted findings, only when at least one finding is accepted
   (never a manufactured cleanup commit), and a written list of the skipped ones. A cut is accepted only when the
   slice owner confirms it is unrequested; uncertain or behaviour-changing removals go to the skip list. Skipped by rule: anything that changes a promised acceptance
   item, weakens a security rule or lies outside the diff (worth keeping → backlog ID). It is quality, not a bug hunt,
   and never replaces the review; a finding that turns out to be a defect goes back to the developer as a fix round
   before the review starts. The allowed list is unchanged; the pass re-runs the touched suites and refreshes any
   contract hashes it invalidates. Budget: about 15 minutes for all five lenses; report unfinished coverage instead
   of stretching it. When: always on FULL (TAM) slices; on LIGHT (HAFİF) slices above about 150 changed lines or when
   the diff touches a shared helper, repeated I/O or a new abstraction (line count is a cost heuristic, not a risk
   class). The skip list and the 2b commit SHA are inputs of the independent review (`templates/slice/review-brief.md`),
   because the reviewer sees a diff the pass changed. Measured basis: CursorPanel 2026-10-26/27, three passes on three slices (core
   #150, #155, #157): two real duplicate pre-boot readers the slice had missed, one data-loss defect (CSV export
   paged by id while sorted by date), about 10–15 minutes per pass.
3. **Clean-tree re-run**: a separate worktree of the candidate commit, `git status --short` empty, every command from
   the dev report → expected → actual, run by the coordinator or reviewer independently of the developer. Record it
   once; later references follow "Evidence validity and reuse" below. `scripts/slice/gate.sh` treats tracked changes
   AND untracked files that
   `.gitignore` does not cover as dirty (only its own log dir is exempt). It never reports PASS when no command ran or
   when a command's output says zero tests ran (unless that command has `"allow_empty": true`), and a control field
   given as a string (`"false"`) is a usage error (exit 2).
4. **Independent review** in a separate session (`templates/slice/review-brief.md` +
   `templates/slice/review-checklist.md`). Verify the claims, not the report. Re-apply every developer mutation and add
   at least one own mutation when mutations apply (see "Review classes"). When a package view/lang/config key changes, scan the hosts for includes
   (checklist B1).
   Verdict: PASS | REVISE — every verdict line outside fenced code reads exactly one of them, and they agree;
   `scripts/slice/codex-review.sh` reads anything else ("NOT PASS", the unfilled "PASS | REVISE", disagreeing lines)
   as a tool error, never a pass.
5. **REVISE** → fix inside the same allowed list → **targeted re-review in the same reviewer session**
   (`templates/slice/review-r2.md`): only the previous findings plus the fix diff. The reviewer who raised the findings
   checks them with its context intact; it is still never the developer's session. Only when that session is gone
   (context limit, crash) does a new reviewer session read the previous report plus the fix diff, and the r2 header
   says so.
   **Round caps** (owner decision 2026-10-25, from B2Press practice): after a second REVISE the coordinator stops
   patching and decides — redesign, split, narrow the scope or simplify; a reviewer's suggested fix is a hypothesis,
   not a specification. From round 3 on, only money, data, permission or flow-breaking findings block; everything else
   becomes a backlog row.
6. **Closing note** (`templates/slice/closing-note.md`): verdict, commits, durations, REVISE rounds, escaped defect,
   explicit tag-candidate judgement, deferred backlog IDs, cleanup. `scripts/slice/metrics.py` reads these fields.
7. **Merge** with `git merge --no-ff`: into `main` only on the owner's word; into owner-approved work branches after
   PASS and a green post-merge run. Post-merge: `gate.sh`, `{{standards_check}}`, affected tests, the project's
   critical set (`slice-method.json` → `critical_postmerge`). The full suite runs only for shared-infrastructure
   changes and at phase/group close.
8. **Phase/group close**: exploration tour (`templates/slice/exploration-tour.md`) by another model family, as a user,
   personas × 1280/390 (a group that touches no UI records a reasoned browser N/A). A group with an open blocking finding is not closed.

## Evidence validity and reuse

These are method and template rules (`documented-only`); no script validates the bindings or grants reuse.

- **One record per execution.** Keep the command, expected/actual result, exit status, test count when applicable,
  and raw-log link in one canonical entry in the existing report or evidence directory. Identify its executor/role,
  candidate SHA, main base SHA and merge-base, test/standards versions (including configuration/baseline), and the
  relevant dependency/lockfile, DB schema/fixture, toolchain and environment bindings. Shared bindings may appear once
  in a report header; an entry names any exception. Record reproducible non-secret versions/configuration, not secrets.
  Missing bindings mean reuse is not justified. Developer entries remain claims until independently reproduced.
- **Keep the first independent clean run.** Every claimed developer command is reproduced in a separate clean
  worktree by the coordinator or reviewer. A developer PASS or log never replaces it. The reviewer checks the
  independent record's provenance, bindings and coverage, makes their own acceptance judgement, and executes all
  required targeted checks (including applicable red-first, mutations and browser checks). Referencing that record
  does not replace independent review or reduce the required reviewers or model-family separation.
- **Reuse only evidence that remains valid.** For an unchanged report or a later handoff, reference the successful
  independent broad-suite entry instead of producing the same run and log again. The person reusing it records the
  current candidate/base/environment, the original entry and why its covered behaviour is unaffected. Same SHA alone
  and equal `range-diff` alone are insufficient; all relevant bindings and coverage must still hold.
- **Invalidate by impact.** A code, base, test/standards, dependency, DB/fixture, toolchain or relevant environment
  change invalidates affected evidence. Rebase/conflict resolution and changes on main require the same impact
  check. Re-run affected checks; if the impact cannot be bounded reliably, run the broader affected suite. Keep the
  old record under its original bindings; never relabel it as a new execution. Required targeted REVISE checks,
  explicit stronger high-risk/TAM or project repeat obligations, and merge/post-merge/phase-close gates still run.
- **No false PASS.** NOT_RUN, zero tests, or failed/incomplete commands are not passing test evidence. A gate's
  explicit `allow_empty` exception for a non-test check does not prove test coverage. Missing required evidence blocks
  PASS; neither a link nor a previous verdict repairs it.
- **One verdict per required reviewer and round.** Its existing `review.md` / `review-r<n>.md` is canonical; each
  reviewer retains their own decision. Slice summaries, checklist/K rows and the closing note link to the canonical
  evidence and current verdict rather than copying logs or rewriting findings. Keep report names, verdict syntax,
  fixed closing/metrics fields and cost fields; a short compatibility summary is a reference, not another review.

## Roles

| Role | Does | Never |
|---|---|---|
| Owner | product decisions, the word for merging to `main`, pushing, going live | — |
| Coordinator | writes slices, opens lanes, extends allowed lists with a date, clean-tree re-run, closing note, merge within policy, backlog/status document, standards baseline | reviews code it wrote; commits to `main` without the owner |
| Developer | red test → code, dev report | edits outside the allowed list, declares PASS, merges |
| Reviewer | clean tree, acceptance items, mutations, browser, checklist, verdict | fixes product code, merges |

Developer and reviewer are never the same session. Without subagents, run the steps in order but use a separate
session or `scripts/slice/codex-review.sh` for the review.

## Review classes (by domain, not by line count)

| Class | When | What |
|---|---|---|
| **TAM** (full) | money, permissions/tenant, state transitions, migrations, security; hot/shared files | separate session; another model family (Codex) **mandatory for money and migration slices**, recommended for other TAM; a second reviewer for browser and mutations; **3–5 mutations per new or changed rule**; real browser 1280/390 including error paths when the slice touches UI; checklist A–E; TAM annex (finding discipline, Cloudflare MIT derivative) |
| **HAFİF** (light) | test-only, docs, tooling, catalogue screens, translations | one independent review; **one mutation per behaviour change**; browser evidence when the slice touches UI (reasoned N/A otherwise, below); checklist A (+ B/C when relevant); similar small slices may be combined |

Applicability (both classes):

- **Browser / real-UI check** only when the slice touches UI: a route, a view/template, or a UI component. Otherwise it
  is `not applicable: no route/view/component touched`.
- **Mutations:** 3–5 per new or changed rule only for TAM. HAFİF: one mutation per behaviour change; no new or changed
  behaviour means `not applicable: <reason>`.
- **Re-review** after REVISE runs in the same reviewer session (step 5), not a new one.

Record each applicability decision in the slice and dev report; the independent reviewer confirms it in the review. A
skipped applicable check is never N/A. These exceptions do not relax TAM requirements, including the mandatory
different model family for money and migration slices.

Always required, in both classes — the core this lane keeps from ACEF:

1. numbered, individually testable acceptance items;
2. a scanned allowed-file list (dated additions only);
3. a clean-tree re-run of every claimed command before review;
4. an independent reviewer in a separate session (never the developer's);
5. mutations — TAM 3–5 per new or changed rule, HAFİF one per behaviour change — each with an evidence file, re-applied
   by the reviewer plus one of their own; otherwise the applicability reason above;
6. real-browser evidence of the new scenario from its real entry point when the slice touches UI; otherwise the
   applicability reason above;
7. a targeted re-review in the same reviewer session after REVISE;
8. a closing note with the fixed fields.

## Parallel lanes

- At most **5 development lanes** and **2 heavy test/browser slots** (single-slot tools such as browser E2E suites: 1). Lane
  count = number of slices that are independent right now; dependent slices run in sequence.
- Every lane: own worktree, own port (`lanes.port_from–port_to`), **own test DB** (`lanes.db_pattern`, the name contains
  `testing`), own `TMPDIR`. The owner's preview port and DB belong to the owner only.
- One writer per hot file per wave (`templates/slice/locks.md`); other lanes extend through traits/partials/events;
  rebase before review; one merge queue.
- Shared record files are per slice (report, standards note `baseline-notes/<ID>.md`, questions); only the merger
  writes the shared standards baseline and the CHANGELOG.
- An agent past 90 minutes is checked; without progress it is restarted with a narrowed task and logged in
  `interventions.json` (`schemas/slice-interventions.schema.json`).

## Cost accounting

The lane's cost is measured per slice, not estimated. The dev report's "Maliyet" section
(`templates/slice/dev-report.md`) carries:

| Field | Who fills it | What |
|---|---|---|
| `Duvar-saati-geliştirme-dk` | developer | wall-clock minutes from the developer's start to the dev report |
| `Duvar-saati-dilim-dk` | coordinator, at close | wall-clock minutes from the slice file to the closing note (all rounds) |
| `Token-geliştirici`, `Token-inceleme`, `Token-koordinatör` | each role, own session | `<in>/<out>` totals as the client or API reports them (re-review included in `Token-inceleme`) |
| `Token-toplam` | coordinator, at close | sum of the three |
| `Ölçüm-kaynağı` | whoever fills a number | where it came from (client usage command, API usage, log) |

A value that was not measured is written `ölçülmedi`, never guessed. The closing note's `Süre-geliştirme-dk` and
`Süre-inceleme-dk` stay what `scripts/slice/metrics.py` reads; the cost fields let a phase compare the lane's real cost
(wall time and tokens per slice) with the v2 lanes'.

## Never

- Commit or merge to `main` without the owner's word; push without the owner's word; force-push.
- Use a shared DB, the owner's preview port/DB, or another lane's DB.
- `git stash` inside a worktree; `git add -A` (add by name).
- Make tests green by loosening a test, timeout, or assertion; report a failed or skipped step as passed.
- Declare your own code PASS; treat the dev report as evidence.
- Put production data into the repo, evidence, chat, or an external service.
- Leave an exception unwritten (a standards deviation missing from the slice's compliance table = REVISE).

## Stack profiles

The core never names a language, framework, or tool. Every stack-specific command in the templates, the example
`slice-method.json`, and the gate is a placeholder:

| Placeholder | Meaning |
|---|---|
| `{{test_command}}` | the project's automated tests (with a selector for the slice's tests) |
| `{{static_analysis}}` | type checker / linter whose findings gate a merge |
| `{{boundary_check}}` | module/package dependency ratchet (`true` when the stack has none, said so in the profile) |
| `{{standards_check}}` | standards ratchet: the core engine `scripts/slice/standards-check.sh` with the stack's rules |
| `{{project}}` | the application's name in examples (DB patterns, package prefixes) |

A stack profile (`stacks/<stack>/profile.json`, schema `schemas/stack-profile.schema.json`) fills the four command
placeholders plus optional keys used by the review checklist (`route_list`, `app_shell`, `migrate_roundtrip`,
`browser_smoke`, …). An application points at its copy with `slice-method.json` → `"stack_profile"`;
`scripts/slice/gate.sh` expands `{{key}}` in `gate.commands[].run` from it (or from `--profile` /
`SLICE_STACK_PROFILE`) and resolves every command before running any: an undefined or empty key, a key that is not
lower snake_case, or a `{{…}}` left after expansion exits 2. `scripts/slice/standards-check.sh` adds the profile's
`standards.tool_error_patterns` to its tool-error wording (an invalid rule or profile pattern is exit 2); `gate.sh` adds
`gate.zero_tests_patterns` to its zero-tests check; `scripts/slice/metrics.py --profile` reads the profile's
`metrics` object; `scripts/slice/selfcheck.sh` runs an adapter only when its `selfcheck.requires` toolchain is present
(or `--stack <name>`). Adding a stack: `docs/slice-lane/adoption.md` ("Adopt in a new stack").

## Files in acef

```text
method/SLICE_LANE.md                 this page
templates/slice/                     slice, dev-report, review-brief (+ TAM annex), review-checklist (A–E), review-r2,
                                     closing-note, invariants-skeleton, locks, module-CLAUDE, exploration-tour
scripts/slice/gate.sh                runs slice-method.json gate.commands, {{placeholders}} from the stack profile;
                                     one summary line; exit 0/1/2/3
scripts/slice/standards-check.sh     standards ratchet engine; rules from the stack adapter
scripts/slice/codex-review.sh        read-only review call with a required model (other model family)
scripts/slice/metrics.py             measurement table from slice/review files and git history (--profile)
scripts/slice/selfcheck.sh           the lane's own gate: syntax, templates, core + adapter self-tests, metrics
                                     fixture, and a scan that the core names no stack or source project
scripts/slice/tests/                 gate (incl. placeholders, zero tests), codex-review, standards-check (incl. regex errors),
                                     schema types, selfcheck self-tests + metrics fixture
schemas/slice-method.schema.json     project declaration (slice-method.json, incl. "stack_profile")
schemas/stack-profile.schema.json    stack profile (the four required placeholders)
schemas/slice-interventions.schema.json  intervention log
docs/slice-lane/                     README (Turkish source), adoption (incl. "Adopt in a new stack"), TEST-RUN (owner
                                     walkthrough for a first real run), open-questions,
                                     SOURCES (the only place source projects are named), examples/
stacks/<stack>/                      adapter: profile.json, gate.sh wrapper, boundary checker, standards rules,
                                     checklist commands, examples, tests (list: the adapter's README)
archive/slice-lane/                  METHOD-01 reviews, metrics demo 2026-10-19, slice-method CHANGELOG (provenance)
LICENSES/security-audit-MIT.txt      Cloudflare MIT text for the TAM annex derivative
```

The scripts are written to be copied into an application's `scripts/`; their defaults assume that app layout, and the
self-tests pass explicit paths. The scripts are not installed by `scripts/install-acef-tools`.

## Adoption in an application

Since 2026-10-25 the kit installs with one command and updates safely. The record keeps the selection; an update
replaces only ACEF files the host has not edited (edited ones are kept and reported) and never overwrites host
configuration:

```sh
node $ACEF/scripts/install-acef-skills --repo <app> --profile slice            # one tool (default codex) + 4 skills
node $ACEF/scripts/install-acef-slice-kit --repo <app> --stack <stack>          # templates, method snapshot, scripts
ACEF_SOURCE=$ACEF node $ACEF/scripts/update-acef-installation --repo <app>    # later: same selection, no BMAD guard
```

`--skills-dir <dir>` (with one `--tool`) installs skills where the host's agent reads them (for example
`.agents/skills`). `docs/ai/ACEF_INSTALLATION.json` holds no machine paths or install times; those live in the
self-ignored `.acef/local/`. The manual steps below remain the reference for what the installer does:

```sh
ACEF=/path/to/acef; STACK=$ACEF/stacks/<stack>
cp -R $ACEF/templates/slice <app>/docs/slices/_templates
cp $ACEF/docs/slice-lane/examples/slice-method.example.json <app>/slice-method.json   # {{project}}, paths, commands
cp $STACK/profile.json <app>/scripts/stack-profile.json                              # "stack_profile" points here
cp $ACEF/scripts/slice/{gate.sh,standards-check.sh,codex-review.sh,metrics.py} <app>/scripts/
cp $STACK/standards/rules.example.json <app>/scripts/standards/rules.json            # + the adapter's other files
<app>/scripts/standards-check.sh --print-baseline <app> > <app>/scripts/standards/baseline.txt   # merger, clean main
<app>/scripts/gate.sh <own worktree path>
python3 -I <app>/scripts/metrics.py <app>/docs/slices --backlog <app>/docs/backlog.md --profile <app>/scripts/stack-profile.json
```

Adoption status of the source projects at import: `docs/slice-lane/SOURCES.md` ("Adoption status at import"). The
lane's own gate: `bash scripts/slice/selfcheck.sh`.

## Enforcement honesty

In `method/RULE_ENFORCEMENT_MAP.md` terms: the gate, standards ratchet, and module-boundary ratchet are **machinery**
inside the application; the independent reviewer is a **shard** (a fresh session with a brief) and the targeted re-review
continues that shard; the allowed-file list, the "never" list, and the closing note are **documentation-only** until the planned
closing-note gate exists. No ACEF hook or validator enforces this lane.

## Planned (v0.2) and open (v0.1.2)

Planned from the measurement demo (`docs/slice-lane/open-questions.md`, `archive/slice-lane/metrics-2026-10-19.md`):

1. **Closing-note gate** — `scripts/slice/closing-check.sh <slice>` before merge: closing-note fields filled without
   placeholders and `Durum: KAPANDI`, otherwise no merge (REB: only 3 of 25 closing headings were filled).
2. **REVISE reason enum** — a fixed `reason` column in review findings: `ürün-hatası | test-boşluğu | spec-metni |
   izinli-liste | ortam | standart`; `metrics.py` prints the distribution (175 REVISE reports in REB are
   unreadable by reason today).
3. **Time/token header** — line 3 of every review report: `Süre: <min> · Token: <in>/<out> | ölçülmedi`; `metrics.py`
   reads it instead of the git-timestamp proxy.

Open low-severity items from `archive/slice-lane/METHOD-01-review-r2.md` (non-blocking, v0.1.2):

- **R1** — `docs/slice-lane/SOURCES.md` LL row: give the last commit per file (docs/standards `7cf9936`,
  gate `9f953e4`, standards-check `7bf90faa`, baseline `fad01981`).
- **R2** — `docs/slice-lane/open-questions.md` #8 and `SOURCES.md` ("Adoption status at import"): cite `COORDINATOR-STATE-2026-10-19.md:29` and
  `OVERNIGHT-2026-10-17.md:81` for the LL push claim.
- **R3** — `scripts/slice/standards-check.sh`: apply the "No such file or directory" heuristic only when `count_regex`
  matched nothing; add review case E to the self-test.
- **R4** — `LICENSES/security-audit-MIT.txt` carries a provenance header, so SOURCES' "(aynen)" is inaccurate: move the
  header to a NOTICE/README or reword to "(licence text verbatim, provenance header on top)".
- **FIX03-R5** (pre-existing, from the PR #4 review) — `scripts/slice/standards-check.sh` reads the rule TSV with
  `IFS=$TAB`; tab is IFS whitespace, so an empty field (empty `label`, empty `run`) shifts the fields after it, and a
  missing `label` moves `requires` into LABEL, which skips the prerequisite check. Fix: a non-whitespace separator or
  per-field defaults in the parser, plus a self-test.

## Reconciled v2 statements

Owner decision 2026-10-20 (relayed by the coordinator: "admission yanında ayrı hat"): the Slice lane is a lane
**beside admission**. It is the default for attended, single-team, owner-present work and does not go through ACEF
admission, typed approvals, `acef-next` model binding, or the Fix counters. The v2 admitted lanes (Fix / Standard /
Full, Baseline or Guarded) remain for unattended, multi-worker, or unsupervised delivery. The v2 text is kept; a
"Slice lane exception" sentence next to each statement applies the decision. Line numbers are on `main` at tag
`v3.0.0-alpha`.

Interpretation (owner may override): the decision defines the lane by attendance, not size, and does not retire the
native short-circuit. Truly tiny reversible one-boundary/one-surface work therefore stays native; the Slice lane starts
where native ends, for attended work that would otherwise be admitted. Rows marked ¹ rest on this reading.

| v2 statement (file:line) | v2 statement | Was in conflict with the Slice lane | Reconciled: exception at |
|---|---|---|---|
| `AGENTS.md:9` ¹ | reversible one-boundary/one-surface work uses the native workflow, no ACEF artifacts | the lane did not say whether tiny work still goes native or becomes a HAFİF slice | `AGENTS.md:12` |
| `AGENTS.md:31` | start ACEF (admission) for persistence/migration, security/permissions, money, state machine, multi-session coordination … | the lane handles exactly these attended cases as TAM slices without admission | `AGENTS.md:34` |
| `AGENTS.md:44`, `method/DELIVERY_RULES.md:64`, `method/OPERATING_MODEL.md:358` | every admitted actor binds the model/effort printed by `acef-next` (provider-neutral routing policy) | the lane picks the reviewer model via `REVIEW_MODEL` / `slice-method.json` and `codex-review.sh`; no `acef-next` | `AGENTS.md:47`, `method/DELIVERY_RULES.md:71`, `method/OPERATING_MODEL.md:365` |
| `AGENTS.md:57`, `method/DELIVERY_RULES.md:199` | review remediation capped at two cycles; two consecutive non-PASS → `REPLAN/SPLIT` | the lane has no circuit breaker; REVISE → r2 → r3 … without a cap | `AGENTS.md:58`, `method/DELIVERY_RULES.md:203` |
| `method/DELIVERY_RULES.md:14` ¹, `:56` | native is the default for contained work; ACEF Standard handles scoped work with independent review | for attended work the lane, not Standard, is the default for scoped work with independent review | `method/DELIVERY_RULES.md:17`, `:60` |
| `method/DELIVERY_RULES.md:93` | preflight artifact before any admitted lane executes | the lane has no preflight artifact; the slice file plays that role | `method/DELIVERY_RULES.md:97` |
| `method/DELIVERY_RULES.md:111`, `:113` | small feature → ACEF Standard; large feature/epic → ACEF Full by default | attended features and epics run as slices grouped into phases with an exploration tour | `method/DELIVERY_RULES.md:116` |
| `method/GUARDED_LANE.md:15`, `:97` | at epic scope ACEF Full is the default; non-Full Guarded epics need typed human approval | attended risky epics run as TAM slices without typed approval records | `method/GUARDED_LANE.md:17`, `:101` |
| `method/OPERATING_MODEL.md:42` ¹, `:329` ¹ | admission: contained work native, everything needing controls admitted to ACEF | same question as `AGENTS.md:9/31` | `method/OPERATING_MODEL.md:45`, `:331` |
| `method/OPERATING_MODEL.md:375` | Fix: the same reviewer may do one delta recheck; one review cycle | the lane's re-review runs in the same reviewer session but may repeat (no cycle cap) | `method/OPERATING_MODEL.md:379` |
| `method/OPERATING_MODEL.md:378` | Fix: 30-minute hard stop, 4 commits, 5 files, 50 lines | the lane checks an agent at 90 minutes; size is bounded by the ≤150-line slice and the allowed list, not by counters | `method/OPERATING_MODEL.md:379` |
| `method/BMAD_V2_LANE.md:6` | small/ongoing work uses ACEF Standard | see `DELIVERY_RULES.md:56` | `method/BMAD_V2_LANE.md:8` |
| `README.md:169` ("Install & use", step 3) | `/acef` selects Fix, Standard, or Full for admitted work | the front door (`skills/acef/SKILL.md`) did not know the Slice lane | `README.md:172`; front door: `skills/acef/SKILL.md:34` (step 2) and `:45` ("Slice lane selection", read before the admission short-circuit) |

The H1 banners of `AGENTS.md`, `method/DELIVERY_RULES.md`, `method/OPERATING_MODEL.md`, `method/GUARDED_LANE.md`,
`method/BMAD_V2_LANE.md`, and `method/CONTROL_RATIONALE.md` point here. The condensed copies under
`skills/acef/references/` are not changed; `/acef` reads the Slice lane selection in `SKILL.md` before them.

Consistent, not conflicting: `method/CONTROL_RATIONALE.md:199` and `:205` (worker scope and evidence manifests earn
their cost when work is delegated, unattended, or later-audited; a skeptical re-run is the stronger backstop) — this is
the rationale for the lane split above. `method/GUARDED_LANE.md:21` (human push approval) matches the lane's "never push
without the owner".
