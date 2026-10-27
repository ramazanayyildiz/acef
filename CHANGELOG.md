# ACEF Changelog

This file is the human-readable history of ACEF's framework changes. Git remains the exact source of truth, and
`docs/ai/capabilities/*.json` remains the layer-by-layer truth for whether a capability is documented, wired, enforced,
proven, or installed.

Update this file in the same PR whenever ACEF itself gains or changes a flow, gate, validator, hook, skill, installer behavior, workflow,
or evidence contract. Do not use it to claim implementation status; link to the capability record for that.

## v3.0.0-beta.6 — Host product-review origin is binding (2026-10-27)

Found by the first host's Codex host-safety review of its beta.5 update: `run.productReviewOrigin` (or the active run's)
overrode the host-owned `.acef/product-review-policy.json` `browserOrigin`, so a report from another local port passed
once a run pinned it. Now the host pin is binding: a run or active-run origin that differs from it is refused
("conflicts with the host product-review policy"); without a host pin, a run and active-run pin that disagree are
refused. Test: `scripts/test-acef-product-review` (fails without the fix). Owner decision 2026-10-27 (beta.5 rollout).

## Unreleased — Host fork gates ported upstream; updates keep host-modified files (2026-10-27)

Owner decision 2026-10-27: roll `v3.0.0-beta.4` out to every host. One host held its update because the updater would
have removed three gates its own ACEF fork carries and upstream lacked, and overwrote its host-local model choices.
- **Ported gates** (fork commits → upstream; every fork commit not in upstream main is ported; the fork's merge commit
  53543e3 was a clean auto-merge of upstream d7a31ba and adds nothing):
  - 6dcda63 opt-in `running-product-review-v1` (Standard + Guarded): terminal PASS needs a same-run independent
    reviewer session, hash-bound browser artifacts, explicit product checks and the current scoped application tree
    (`scripts/lib/acef-product-review.js`, called from `checkLightweightLifecycle`); glob scopes (`app/**`) now resolve
    against tracked files in `applicationTreeDigest` of both `acef-process-validator` and `acef-state`
    (`scripts/lib/acef-scoped-tree.js`) instead of hashing as `<missing>`, so a source change invalidates old evidence.
  - d97a3ec `**/` also matches zero directories (root files count in the scoped identity).
  - e006745 structured `componentReuse.reuseAudit`; actor separation, gate integrity and surface evidence accept the
    same-run independent Code Reviewer for the opted-in run (no fictitious Process Judge).
  - 5aaf9d7 objective accounting counts reviewed application trees and revalidates the product report on completion.
  - 200259d `acef-state objective-control-budget`: one audited, finite control-time extension for one named next run.
  - 3f66df7 canonical root: the BMAD hard wall, dispatcher and OpenCode plugin bind discovery to the repository that
    holds `.acef/CANONICAL_ROOT`, so a passive lifecycle record in a subdirectory cannot pick the wrong root; the
    updater writes the marker when it installs the guard.
  - Made neutral on the way in: any loopback review origin is accepted unless the run, the active run or the host-owned
    `.acef/product-review-policy.json` pins one (the fork hard-coded its own port); method doc
    `method/RUNNING_PRODUCT_REVIEW.md`, capability `docs/ai/capabilities/running-product-review.json`. The fork's
    pilot workflow, its model defaults and its AGENTS.md override were not ported (host configuration, not fixes).
- **Updates keep host-modified files.** `install-acef-tools`, `install-acef-bmad-guard` and `install-acef-skills`
  record the sha256 of every file they write (`components.<name>.files` in `docs/ai/ACEF_INSTALLATION.json`, as the
  Slice kit already did) and replace a file only when the host copy still equals that hash; otherwise they keep it and
  print `kept host-modified <path>`. Records without hashes compare against the file at the recorded install commit,
  read from the recorded ACEF checkout (the updater passes it on as `ACEF_PREVIOUS_SOURCE_PATH`) or this one; with no
  baseline the host copy is kept and reported. Skills are written file by file (no more `rm -rf` of the skill folder).
  `.acef/model-routing-policy.json` is merged three-way against the ACEF policy it was installed from (read at the
  recorded install commit when that commit is in this ACEF checkout's history): a value the host never changed follows
  the new ACEF value, a value the host changed stays, new keys are added, and both lists are printed. An install from
  a commit outside this history (a host fork) has no baseline, so all its values count as host choices. An invalid
  merge leaves the host file untouched. The `.cjs` wrapper that older installs put next to a Python tool is removed
  only when it is still ACEF's copy, otherwise kept and reported. The Slice kit no longer records a kept host copy's
  hash as ACEF-installed.
- **Non-ASCII paths in the scoped identity** (review finding on this PR): glob scopes list files with
  `git ls-tree -z`, because git quotes non-ASCII names by default and `app/**` missed e.g. `app/İşlem.php`, so a
  change to it kept the old digest. The hashed text is unchanged for ASCII paths, so their existing digests stay
  valid; scopes containing non-ASCII files get a new digest once. Because `-z` output is unquoted, a scope whose
  scopes or paths contain a newline is hashed with a NUL-framed, versioned payload instead (a name such as
  `app/a\n100644 blob <B>\tapp/b` could otherwise hash like two files); all other digests keep the plain form. The full-tree identity filters control records on
  the unquoted path (its hashed text is unchanged).
- Tests: `scripts/test-acef-product-review`, `scripts/test-acef-product-review-accounting`,
  `scripts/test-acef-canonical-root` (ported), `scripts/test-acef-host-file-preservation` (new; policy upgrade vs
  host override, fork install, stale `.cjs`), non-ASCII scope cases in `scripts/test-acef-product-review`.

## Unreleased — Changelog rule and feedback-log capability record (2026-10-27)

Owner decision 2026-10-27: "is it written that CHANGELOG must be updated?" It was not; only this file's header said so.
- `AGENTS.md` → **Changelog**: every PR touching method/scripts/templates/schemas/skills adds an entry here (what, date,
  why, owner decision); new capabilities get a `docs/ai/capabilities/` record; bundles are tagged.
- `scripts/slice/selfcheck.sh`: fails a branch that changes those folders against the origin/main merge base without
  touching `CHANGELOG.md` (skipped, and says so, without origin/main); also checks the new template fields.
- `docs/ai/capabilities/central-feedback-log.json` (status `wired`) for the 2026-10-27 feedback log.
- The sections released in tag `v3.0.0-beta.4` are renamed from "Unreleased" to "v3.0.0-beta.4".

## v3.0.0-beta.4 — Central feedback log and version checks (2026-10-27)

Owner decision 2026-10-27, after two hosts kept separate observation logs nobody read. Design from two independent
consultations (Fable, Codex Astra), merged:
- **`scripts/acef-note`** (+ `scripts/test-acef-note`, 24 checks): one machine-wide store (`ACEF_FEEDBACK_DIR`, default
  `~/CODE/acef-feedback`), one append-only file per project, one-line entries with a closed tag list, locked appends,
  `--repeat`/`--retag` instead of edits, bounded `search`, `status`, `version`/`check` stamps so a reader skips the log
  when nothing changed, `due` and `digest` for the weekly loop, `rules/R-<n>.md` with cost, review date and activation.
- **`scripts/acef-version-check --repo <host>`**: exit 0 current, exit 1 behind with the CHANGELOG headings added since
  the installed commit, exit 2 no record or unknown commit.
- **`method/FEEDBACK_LOOP.md`**: when to write (threshold), who writes (coordinator funnel), when to read (intake,
  review brief, before shared-infrastructure changes; at most five entries), session-start checks, rule files.
- **`install-acef-tools`** installs `acef-note` and `acef-version-check` into `.acef/bin/`; Python tools are copied as they
  are (the Node `.cjs` wrapper is only for Node tools).
- **Templates:** intake card `Bilinen tuzaklar: <ids> @<stamp>`; review brief carries it and asks for one
  `ACEF-gözlem:` line; developer report gets an "ACEF gözlemi" section; closing note an `ACEF-gözlem:` field.

## v3.0.0-beta.4 — Test budget: merge batch and reviewer rule (2026-10-27)

- `method/SLICE_LANE.md` → Test budget:
  - Several TAM PRs that passed review are covered by one full suite on the combined head, provided they then merge back-to-back with nothing in between. Any other merge, or any change to a PR, voids the run.
  - Reviewers never run the full suite in any round; the integration run is the only full run. This makes explicit what the table already implied (owner request, 2026-10-27).

## v3.0.0-beta.4 — Test budget, contract set, rule cost and expiry (2026-10-25)

Owner decision 2026-10-25, from two hosts that independently cut their full-suite runs from 2–4 per slice:
- **`method/SLICE_LANE.md` "Test budget".** The developer and the reviewer never run the full suite. Integration runs
  one full suite on the final head merged with main (TAM) or one per batch (HAFİF). A nightly full suite, full race and
  all browser scripts run on main and are compared night to night. Affected tests are chosen by a script, which falls
  back to a wider set on unmapped files. The suite runs on the production OS at least nightly.
- **`contract_tests`** in `slice-method.json`: the cross-cutting tests a slice in those areas runs on its final head,
  instead of a full suite per round.
- **`method/FEEDBACK_LOOP.md`.** Every rule added after an incident states its cost (for example "+1 full suite per
  round") and a review date, and is kept, narrowed or removed with numbers.
- Pending measurement, about a week, both hosts: the affected-tests script (or `route.py` printing the list) and runner
  settings (worker cap, batch size, slow-first).

## v3.0.0-beta.4 — route.py: size and test fixes from the first host run (2026-10-25)

- **Log failures no longer look like a stop.** A failed decision-log write printed the verdict and then exited 1, the
  ROUTE_UP code. Now the write is caught, `LOG_FAILED` goes to stderr, and the exit is 2 (operational). ROUTE_UP keeps
  exit 1. Found by Codex reviewing B2Press METHOD-05.

From B2Press running `route.py check` read-only over six merged slices:
- **Size counts code, not evidence.** Docs paths and the new `routing.exclude_paths` no longer count for size. Before,
  one slice counted 909 files because of its evidence folder and could never be native.
- **Tests count as tests.** Risk rules apply to code only; `routing.test_paths` (core default: `tests/`, `__tests__/`,
  `*.test.*`, `*.spec.*`; the Laravel profile adds its test-file suffix) are exempt. A tests-only slice touching a
  payment test is no longer forced to TAM.
- **Host rules extend the stack's by default.** `routing.risk_paths_mode: "extend" | "replace"`. Before, naming a fact
  in `slice-method.json` silently dropped the stack patterns for that fact.

## v3.0.0-beta.4 — Route script and diff check (2026-10-25)

Owner decision 2026-10-25: sizing is enforced by a script, not left to prose. `scripts/slice/route.py card` turns the
intake card's six facts into `Yol: native | HAFIF | TAM — <reason>`. `scripts/slice/route.py check --base <ref>
--declared <route>` classifies the real diff with path rules per risk fact (money, permissions, personal data,
schema): **ROUTE_UP** (exit 1) when the diff needs a heavier route, **OVER_CEREMONY** (warning) for TAM on a docs-only
diff. Decisions append to a JSONL log, so sizing errors become measurable. Path rules are a floor, not proof:
reviewers still answer A7.
- `routing` is added to both schemas; `stacks/laravel/profile.json` ships default risk paths. Hosts may extend them in
  `slice-method.json`.
- Tests: `scripts/test-acef-slice-route`; `selfcheck.sh` passes (116/116, neutrality scan clean).
## v3.0.0-beta.4 — Installer: profiles, deterministic record, remembered selection, Slice kit (2026-10-25)

Owner decision 2026-10-25, from the selective Foundation install (21 files instead of about 170) and its gap list.
- **Deterministic record.** `docs/ai/ACEF_INSTALLATION.json` no longer stores the absolute source path, the branch or
  install times. Those move to the self-ignored `.acef/local/installation.local.json`, and readers overlay it.
  `updateCommand` is portable: `node "$ACEF_SOURCE/scripts/update-acef-installation" --repo . …`. A repeat install of
  the same selection leaves the record byte-identical.
- **Profiles.** `--profile slice|core|full`:
  - slice = one tool (default codex), the skills acef, acef-adapter, acef-router and map-codebase, and the Slice kit;
    no `.acef` runtime and no BMAD guard;
  - core = tools + skills, no guard;
  - full = the previous behaviour.
- **Remembered selection.** `update-acef-installation` reuses the recorded profile, tools, skills and skills directory.
  A record without a profile is treated as `full`, so existing hosts update exactly as before.
- **`--skills-dir`** for one tool (for example `.agents/skills`).
- **`scripts/install-acef-slice-kit`.** Templates, a method snapshot stamped with the source commit, and the four
  slice scripts, tracked by hash: a host-edited copy is kept and reported. `slice-method.json` and the stack profile
  are written only when missing.
- **CI** now also runs `scripts/test-install-acef-*`, which the `test-acef-*` glob skipped. New
  `scripts/test-acef-install-profiles`.
- **Host migration (one-time, optional).** B2Press and CursorPanel can move to the slice profile with
  `install-acef-skills --profile slice --tool …` plus `install-acef-slice-kit`, then commit the new record. Nothing
  changes until a host opts in.
## v3.0.0-beta.4 — Sizing from facts, outcome-first planning, round caps, feedback loop (2026-10-25)

Owner decision 2026-10-25, from the owner's collected agent notes (13–24 Oct) and the B2Press/Foundation/CursorPanel
sessions.
- **Sizing from the diff, not the name.** A new `templates/slice/intake-card.md` records six facts (files, money,
  permissions/tenant, personal data, schema/migration/lock, reversibility). A routing table turns them into native,
  HAFİF or TAM, and a one-line `Yol:` decision is visible before work. The route sets the reviewer count, the test
  scope and the evidence through `method/control-dosing.json`; a docs-only closing never runs the application suite.
  Before merge the diff is re-classified with the A7 questions, and corrections are logged. The routing script and
  the diff check ship separately.
- **Outcome first.** Plan around outcomes the owner can try. Prerequisites ship with the first outcome that needs
  them. Try the real browser early; run affected checks during development and the full gate at integration.
- **Round caps.** After a second REVISE, redesign, split, narrow or simplify. A reviewer's fix is a hypothesis. From
  round 3, only money, data, permission or flow-breaking findings block.
- **Slice template.** Every acceptance item cites its source (answer number or spec line). A shape budget (lines per
  file, new classes, reuse-first list) and the route line are added.
- **`method/FEEDBACK_LOOP.md`.** A weekly digest groups observations by failure mode and proposes at most three rule
  changes. The owner decides; each change is measured and reverted if it shows no effect.

## v3.0.0-beta.4 — 2b cut lens, security checklist rows, maintenance scan pilot (2026-10-25)

Owner decision 2026-10-25 (Ram), after proposals from the JakoMeet/CRM, B2Press and Foundation sessions, reviewed by
Claude Fable and Codex gpt-6-astra:
- **2b changes:**
  - a fifth **cut** lens (unrequested behaviour, speculative extension points, redundant abstraction, unused code; a cut
    needs the slice owner's confirmation);
  - a ~15 min budget;
  - a commit only when a finding is accepted;
  - on LIGHT also when the diff touches a shared helper, repeated I/O or a new abstraction;
  - the skip list and the 2b SHA are review inputs.
- **Review checklist:**
  - **A7** security triage on every slice, LIGHT included (one "yes" without a D answer reclassifies the slice to TAM);
  - **D3** widened to tenant identity across caches, queues, exports, files and derived copies;
  - new **D7** authorization trace, including async paths and the weakest parallel path;
  - new **D8** data exposure;
  - an unresolved critical security question blocks closure.
- `method/MAINTENANCE_SCAN.md`: pilot contract (not a lane) for release-gate and finished-repo scans. Mechanical checks
  run first; one module reviewer from a different model family; no fixes inside the scan; budgets and stop rule;
  promotion only after measured runs.

## v3.0.0-beta.4 — Slice lane: simplify pass (2026-10-27)

Owner decision 2026-10-27 (CursorPanel): a **simplify pass** (step 2b in `method/SLICE_LANE.md`, Turkish in
`docs/slice-lane/README.md`) runs after the developer report and before the clean-tree re-run and the independent
review. Four read-only lenses (reuse, simplification, efficiency, altitude), one behaviour-preserving commit, a written
skip list; defects it surfaces return to the developer first. Measured on three CursorPanel slices (#150, #155, #157):
two missed duplicate readers and one data-loss defect, ~10–15 min per pass. Templates unchanged; the dev report's
pre-review self-check may reference the pass's commit.
## Slice evidence reuse and canonical references (2026-10-20)

Documentation/templates only, based on main `bdee785`: one canonical record per execution and one verdict per required
reviewer/round. Bind evidence to commands/results/logs, candidate/main/merge-base, test/standards and relevant
dependency/DB/fixture/toolchain/environment versions. Reuse a valid independent broad run by reference; invalidate
affected evidence after changes, and broaden checks when impact cannot be bounded. Same SHA or range-diff alone
does not establish validity. Never relabel an old run as a new one.

The first independent clean run, independent review and its required targeted checks remain. Reviewer counts/model
requirements, HAFİF/TAM, mutation dose, applicable browser acceptance, stronger high-risk repeats and merge gates do
not change. Slice/checklist/closing summaries reference evidence/verdicts rather than copying logs/findings. Existing
report names, verdict syntax, metrics closing fields and cost fields remain; unmeasured values are not estimated.
No runtime, schema, installer, automation or metric consumer changes; no measured savings claimed.

Capability record: `docs/ai/capabilities/slice-evidence-reuse.json` (`documented-only`).

## ACEF-FIX-03 — no false PASS from zero tests or invalid regex; applicability and cost fields (2026-10-20)

On top of `e7afe40` (`fix/slice-fail-closed-20261020`, entry below), which already refuses string booleans in gate
controls and fails on regex errors. Red-first: tests in a separate commit.

- `gate.sh`: a gate in which no command ran is `GATE FAIL` (was `GATE PASS pass=0`, e.g. every command `full_only` in a
  light run). A command that exits 0 but whose output says zero tests ran (core ERE `[Nn]o tests (executed|found|ran)`
  plus the stack profile's `gate.zero_tests_patterns`) is FAIL unless it carries `"allow_empty": true`; `allow_empty`
  must be a JSON boolean, and an invalid zero-tests pattern is exit 2.
- `standards-check.sh`: every rule ERE (`pattern`, `count_regex`, `exclude_regex`) is compiled before anything is
  measured; an invalid one is exit 2 naming the rule (was exit 1 via a FAIL line in `e7afe40`; zero findings before it).
- Schemas: `allow_empty`; stack profile `gate.zero_tests_patterns` and `metrics.evidence_dir_strip_phase_prefix`
  (boolean). `metrics.py` refuses a string boolean there (exit 2) instead of reading `"false"` as true.
  `scripts/slice/tests/test-schema-types.sh` validates the shipped examples and profiles with a small stdlib validator.
- Method/templates: browser/real-UI checks only when the slice touches UI (route, view, component), in both classes;
  3–5 mutations per rule only for TAM, HAFİF one mutation per behaviour change; the targeted re-review after REVISE runs
  in the SAME reviewer session (`AGENTS.md`, `DELIVERY_RULES.md`, `OPERATING_MODEL.md` exception sentences updated, line
  numbers kept). New "Cost accounting" section in `method/SLICE_LANE.md` and a "Maliyet" block in
  `templates/slice/dev-report.md` (wall time and token totals per role and per slice; `ölçülmedi` when not measured).
- `docs/slice-lane/TEST-RUN.md`: owner walkthrough for a first real run (prerequisites, 8 steps with proving output, cost
  fields, three failure drills); its "## Bootstrap example (Laravel)" section is the only part exempt from the
  neutrality scan (`selfcheck.sh` + test).

- R1 (PR #4 review): zero-tests patterns are matched one by one, never joined (a joined ERE renumbered groups, and
  two valid patterns such as `(zero) \1` plus the core one formed an invalid ERE that grep read as "no match", so
  `No tests executed!` passed); a grep error is FAIL; ANSI colour codes are stripped before matching. Verdict order:
  FAIL > INCOMPLETE (a `{port}` SKIP, exit 3, also when it was the only command) > "no command ran" FAIL > PASS, as
  the header says. `tool_error_patterns` entries are validated one by one (`["[", "]"]` joined into a valid class).
  Browser N/A wording aligned with `SLICE_LANE.md` (any group touching no UI) in `exploration-tour.md` and the Turkish
  README. Backlog: FIX03-R5 (rule TSV field shift on an empty field, pre-existing) in `SLICE_LANE.md`.

Capability record: `docs/ai/capabilities/slice-lane.json` (still `specified`).

## fix(slice): validate gate control types and preserve regex errors (2026-10-20)

Follow-up to `fix/gate-review-hardening` at `8bbb745`; its review-wrapper and migration changes are retained.

- `gate.sh` validates gate/command control fields before executing any command: booleans remain booleans, a supplied
  timeout is an integer >=1, names match the schema, and unknown control fields fail instead of being silently coerced.
  In particular, the string `"false"` cannot skip a required command through `full_only`.
- `standards-check.sh` distinguishes grep exit 1 (no match) from tool/regex errors in counters, line checks,
  command count/exclusion filters, and profile tool-error patterns. A failed measurement cannot become a zero baseline.
- HAFİF browser checks have a reasoned N/A when no UI flow is affected; mutations have a reasoned N/A when no
  behaviour/rule changes. The slice and dev report record it and the independent reviewer confirms it. Method docs and
  templates agree; TAM safeguards, the re-review session policy, and measurement infrastructure are unchanged.
- Local regressions: extended `scripts/slice/tests/test-gate.sh` and new `scripts/slice/tests/test-standards-errors.sh`;
  both use throwaway repositories and no external model/API call.

Capability record: `docs/ai/capabilities/slice-lane.json` (still `specified`; standalone scripts, no lifecycle enforcement).

## ACEF-FIX-02 — Slice lane review/gate hardening (2026-10-20)

Findings from the adoption review (Codex) plus R5 of PR #1. Each fix has a red-first test (separate commit).
Capability record: `docs/ai/capabilities/slice-lane.json` (unchanged).

- `scripts/slice/codex-review.sh`: every run writes to a fresh temp file next to `<out.md>`; only a non-empty report
  replaces `<out.md>`, so a report from an earlier run is never read as this run's verdict (no output = exit 3,
  `<out.md>` untouched). The verdict is parsed strictly: Karar/Verdict/Decision lines must read exactly
  `PASS` or `REVISE` (optionally `**bold**`); "NOT PASS", "PASSED", or the unfilled "PASS | REVISE" = exit 3.
- `scripts/slice/gate.sh`: the clean-tree check also fails on untracked files that `.gitignore` does not cover
  (`git status --porcelain --untracked-files=all`); only the gate's own log dir is exempt, so a second run in a
  project without `.tmp/` in `.gitignore` is not refused.
- `scripts/slice/standards-check.sh` (R5): a `stack_profile` in `slice-method.json` that is empty, not a string, or
  not a readable file exits 2 instead of silently running without the profile.
- `stacks/laravel`: `{{migrate_roundtrip}}` is now `scripts/migrate-roundtrip.sh` (new `migrate-roundtrip.sh`,
  mapped in `profile.json` "files"): `migrate`, then `migrate:rollback --step=<n>` with n = migrations that run
  applied (`migrate:status` "Ran" rows after − before), so an earlier batch is never rolled back; n = 0 exits 3
  without a rollback. Needs the two-column `migrate:status` output (Laravel 10+, later 9.x). `checklist-commands.md` (C9) and the adapter README follow.
- Docs: `method/SLICE_LANE.md`, `docs/slice-lane/README.md`, and `templates/slice/review-brief.md` describe the new
  dirty-tree rule and the exact verdict line.
- Review round R1 (PR #3): verdict lines inside fenced code (``` / ~~~) are ignored, every remaining verdict line
  must be valid and agree (a fenced `Verdict: PASS` example before the real `Verdict: REVISE` exited 0), bold must be
  paired (`**PASS`, `**Verdict: PASS` = exit 3), a `#` heading label is accepted, and the report is parsed before it
  replaces `<out.md>`. `migrate-roundtrip.sh` passes `--database=`, `--path=`, `--realpath` to status, migrate and
  rollback (`--force` to migrate and rollback, `--schema-path=` to migrate), refuses any other argument (exit 2), adds
  `--no-ansi` to every call, counts only rows newer than the pre-run newest batch, and refuses (exit 3) a fresh
  database with a schema dump or new rows spanning several batches. The gate's dirty check adds
  `--ignore-submodules=none`. Red tests in their own commit.
- Review round R2 (PR #3): Laravel loads a schema dump whenever no migration has run, an existing but empty
  migrations table included, so `migrate-roundtrip.sh` now refuses (exit 3, before `migrate`) whenever the pre-run
  status has zero Ran rows, dump file or not (a configured dump path is not visible to the script).
- Tests: `test-codex-review.sh` (fake codex: stale output, verdict forms), `test-gate.sh` (untracked/ignored files,
  repeated run without `.gitignore`), new `test-standards-check.sh`, new `stacks/laravel/tests/test-migrate-roundtrip.sh`
  (fake `php`; lives in the adapter because the core neutrality scan forbids stack words under `scripts/slice/`).

## fix(schema): accept prerelease method_version (2026-10-20)

`slice-method.schema.json` `method_version` now accepts semver prerelease/build (`3.0.0-beta`); partial versions such as `3.0` stay rejected. Shipped examples updated to `3.0.0-beta`; new `scripts/slice/tests/test-method-version.sh`. `stack-profile.schema.json` has no `method_version` (its `profile_version` is unchanged).

## ACEF-NEUTRAL-01 — stack-neutral Slice lane core + stacks/laravel adapter (2026-10-20)

The Slice lane is used across stacks and projects, but the v3.0.0-alpha import carried Laravel commands and source
project names in its core. Split into a stack-neutral core and a stack adapter. Capability record:
`docs/ai/capabilities/slice-lane.json` (still `specified`).

- Core (`method/SLICE_LANE.md`, `templates/slice/`, `schemas/`, `docs/slice-lane/`, `scripts/slice/`): stack commands
  are placeholders `{{test_command}}`, `{{static_analysis}}`, `{{boundary_check}}`, `{{standards_check}}` (plus
  optional keys); examples use `{{project}}`. New `schemas/stack-profile.schema.json`; `slice-method.schema.json` gains
  `stack_profile`. `scripts/slice/gate.sh` expands `{{key}}` from the profile (`--profile`, `SLICE_STACK_PROFILE`, or
  `stack_profile`) and refuses an undefined placeholder (exit 2); `metrics.py --profile` reads the profile's `metrics`.
  `templates/slice/module-CLAUDE.md` and review checklist B–D are stack-neutral.
- Adapter `stacks/laravel/`: `profile.json`, `gate.sh` (core gate + profile), `check-module-boundaries.php`,
  `standards/` (rules, baseline, notes), `metrics-demo.sh` + `metrics-paths.json`,
  `checklist-commands.md`, `templates/module-CLAUDE.md`, `examples/`, `tests/` (standards, boundaries, profile wiring).
- Provenance: source project names appear only in `docs/slice-lane/SOURCES.md` (short names REB, CRM, JKM, LL, PLT,
  SES), which also takes the per-project adoption status. METHOD-01 reviews, the 2026-10-19 metrics demo, and the
  slice-method CHANGELOG move to `archive/slice-lane/`.
- `docs/slice-lane/adoption.md` gains "Adopt in a new stack" (5 steps) and "Laravel profile".
- Review round R1 (PR #1): the gate resolves every command before running any (an undefined/empty key, a
  non-snake_case key, a leftover `{{…}}`, or a bad/duplicate name at any index exits 2; before, only index 0 did);
  the slice-method key is `stack_profile`; `codex-review.sh` stays in the core; `standards-check.sh` takes
  stack-specific tool-error wording from the profile; `selfcheck.sh` skips an adapter whose toolchain is missing
  (`--stack <name>` forces it, `--scan-only` runs only the scan) and its neutrality scan now covers `scripts/slice`,
  stack tool names (php, phpstan, blade, eloquent, octane, …), source backlog ids, and source ports; `metrics.py`
  no longer strips phase prefixes unless the profile asks. New tests: `test-codex-review.sh`, `test-selfcheck.sh`.
- Review round R2 (PR #1, Codex): the gate also rejects control characters (NUL included) in runs and profile values
  and malformed braces (`{{{key}}}`, unbalanced `{{`/`}}`); `selfcheck.sh --stack` normalises a trailing slash and
  refuses a path or an unknown stack (exit 2); the neutrality scan exempts exact paths, not basenames.
- `scripts/slice/selfcheck.sh` runs every `stacks/*/tests/test-*.sh` and fails if the core names a stack or source
  project outside `SOURCES.md` and the adoption guide's "Laravel profile" section.
- `scripts/slice/codex-review.sh` stays in the core (no stack dependency); `AGENTS.md`, `method/DELIVERY_RULES.md`,
  `method/OPERATING_MODEL.md` are unchanged.

## v3.0.0-alpha — Slice lane (2026-10-20, tag `v3.0.0-alpha`)

Owner decision 2026-10-20 (METHOD-02): fold slice-method into ACEF instead of a separate repository. The Slice lane
becomes the default for attended single-team work; the v2 Fix/Standard/Full + Guarded lanes are unchanged and remain the
option for unattended, multi-session, or multi-worker delivery. Capability record:
`docs/ai/capabilities/slice-lane.json` (`specified`). Lane: `method/SLICE_LANE.md`. Measured basis:
`b2press-rebuild observations/ACEF_EVAL_REPORT.md` at `056662ba2` (7 ACEF slices PASS, 1 real catch, equal quality vs
native, 1.72× developer tokens on P03-LIST-01, 162 friction items; heavy flow retired for attended work on 2026-10-07).

From slice-method v0.1.1 (commit `2a3ba48` = tag `v0.1.1` `3951843` + METHOD-01 review records), imported verbatim in
one commit, then path-fixed:

- Templates → `templates/slice/`: slice (≤150 lines, numbered K items, scanned allowed list with dated additions,
  standards compliance, size and depth, review class), dev report with pre-review self-check (Jakomeet), review brief
  with the TAM annex (Cloudflare MIT derivative), review checklist A–E, targeted re-review r2, closing note with
  `metrics.py` fields, invariants skeleton, hot-file locks, module agent rules, exploration tour.
- Scripts → `scripts/slice/`: `gate.sh` (project command list from `slice-method.json`, exit 0/1/2/3, one summary
  line, dirty-tree refusal), `standards-check.sh` (ratchet; a missing tool FAILs), `check-module-boundaries.php`
  (Jakomeet PR #94, `--namespace`), `codex-review.sh` (required model, read-only, missing verdict = tool error),
  `metrics.py`, `metrics-demo.sh`, `selfcheck.sh`, `tests/` (gate, standards, boundaries, metrics fixture).
  `selfcheck.sh` now resolves the acef root and checks only the slice JSON files: SELFCHECK PASS ok=79 fail=0.
- Schemas → `schemas/slice-method.schema.json`, `schemas/slice-interventions.schema.json` (`$id` in acef style).
  `install-acef-tools` copies them into targets' `.acef/schemas/`; no slice script is installed.
- Docs → `docs/slice-lane/`: Turkish README, adoption, open questions, metrics demo 2026-10-19, CHANGELOG (v0.1.0,
  v0.1.1), METHOD-01 review (REVISE) and r2 (PASS), SOURCES with a slice-method provenance row, examples. Original
  lines are unchanged so the reviews' `file:line` citations stay valid; an appended section maps package paths to
  acef paths.
- `LICENSES/security-audit-MIT.txt` (Cloudflare MIT). ACEF's own licence is still not selected.
- One cross-link line under the H1 of `AGENTS.md`, `DELIVERY_RULES.md`, `OPERATING_MODEL.md`, `GUARDED_LANE.md`,
  `BMAD_V2_LANE.md`, `CONTROL_RATIONALE.md`.
- Reconciled (owner decision 2026-10-20: the Slice lane sits beside admission and is the default for attended,
  single-team, owner-present work; it does not go through admission, typed approvals, `acef-next` model binding, or
  the Fix counters). Every v2 statement that names another default keeps its text and gets a "Slice lane exception"
  sentence next to it in `AGENTS.md`, `README.md`, `DELIVERY_RULES.md`, `OPERATING_MODEL.md`, `GUARDED_LANE.md`,
  `BMAD_V2_LANE.md`; `method/SLICE_LANE.md` "Reconciled v2 statements" maps each row to its sentence.
  `skills/acef/SKILL.md` selects the Slice lane for attended work before the admission short-circuit.

Side effect: `scripts/slice/` and `schemas/slice-*` are inside `sourceRuntimeDigest`
(`scripts/lib/acef-installation.js`); installed target repos see a changed source digest and need
`update-acef-installation` before admitted v2 work, once this branch is the installed source.

Open v0.1.2 items (from `docs/slice-lane/METHOD-01-review-r2.md`, low, non-blocking):

- R1 — SOURCES Live Learning row: last commit per file (docs/standards `7cf9936`, gate `9f953e4`, standards-check
  `7bf90faa`, baseline `fad01981`).
- R2 — open-questions #8 and adoption: cite `COORDINATOR-STATE-2026-10-19.md:29` and `OVERNIGHT-2026-10-17.md:81` for
  the Live Learning push claim.
- R3 — `standards-check.sh`: apply the "No such file or directory" heuristic only when `count_regex` matched nothing;
  add case E to the self-test.
- R4 — the licence file carries a provenance header while SOURCES says "(aynen)": move the header to a NOTICE/README
  or reword.

Planned for v0.2: closing-note gate before merge, fixed REVISE reason enum, time/token header in review reports.

## Unreleased

### B2Press friction fixes WP-3, WP-8a, WP-11 (2026-10-07)

Source: `b2press-rebuild/observations/acef-recommendations-20261007.md` (69 findings from three Standard slices).

- fix(state): a same-run `active-run` update no longer silently drops admitted state. `assuranceProfile`,
  `assuranceRationale`, `assuranceApprovalId` and `riskTriggers` carry over unless a flag changes them (risk
  triggers can still raise the profile to guarded; they never lower it implicitly). `fullLedgerAccess` keeps the
  previous value across a `--worker-role` change when no runtime contract supplies a role default, and
  `lightweight-state-v1` runs default it to the role default (`denied`) instead of `null`. `maxLines` defaults to 120
  on `lightweight-state-v1` runs, so `current-context` no longer fails with `Missing field(s): max_lines`.
  Goal flags (`--story-type`, `--required-surface`, `--covered-surface`, ...) merge field-by-field into the previous
  `goalCoverage`; `--goal-reset` replaces it. On `lightweight-state-v1` runs `--goal-status PASS` now requires
  `--last-passed-gate` to name the latest typed PASS gate of this run and the full `gate-verdict` evaluation to pass
  (`goalPassGateFailures`); the check runs against the proposed record (run, story, risk, scope), not the stale
  on-disk run, so a same-run update that changes the story or raises risk cannot inherit a PASS reviewed for another
  scope. The same validation applies to a PASS inherited through the merge: an update that changes the story or
  raises risk without touching the goal flags is rejected (`inherited goalCoverage.status PASS ...`) instead of
  carrying the old approval forward; unchanged-context updates still pass. A missing, non-PASS, foreign-run or stale
  gate is rejected and nothing is written.
- fix(validator): `applicationTreeDigest` no longer returns an empty digest for an invalid scope (control path,
  absolute path, `..`); it throws `invalid story scope path <path>`, so a worker scope that names `docs/ai/...` fails
  loudly instead of making every tree comparison trivially equal. Unknown commits still yield an empty digest.
  `applicationTreeDigest` and `goalPassGateFailures` are exported for `acef-state`.
- feat(routing): `method/model-routing-policy-v1.json` gains a `providers.anthropic` mapping (Sonnet for every
  execution class, economical default). `activeProvider` stays `openai`, so existing repos are unchanged. A run selects
  a provider with `acef-state active-run --routing-provider <id>`; the choice is recorded as `routingProvider` on the
  active run (schema + parser), carried across same-run updates, and used by actor registration, `acef-next`, the
  validator's actor-runtime check, the hard-wall spawn hook, the Full supervisor runtime table, review capsules and
  recovery review actors. An unmapped provider is rejected when recorded. The reasoning effort remains a
  recorded claim: the launcher must open the session at that effort.

### Control-plane correctness fixes (2026-10-06)

- fix(validator): a Standard (`lightweight`) PASS terminal candidate now requires the deciding reviewer actor to have
  inspected the gate's declared final application commit/tree: its input commit must be an ancestor of the gate's
  `applicationCommit` with only control-path changes in between, its recorded `inputTree` must be that commit's tree, and
  its scoped application digest must equal the gate's `applicationTree`. A review of a pre-repair commit no longer
  certifies a repaired application. Quick Fix and Full v3 keep their existing bindings.
- fix(validator): the Standard reviewer binding is now one shared check (`standardReviewerBoundToGate`) used by the
  terminal candidate, `gate-verdict`, and `gate-transition`. Legacy Standard gates without `applicationCommit` bind to
  their `repositoryCommit`. A legacy-contract (pre-`lightweight-state-v1`) Standard PASS closeout in `precommit-gate`
  now reuses the full `gate-verdict` evaluation, so a missing gate, a gate older than the delivered product, and a
  stale reviewer are rejected with the same messages; an explicit FAIL/REPLAN/BLOCKED closeout keeps its own path.
  `gate-decider` now states that it is a role/self-approval check only, not a product acceptance by itself.
- fix(objective): for `objective-accounting-v2` objectives, a validated completion now resets the no-progress
  `activeControlSeconds` to 0 (and stamps `lastProductProgressAt`) exactly once per run. Review and closeout time spent
  after the last product commit no longer pushes an objective whose slice was validly completed into CONSOLIDATING and
  block the next slice. Without a completion the counter accumulates as before; v1 objectives are unchanged. Pausing
  the counter during review is not part of this change.

### Evidence reuse and lightweight state now have explicit integrity boundaries

- Limited automatic evidence reuse to successful syntax-only Node checks with explicit source/configuration,
  interpreter, environment, and application-content fingerprints. An arbitrary static/lint/typecheck label no longer
  grants reuse. Legacy identities, failed results, runtime/manual checks, mutable-state risks, and commands that change
  their own inputs are not reusable. The original runner evidence remains immutable.
- Made the optional Native runner recognize the documented nested worktree wrapper while charging its exact inner
  command to the same focused/broad verification budget. The original wrapper argv still executes.
- Added the versioned `lightweight-state-v1` contract for new Fix and Standard runs: canonical typed state generates the
  current-context view and active-ledger pointer. Publication uses a guarded, recoverable transaction with active-run
  last, not a claim of operating-system-level multi-file atomicity. A pending transaction blocks authorization.
- Added a read-only multi-surface evidence producer: one authentic, fresh successful execution can satisfy multiple
  declared surfaces without rerunning the command or inventing coverage it did not record.
- Introduced physical invocation receipts, typed review accounting, explicit replan events, versioned no-progress
  counters, and bounded recovery records. Lifetime totals remain available; account-wide token savings are not inferred
  from these local counters.

See `docs/ai/capabilities/core-reliability-and-accounting.json` for the source implementation and verification boundary.

### Role-calibrated model routing now covers Fix and Standard

- Made `acef-next` expose the required provider, model, and reasoning effort for the current admitted semantic role.
- Added pre-dispatch enforcement for Fix and Standard so omitted model settings cannot inherit an expensive conductor
  runtime; wrong, underpowered, and unnecessarily overpowered routes fail before the subagent consumes tokens.
- Added actor-registration verification as a second boundary while keeping Native/ACEF-external work unaffected.
- Versioned the change as `admitted-role-routing-v1` on new Fix and Standard runs so installation does not reinterpret
  an in-flight lifecycle.

### Focused RED and worktree verification no longer multiply contexts

- Bound new Native, Fix, and Standard work to Developer-owned focused RED→GREEN; Full v3 retains its independent Test
  Author. The contract is versioned and non-retroactive, so installed upgrades do not reinterpret active runs.
- Added a worktree test runner with work-unit-specific temp/cache/session/Redis/port/database names and fail-closed
  detection of Composer/vendor paths resolving into a parent checkout. Trusted setup exit 75 records a bounded
  infrastructure incident without consuming the canonical product evidence ID.
- Made Full v3 reviewer dispatch slot-aware: parallel is preferred, while one available slot immediately selects
  sequential review of the exact same input tree without dropping Code Review or Patch Assurance.
- Added a scoped formatter wrapper and restored `docs/ai/runs/` to the control-path contract used by recovery.
- Decoupled the standalone installation-freshness probe from malformed legacy lifecycle state, so stale-install diagnosis
  remains available precisely when an old active-run record needs repair.
- Repaired the native hard-wall/runtime seam: named work-unit syntax and the nested worktree-isolation runner are now
  recognized, the ten-minute budget counts actual command execution instead of idle wall-clock time, and closeout
  ignores dirty ACEF control/installation files while still rejecting dirty application or test paths.
- Removed implicit Native governance when no ACEF lifecycle is active. Installation is not admission: agents, shell
  commands, raw tests, and repository-native work are outside ACEF in that state. The Native verification wrapper is
  now an opt-in speed helper; active run, worker-scope, and compatibility Direct contracts retain their fences.
- Made ordinary Native allow decisions silent; Claude no longer renders an informational allow-side hook message as a
  misleading `PreToolUse says` verification failure.

### Full v3 repair and review now reuse one bounded work contract

- Made the existing worker scope authoritative across Development, review, and bounded repair. A `REVISE` now returns
  run, role, and worker scope to the original Developer through one typed transition instead of resuming work while
  state still claims Code Review.
- Kept repair expansion fail-closed at the approved worker scope while allowing the next review capsule and close gate
  to include the actual in-scope repair delta. Later story commits no longer contaminate an accepted story's review range.
- Replaced duplicated source bodies in review capsules with commit-bound path/hash/byte references; context and diff
  remain inline, preserving independent review while removing the common capsule-size failure.
- Namespaced only colliding reviewer finding IDs and stopped test-only commits from invalidating an otherwise unchanged
  specification verdict.
- Added `acef-native-test --work-unit <id>` for independently admitted split children that share a branch and HEAD, so
  one child cannot consume another child's focused-command budget. After a terminal Full-v3 `REPLAN`, a fresh successful
  named-work-unit receipt also lets that native child pass the retired parent's circuit breaker without touching its
  control state.

### In-flight Full v3 runs recover without replaying BMAD

- Bound dispatch readiness to the run that started with the contract, so an ACEF upgrade no longer applies new
  readiness gates retroactively to a story already in Development or review.
- Added `recover-active-run`: it verifies committed RED/product ancestry, RED authenticity, frozen implementation
  scope, a clean tree, and one exact focused GREEN command, while keeping imported RED explicitly non-canonical.
- Added one independent Recovery Judge and `recovered-story-close-v1`; its receipt, GREEN output, actor, decision,
  gate, and state must be introduced in one exact control-only close commit.
- Story transition accepts that durable recovered PASS and binds current readiness controls to the next frozen story,
  so the compatibility exception cannot leak forward.
- Added fail-closed phase/role/actor/scope coherence and safe prefiltering of unrelated historical actor records.

### Full v3 startup now fails fast and hands RED directly to Development

- Bound new Full v3 runs to the installation-advertised capsule runtime during their first state write, preventing a
  missing runtime contract from consuming a later REPLAN.
- Made status and next-action output consume the same deterministic dispatch-readiness checks used by validation, so a
  run cannot report `ready` while mandatory preflight, source/context, intake, or authorization gates fail.
- Added exact focused commands to typed worker scope, rejected unfrozen evidence and discovery commands before
  execution, and made authentic canonical ATDD RED evidence advance the run, role, worker scope, and Current Context
  to Development as one handoff.
- Returned every next story to its deterministic readiness delta instead of jumping directly to ATDD, and persisted
  objective heartbeats on every lifecycle mutation so the 15/30-minute circuit breaker observes active control work
  while retaining the five-minute sleep/idle cap.
- Classified freshness-verified installed runtime, skill, BMAD-output, and ACEF state files consistently as control
  paths across evidence, validation, and objective supervision.
- Made Full readiness reuse approved sources as a conductor-owned story delta; fresh readiness sessions and broad
  unrelated FR/NFR inventories now require a named conflict or ambiguity.
- Preserved installer flags such as `--all-worktrees`, `--review-lenses`, `--all-core`, and `--global-dispatcher` in the
  recorded update command, and stopped negated text such as “no Epic 2 exists” from seeding a false Epic gate.

### Pages now teach ACEF before exposing its internals

- Rebuilt the public documentation around progressive disclosure: Start here, How it works, Workflows, Examples, and
  Technical reference. The first reading path explains the user outcome before naming runtime contracts.
- Removed the stale A–F route model from beginner navigation and made the current two-decision model canonical:
  project workflow / ACEF Fix / Standard / Full for delivery depth, then Baseline / Guarded for assurance.
- Replaced the landing-page capability dump and duplicated print guide with four plain-language promises and canonical,
  print-ready topic pages. Internal experiment and capability artifacts remain in Git but are excluded from Pages output.
- Added a regression check for navigation parity, link/anchor validity, beginner word budgets, progressive disclosure,
  stale terminology, and accidental reintroduction of a second documentation set.
- Added role-based usage playbooks for Product/PM, Development, and QA/testing, including what each role provides,
  what ACEF returns, which decisions remain human-owned, example requests, and a shared evidence handoff.
- Added a complete human-readable skill catalog covering every first-party `skills/*/SKILL.md`, its bounded purpose,
  input/output contract, intended audience, and the product, engineering, testing, and release pipelines that connect
  skill artifacts without restarting the lifecycle.

### Parent-objective supervision stops cross-run ceremony loops

- Added `objective-supervisor-v1` for every new run in an updated target installation. Runs bind to a stable parent
  objective and normalized scope fingerprint, so renaming a run, story, or objective cannot reset cumulative budgets.
- Added objective-level consolidation at 5 runs, 3 replans, or 6 review cycles; a hard suspension prevents an eighth
  run or a fifth replan. Same-run remediation remains capped at the existing two delta-review cycles.
- Added a typed defect ledger and manual-QA state. A checklist finishes before repairs start; non-critical findings may
  share one batch only by batch key, while security, payments, migration, realtime, concurrency, and state-machine
  defects cannot be deferred/batched and require Standard-or-Full plus Guarded assurance.
- Added 15-active-control-minute and 1.5 control/product-ratio warnings, with automatic consolidation after 30 active
  control minutes without a product/test commit. Idle gaps are capped so machine sleep is not counted as active work.
- Added `worktree-handshake-v1`: installed runtime bytes and the source runtime digest must match before new admitted
  work or supervisor dispatch. `update-acef-installation --all-worktrees` refreshes every existing Git worktree,
  including temporary worktrees that a root-only rollout previously missed.
- Added counterfactual regression coverage proving consolidation, checklist batching, critical-defect escalation,
  hard suspension before the eighth run, renamed-scope resistance, and stale/tampered installation refusal.

### Capsule supervisor v2 isolates runs and reuses exact evidence

- Added `capsule-supervisor-v2` for new Full v3 runs. Actor, session, review, capsule, correction, Epic Judge, and
  generated correction-evidence identities are now namespaced by `runId`; v1 remains compatibility-only for active
  runs with existing lifecycle records.
- Made ATDD dispatch reject a worker scope from another run, and bound supervisor evidence selection to actors from the
  active run instead of accepting same-story records from historical runs.
- Made `evidence-run` reuse an existing result when command argv, commit/tree, application dirtiness, environment,
  story, kind, and run all match. It writes a new immutable evidence alias and does not rerun discovery, environment
  setup, or the verification command.
- Added a two-run/same-story regression proving distinct identities, stale-scope refusal, one physical test execution,
  evidence aliasing, and fail-closed rejection of unqualified v2 evidence IDs.

### Native work now has a mechanical speed contract

- Added the installed `acef-native-test` runner with a three-command focused envelope, two attempts per exact command,
  180-second focused timeout, and 10-minute active verification budget.
- Made the repo-local dispatcher block raw native test/static-analysis commands and native subagent spawning. Broad
  verification is denied during implementation and allowed once only with `--closeout` on a clean worktree.
- Stored counters under Git's uncommitted administration area rather than creating ACEF run/evidence artifacts, and
  added hook, runner, installer, repetition, focused-count, and broad-closeout regression coverage.

### Split children now fail closed to the native workflow

- Added typed admission topology to new intake: reversibility, technical-boundary count, and product-surface count.
- Reject ACEF bootstrap with `NATIVE_WORKFLOW` when a split child is reversible, single-boundary, single-surface, and
  has no persistence/security/money/provider/realtime/state-machine/analytics/new-pattern coordination trigger.
- Kept `release-certification-integrity` and similar importance labels from acting as ACEF admission by themselves;
  native work still uses focused verification and review without per-defect ACEF artifacts.

### Bundled defects now split before active-run bootstrap

- Added an aggregate-defect readiness rule: independent root causes, unrelated audit findings, and shared-suite repair
  batches return `REPLAN/SPLIT` instead of being wrapped in one Full BMAD story.
- Made the typed state writer execute two-axis workflow selection before it writes a new intake run. Invalid risk-only
  Full routing and repair-batch aggregation now fail without leaving stale active-run artifacts.
- Kept a deliberate exception for one cross-surface defect only when both `root-cause-proven` and `bounded-patch` are
  recorded; that unit can use ACEF Fix + Guarded.

### Quick Fix now has one review and deterministic closeout

- Added `single-review-v1` as the default contract for new ACEF Fix runs. Its normal topology is one Developer and one
  independent Code Reviewer, with an optional third ATDD context; Guarded assurance no longer implies a separate
  Process Judge or the Full BMAD review stack.
- Enforced one review cycle, four commits, five product files, 50 product-line churn, four evidence runs, zero in-run
  framework failures, and a 30-minute hard stop. Closeout binds red, green, revert-proof, and conditional user-facing
  product evidence to the reviewer PASS gate.
- Made committed terminal runs inert for later commits so an old PASS cannot authorize new work or accept fresh actor,
  gate, evidence, or report records. Compatibility Quick Fix records without the new contract remain readable.
- Added regression coverage for the state default, parser contract, reviewer-only gate, hard time-box, budgeted closeout,
  and completed-run isolation. Capability maturity is `enforced` until a live controlled canary proves the successor.

### Compatibility Full runs can close with an exact non-PASS recovery record

- Allowed a migrated compatibility Full run with terminal `FAIL`, `REPLAN`, or `BLOCKED` to persist its honest
  disposition even when stale worker scope, prior review state, or a dirty application tree makes certification
  impossible. This path is record-only and never promotes the run.
- Restricted that recovery commit to exactly `docs/ai/ACEF_ACTIVE_RUN.json` and its bound terminal gate. The gate must
  match the run's terminal disposition, active actor, and normalized scope; staged application or unrelated control
  files fail closed, while preserved unstaged recovery work no longer prevents closure.
- Made the compatibility terminal record inert after both files are committed unchanged. Later commits are no longer
  misclassified as repeated terminal-close attempts and must instead follow their own admission/workflow decision;
  modifying either terminal record reactivates fail-closed integrity checks.

### Risk and execution-depth routing made mechanically independent

- Corrected the brownfield router so billing, entitlement, auth, public-surface, provider, realtime, persistence, and
  similar risk signals select Guarded assurance without independently escalating a bounded task to Full BMAD.
- Added versioned `two-axis-v1` intake decisions and lane-selection enforcement. A proven, bounded defect with no new
  contract is accepted as ACEF Fix + Guarded; selecting Full on risk alone fails. Full remains required for explicit
  planning/scope triggers such as new contracts, architecture, product workflows, broad refactors, cross-repo work,
  scope expansion, ambiguity, or epic scope.
- Made NFR assessment conditional on a changed non-functional contract and made broad-suite execution conditional:
  focused tests during work, one broad suite at Full closeout, or a recorded shared-contract reason in Fix/Standard.
  Reviewers reuse bound evidence unless resolving a named conflict.

### Capsule supervisor controlled-canary authorization

- Authorized `capsule-supervisor-v1` for at most two sequential, explicitly opted-in, new Full + Guarded runs after
  review of the V3.34 live evidence and exact-transcript reanalysis. Existing runs remain immutable, 30 active minutes
  is the fail-closed ceiling, and a stopped canary falls back only through a separate ordinary `four-actor-v3` run.
- Kept capability maturity at `enforced`: the authorization neither rewrites the immutable V3.34 automated failure nor
  makes the runtime a default or generally installed workflow.

### Shell-safe single integration action

- The four-actor execution contract now emits a typed `run-integration` action containing the exact frozen argv, a
  deterministically shell-quoted command, `maximumInvocations: 1`, and `onNonzero: STOP_FAIL_CLOSED`. The conductor
  copies the compiled command byte-for-byte into one `exec_command`; it may not reconstruct argv, add `sh -c`, change
  quoting, or retry after a nonzero result.
- V3.33 completed the nested product path, one same-session post-red correction, 19 tests/24 assertions, two
  zero-finding story reviews, the durable story-close commit, and an independent Epic Judge PASS in 18m26.9s. Its
  immutable process result is FAIL because the old plain `argv.join(" ")` display left a filter pipe unquoted: the
  first integration invocation exited 127 and the corrected retry exited zero, violating the exactly-once gate.
- Regression coverage freezes the metacharacter-bearing argv, its safe command representation, the one-invocation
  contract, and removal of the unsafe display. Capability maturity remains `enforced` pending one live successor
  proof; V3.33 is not rerun or rewritten.
- V3.34 live-proved the repair: the story-close package committed before one safely quoted integration invocation,
  which exited zero without `sh -c` reconstruction or retry. The run completed in 22m10s, stayed within every hard
  budget, and received a zero-finding artifact-only blind product PASS.
- The immutable V3.34 row still reports `PRODUCT_PASS_PROCESS_FAIL` because its ATDD actor stored the exact long
  evidence command in one non-interpolated immutable `String.raw` constant and used object shorthand `{cmd,...}`;
  the transcript extractor previously recognized only inline string properties. The bounded extractor now accepts
  only that statically provable literal alias and rejects interpolation, mutation, unknown aliases, dynamic assembly,
  and duplicates. Exact-transcript collaboration reanalysis is fully green; maturity remains `enforced` under the
  frozen no-rewrite promotion rule.

### Durable story-close transition enforcement

- `capsule-supervisor-v1` now emits one exact `commit-story-close` action after a deterministic PASS gate. Its stage
  and commit commands include only the gate-bound actor, report, evidence, raw-artifact, repair, and Judge records;
  pre-dispatch review capsules are explicitly excluded.
- `acef-state story-transition` independently validates that the complete close package is committed unchanged, that
  the PASS gate and fresh reviewer artifacts were introduced together, and that the close commit contains exactly the
  bound control delta. An uncommitted, split, mutated, or capsule-contaminated package fails before Current Context,
  active-run, or ledger state can advance.
- V3.31 live-triggered the bounded post-red correction and received a zero-finding artifact-only product PASS in
  20m55.6s active time. Its immutable final result remains `PRODUCT_PASS_PROCESS_FAIL` because the conductor advanced
  before committing the story gate and later included review capsules in the close commit. The repaired mechanism is
  deterministically enforced; capability maturity remains `enforced` pending a successor live proof.
- Transcript scoring now recognizes safely escaped shell metacharacters that produce the exact frozen integration
  argv and permits separator-composed read-only correction inspection while continuing to reject any block containing
  a mutation.

### Bounded post-red ATDD correction

- Added a one-shot `acef.atdd-correction.v2` transition for `capsule-supervisor-v1`. When Development identifies a
  semantic defect in already-bound red evidence before product/test mutation, it must restore the clean original-red
  commit and return hash-bound correction findings. The state writer freezes the original ATDD/Developer identities,
  replayable command/discovery argv, explicit test paths, base commit, and Developer resume scope.
- The supervisor commits the correction control binding before dispatching one fresh ATDD correction actor at the
  existing high-tier ATDD runtime. Replacement evidence must use the supervisor-owned ID, remain a new test-only red
  commit inside the frozen path set, and rerun the original exact command and discovery identities. The original
  Developer then resumes through one `followup_task`; a replacement Developer, second correction, expanded path,
  production write, non-red replacement, or missing continuation marker fails closed.
- Updated evidence runner proofs, deterministic gate validation, transcript accounting, role budgets, installer
  coverage, and the ACEF method/skill mirror. The repository suite passes 31/31; maturity remains `enforced` pending
  the separately frozen V3.28 live rehearsal and blind judgment.
- V3.28 completed all four deterministic story gates, the broad integration command, and its typed Epic PASS gate,
  but the outer transcript scorer initially treated the Judge's prose as the result channel and required a redundant
  `ACTOR_RESULT` marker. The scorer now derives the terminal result from the validated actor-decided Epic gate, just as
  reviewer verdicts come from typed reports; free-form prose cannot override or invalidate the durable gate.
- The immutable V3.28 attempt completed product work in 46m47.6s wall time (46m35.4s active), stayed inside every hard
  actor/token/cycle/tool/time/idle budget, and received a zero-finding artifact-only high-effort Blind Judge `PASS`.
  Its derived verdict remains `PRODUCT_PASS_PROCESS_FAIL` because immutable attempt rows are not rewritten after a
  harness repair; the corrected exact-transcript reanalysis is 17/17 actors with zero collaboration failures.

### Provider-neutral calibrated model routing

- Added a typed role-routing policy that separates ACEF execution class and reasoning tier from provider model names.
  The installed OpenAI mapping resolves the conductor to `gpt-5.6-sol/medium`, Code Review to
  `gpt-5.6-sol/medium`, and unmeasured ATDD, Development, Patch Assurance, and Judge roles to
  `gpt-5.6-sol/high`. Mechanical supervisor/state/capsule/gate work remains model-free.
- Preregistered V327-CAL-001 against one immutable V3.25 Code Review capsule with a held-out HIGH oracle and blinded
  allocation. Both medium and high found the fail-open empty-operand defect; the blind Judge scored medium 30/30 and
  high 28/30 with no unsupported HIGH findings. The result qualifies only the OpenAI Code Review role, not other
  semantic roles or providers.
- The supervisor emits the policy ID/provider/hash and resolved role runtimes; the state writer rejects actor or review
  completion receipts outside the calibrated role mapping. The installer ships the policy, schema, and resolver.
  Provider remapping changes only the provider table, but remains fail-closed until all abstract execution/reasoning
  tiers resolve and provider-specific calibration exists.
- The immutable V3.27 rehearsal applied the matrix for 38m02.7s. Medium Code Review found a real Story 1 HIGH; Story 1
  and Story 2 closed PASS, while Story 3 failed closed because Development changed a semantically defective ATDD test
  after red evidence binding. The run remains FAIL and exposes the need for a bounded post-red ATDD correction
  transition. The external blind Judge launch also exposed an accidental medium-conductor fallback; it was aborted
  before ingestion. The harness now resolves external judgment from the high terminal Epic Judge profile and
  quarantines abandoned launch roots instead of overwriting them. A fresh high-effort blind judgment then correctly
  returned FAIL with three HIGH findings for the unstarted Story 4 and no scope/test-integrity violation.

### Capsule supervisor runtime candidate

- Added the optional `capsule-supervisor-v1` runtime contract for new `full-bmad` / `four-actor-v3` runs. A
  deterministic reducer now selects the next lifecycle action; mechanical transitions, evidence assembly, scope
  derivation, and gate preparation do not consume a model session.
- Replaced repeated fresh Developer sessions with one story-bound Developer that keeps bounded test attempts inside
  its turn and receives at most one repair follow-up per review cycle. ATDD remains fresh per story; reviewers remain
  independent, while a prior Code Review PASS is reused after a test-only repair and Patch Assurance alone reruns.
- Added hash-bound additive review capsules, test-discovery proof before green evidence, deterministic review-surface
  derivation, capsule-to-report binding, model/effort receipts, and model-cycle budgets. Reviewers consume the one
  bound focused-run proof instead of racing duplicate test runs. Reviewer dispatch actions carry the exact capsule
  ID/path/hash/show command, and process certification revalidates the durable capsule bytes and bindings. The first candidate pins semantic actors to
  `gpt-5.6-sol/high`; `gpt-5.6-terra/medium` is shadow-only until measured evidence supports promotion.
- Made intermediate non-PASS gate commits state-aware and removed the unconditional story Process Judge placeholder
  from Lean close evidence when deterministic story close did not trigger a Judge. Existing Full contracts remain
  readable and unchanged.
- The first frozen V3.16 rehearsal failed closed after 879.8 seconds. Its four semantic actors completed Story 1 in
  422.6 seconds, but the model-driven conductor spent the remaining critical path reconciling a missing surface
  binding, a duplicate Lean-evidence view, and an underspecified post-PASS transition. The successor now compiles
  surface evidence into the exact gate command, reuses the deterministic story-close package as Lean evidence,
  preserves active-run pointers on same-run updates, and emits an exact model-free story transition command.
- The frozen V3.17 successor failed closed in 75.7 seconds before product writes or actor dispatch because the
  conductor selected a deterministic `readiness` bootstrap phase that the supervisor did not recognize. The runtime
  now explicitly starts at ATDD after deterministic readiness/reuse, binds context and worker-scope pointers during
  bootstrap, forbids bootstrap help/source probes, and provides an exact model-free readiness-to-ATDD compatibility
  transition. The fast stop confirms the circuit breaker works; it does not promote the capability.
- V3.18 crossed the prior boundary and completed three story implementations plus twelve base actors in 1,848.9
  seconds. Story 1 and Story 2 closed PASS in 455.2 and 383.1 seconds; Story 3 reached green and two reviewer PASS
  results in 485.2 seconds, then correctly failed its deterministic test-authenticity check because the additive ATDD
  test scanned PHP source tokens. The successor now forbids source-shape ATDD, prints exact bootstrap/per-story scope
  commands, and routes semantic-reviewer PASS plus mechanical-gate FAIL directly to REPLAN instead of wasting a
  Developer follow-up.
- V3.19 confirmed exact bootstrap removed option probing, then failed closed in 977.3 seconds. The initial typed worker
  scope retained the ATDD identity after the phase transition, causing the Developer to refuse its first write; Story
  2 later returned ATDD REVISE because a genuine product red was mixed with a closure-capture defect. Phase transition
  now atomically rebinds the worker scope to the canonical Developer, and the compiled ATDD contract requires a direct
  pre-bind focused run that removes every test-harness defect before the one immutable red-evidence command.
- V3.20 confirmed both repairs in a clean 587-second attempt: exact bootstrap and ATDD completed, and the typed phase
  transition atomically rebound the active run and worker scope to the canonical Developer. The Developer produced a
  16-test/58-assertion focused green, but correctly returned terminal REVISE because its actor registration command was
  still underspecified and therefore no typed green evidence could bind the canonical session. The successor now
  compiles the exact canonical Developer registration command into the supervisor dispatch and requires the conductor
  to execute it once before spawning that actor; the Developer may no longer create, probe, or rewrite its own record.
- V3.21 confirmed that registration repair and completed Story 1 PASS in 387.7 seconds with four semantic actors and no
  repair cycle. Story 2 also reached a 20-test/31-assertion focused green and dispatched both reviewers from one shared
  tree. The attempt then ended after 1,059.8 seconds because the root Codex conductor received a transient model-capacity
  error; its in-flight Patch Assurance child was interrupted after capsule consumption. This is a measurement-harness
  failure, not a product or deterministic ACEF gate failure. The outer experiment actor now resumes the same root thread
  at most once, on that exact capacity signature, within the original remaining time budget. It records the resume in
  the immutable receipt and instructs the same conductor to use the existing typed child infrastructure-retry rule;
  completed actors and lifecycles may not be replayed.
- V3.22 ran for 2,223.7 seconds without a capacity interruption, so the new conductor-resume path remained unused.
  Story 1 closed PASS in 1,118 seconds after Code Review found one real empty-special-key bypass and the original
  Developer completed one bounded repair; Story 2 closed PASS in 355.4 seconds; Story 3 reached a green product patch
  in 442 seconds but failed before green evidence because ATDD had created a `test_`-prefixed method that did not match
  the frozen discovery identity. The successor moves discovery validation before any atomic ATDD actor/evidence write,
  embeds the frozen discovery contract in the exact red-evidence command, and requires a direct discovery precheck
  before the test-only commit. A mismatch therefore remains repairable inside the one ATDD turn and cannot consume a
  Developer session.
- V3.23 confirmed failure-atomic ATDD discovery in an 851.2-second attempt and reached a genuine Story 1 repair. Code
  Review found a mixed-operator normalization edge case, the original Developer repaired it, and focused tests passed.
  The run then stopped because the Developer invented a valid but non-canonical repair receipt ID while the supervisor
  compiled retry capsules against a different path. The successor makes repair identity supervisor-owned: every resume
  action carries the exact `repairCommand` and `repairReceiptPath`; the same Developer executes that command after green
  evidence, and omission or substitution is mechanical REPLAN rather than conductor-authored repair. The experiment
  transcript parser now also recognizes the new discovery-bound red-evidence command as the one canonical ATDD call.
- V3.24 completed the entire four-story product path in 2,436.2 seconds: every story closed with focused green evidence
  and two independent reviewer PASS results, and the one epic integration command passed 48/48 tests. It still failed
  process closeout because Current Context remained at s1/ATDD, the one-shot Epic Judge correctly returned REVISE, the
  experiment validator misread the required review-snapshot/close-commit pair as an invalid split package, and one
  reviewer repeated the same read-only capsule display. Time, per-story time, tokens, cycles, and actor-count gates
  passed; the preregistered tool cap missed at 286/240. No blind Judge ran and maturity remains `enforced`.
- Current Context is now mechanically regenerated from typed run and worker-scope state on bootstrap and every phase,
  story, and epic transition. The supervisor blocks a one-shot Epic Judge behind an exact context-sync action, owns
  its canonical registration plus terminal decision commands, and refuses redispatch when an actor exists without a
  terminal gate. Formal durability now validates immutable review prerequisites separately from the exact
  reviewer/capsule/gate close delta while preserving the older one-commit form. Identical repeated capsule display is
  retained as measured tool waste; a missing or different capsule identity still fails closed.
- V3.25 validated those repairs through one complete repaired story and the next story's Development boundary in
  1,398.4 seconds. Current Context stayed synchronized, Code Review found a real malformed-operator HIGH, the original
  Developer repaired it under the supervisor-owned receipt, both retry reviewers passed, and the two-layer close
  package validated. Story 2 then stopped correctly because its immutable ATDD test nested a by-reference closure
  inside a PHP arrow function, whose value capture made green evidence impossible. No later roles or broad suite ran.
- Added deterministic `atdd-precheck` routing before the red commit. It validates only frozen in-scope test paths and
  rejects the measured nested arrow/by-reference mutable-observation trap; `evidence-run` repeats the same check
  failure-atomically before actor/evidence creation. Focused behavioral red and frozen test discovery remain required.
- Replaced the generic-MySQL source-text oracle in the successor rehearsal fixture with executable behavior against
  both duplicate-classification paths. Focused state, validator, experiment, installer, and supervisor regressions
  pass; the complete 28-script repository suite plus closeout fixture passed in 246 seconds. Maturity is `enforced`,
  not `proven`, pending a successful separately frozen successor rehearsal.
- V3.26 completed all four stories on their first review cycle in 2,254.9 seconds, passed the one 48-test/122-assertion
  integration run, and received an independent Epic Process Judge PASS. The immutable attempt still failed because the
  guarded pre-commit bundle reapplied story freshness, surface, worker-scope, and ledger controls to the aggregate epic
  commit; durable measurement also compared abstract `epic` literally with `Epic closeout`, and rejected one harmless
  mistyped capsule read before the correct hash-bound read. No blind Judge ran and maturity remains `enforced`.
- Four-actor-v3 epic close now reuses and revalidates every deterministic story-close package on its frozen paths. The
  final-story worker scope is accepted only for an inventory-bound, control-artifact-only epic commit; any dirty
  application file still fails closed. Epic Lean/surface/freshness evidence is compiled from story packages, durable
  measurement resolves the typed epic label, and capsule validation requires the correct report-bound read at least
  once. Transcript-proven failed capsule typos count as waste; any successful foreign capsule read fails isolation.
- Deterministic story-close v3.1 freezes normalized surface, round-trip, input/output, and durable-state requirements
  plus their replayable check results. The writer requires the current worker scope to equal the copy committed at its
  input commit. Epic replay reloads that historical scope for every story and rebuilds the requirements, including
  compatibility replay for v3.0 packages, so old sessions do not need to reopen and requirements cannot be lowered.
  Review-scope derivation preserves the union of explicitly declared and path-inferred surfaces; non-inferable provider,
  storage, or notification boundaries cannot disappear during the review transition.
  `epic-complete` now durably records the terminal Judge disposition; the supervisor emits the exact control-only
  close commit. PASS uses the promotion bundle; FAIL/REPLAN/BLOCKED use a record-only terminal bundle and cannot be
  mistaken for promotion. Completed runs cannot be reopened under the same run ID, terminal disposition remains visible
  in Current Context/status/next, and worker writes fail closed. Completion is bound to the exact terminal gate ID,
  actor-decided verdict, canonical named-Epic scope, Epic Judge identity, frozen inventory, and synchronized Current
  Context. Verdict, context, or completed-scope tampering now blocks both startup authorization and precommit; parser-
  derived compatibility fields cannot leak into the schema record. The immutable V3.26 closeout replay, disposable
  completion replay, adversarial regressions, installer coverage, and complete 32-script suite pass in 337 seconds.

### Full story lifecycle v3.15 typed findings and repair receipts

- Replaced reviewer-authored base64 in the active v3 prompt with repeated typed finding ID/severity/reason options;
  `acef-state review-result` injects `OPEN` and retains failure-atomic report/actor creation. Compatibility base64 stays
  readable but is not the new-run interface.
- Bound a Developer repair receipt to its repaired application tree across later conductor-owned control-only review
  transition commits. Those commits cannot trigger an extra Developer follow-up or replacement receipt.
- Required the one lifecycle integration wrapper to emit both output and the inner `exit_code`; successful-looking test
  prose without that typed field remains fail-closed.
- Prohibited reviewer encoding helpers, ad-hoc interpreter snippets, metadata probes, and obsolete finding options;
  added focused regressions for typed findings, control-only repair transitions, command allowlisting, and output-only
  lifecycle receipts. Focused validators pass and the complete repository suite passed 30/30 in 227 seconds. Maturity
  remains `enforced` pending a separately frozen rehearsal.
- Froze and repeated the non-scored V3.15 rehearsal. The first attempt was environmentally interrupted by clamshell
  sleep; the unchanged sleep-inhibited repeat completed normally in 3,016.3 seconds but failed closed. Typed reviewer
  findings and explicit lifecycle exit receipts worked, while undiscovered Story 2 tests, a Developer non-PASS repair
  dead end, unbound pre-review continuations, close-bootstrap omissions, the intermediate-REVISE hook conflict, and a
  source-shape-sensitive webhook assertion prevented promotion. Maturity remains `enforced`.

### Full story lifecycle v3.14 story scope and structured receipts

- Made `scopeUnit` fail closed at the state-writer boundary: a frozen four-actor-v3 catalog story cannot start or
  continue under epic scope. Epic scope remains available for epic-level state and the terminal Epic Process Judge.
- Decoded structured Codex tool-output blocks before lifecycle exit-receipt validation. The immutable V3.13 integration
  transcript now re-evaluates as exactly one attributed command with exit 0 and valid story/Judge ordering.
- Applied the one-literal-command/one-exec rule to every reviewer read and completion call, allowlisted only bounded
  `awk` and safe `git grep` reads, and retained fail-closed rejection of separators, pipelines, dynamic commands, and
  text-conversion filters.
- Required each exact story-close package to commit before any next-story active-run, Current Context, or ledger
  transition. Focused state, experiment, process-validator, skill, installer, and capability tests pass; the complete
  repository suite passed 30/30 in 264 seconds. Maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze and ran non-scored `REHEARSAL-v314`. Story scope was correct on all four stories, Stories 2–3 closed
  at cycle 0, and close packages preceded next-story state. The immutable attempt still failed after 4,068.3 seconds:
  reviewer findings lacked a reliable one-command typed handoff, S1 repair receipts conflicted with the later
  control-only review transition, the successful integration wrapper omitted an explicit exit receipt, and both S4
  reviewers found a genuine undiscovered-ATDD HIGH issue. Maturity remains `enforced`.

### Full story lifecycle v3.13 canonical reviewer and terminal closeout

- Added reviewer-owned `acef-state review-result`: reviewers supply only canonical actor, verdict, and optional
  base64-encoded findings. The state writer derives the report path plus run/story/phase/commit/tree bindings, validates
  the typed report, and creates report and reviewer actor as one failure-atomic handoff. Legacy `review-completion`
  remains readable for frozen compatibility runs.
- Canonicalized exact lifecycle integration attribution through the observed `sh -c` wrapper and allowlisted bounded
  read-only reviewer existence/syntax checks without authorizing application writes.
- Allowed the mandatory Epic Process Judge to persist a typed terminal non-PASS gate with missing-story inventory and
  latest story dispositions. PASS still requires exactly one terminal deterministic PASS gate and aggregated green
  evidence for every frozen story.
- Added regressions for derived reviewer binding, failed-handoff cleanup, immutable replay refusal, wrapped lifecycle
  attribution, reviewer read-only commands, and terminal non-PASS Epic durability. The complete repository suite passed
  30/30 in 266 seconds. Maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze and ran non-scored `REHEARSAL-v313`. Canonical reviewer handoff closed Stories 2–4, including both
  previously failing Story 3/4 Patch Assurance cases; the wrapped integration command was recognized 1/1 and exited 0;
  and the Epic Judge durably wrote a terminal `REPLAN` gate with one missing story. The immutable run still failed after
  2,802.8 seconds because Story 1 remained epic-scoped when review opened, structured tool output hid the successful
  exit receipt from the parser, several reviewers batched read-only shell commands, and staged Story 2 closeout was
  checked against active Story 3. Maturity remains `enforced`.

### Full story lifecycle v3.12 atomic ATDD evidence handoff

- Changed four-actor-v3 `evidence-run` so the one literal runtime-test command validates a clean committed test-only red
  tree and atomically creates the missing canonical ATDD actor record before test execution. The record binds the
  canonical child identity plus the pre-red parent commit/tree; no separate conductor actor step remains.
- Moved evidence-kind and immutable evidence-ID validation before actor creation or command execution. Invalid kinds,
  dirty trees, non-test commits, wrong actor/story identities, and consumed evidence IDs leave no actor, raw log, or
  evidence manifest.
- Added child-transcript enforcement for exactly one canonical runtime-test evidence command and canonical ATDD actor
  session binding.
- Added regressions for invalid-kind atomicity, dirty-tree atomicity, automatic actor/evidence binding, and exact-one
  transcript attribution. The complete repository suite passed 30/30 in 280 seconds. Maturity remains `enforced`
  pending a separately frozen rehearsal.
- Separately froze and ran non-scored `REHEARSAL-v312`. Atomic ATDD actor/evidence handoff passed on all four stories,
  Stories 1–2 closed at cycle 0, and the one broad integration shell command exited 0. The immutable attempt still
  failed after 3,830.6 active seconds: Story 3 Patch Assurance used a nested report binding, Story 4 mistyped its
  completion artifact path, exact lifecycle-command attribution observed 0/1 because of shell wrapping, and terminal
  blocked closeout could not be committed without an epic gate. Maturity remains `enforced`.

### Full story lifecycle v3.11 ATDD transition fence

- Rendered one literal `acef-state evidence-run --kind runtime-test` command for every frozen story and required the
  ATDD actor to use it once after the clean test-only commit. Unsupported semantic kinds, trailing path operands, and
  failed evidence-ID reuse are explicitly prohibited.
- Added a live four-actor-v3 supervisor policy that permits `followup_task` only for canonical Developer identities.
  A follow-up to ATDD, reviewer, or Judge is detected from the parent session transcript and terminates the process
  group before later lifecycle work can continue; the bound actor receipt records the exact violation.
- Corrected post-run collaboration validation so four-actor-v3 ATDD `REVISE` requires one fresh adjudication before
  Development. The earlier condition accidentally applied the adjudication state machine only outside v3.
- Added regressions for literal ATDD evidence commands, missing/admitted v3 adjudication, invocation accounting, and a
  real supervised child process stopped on forbidden ATDD reactivation. The complete repository suite passed 30/30 in
  288 seconds. Maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze non-scored `REHEARSAL-v311`; preflight and Stage 0 passed. The run failed closed after 314 seconds
  with no follow-ups or Development dispatch: the exact evidence command required an ATDD actor record that the
  lifecycle still scheduled only after FINAL_ANSWER. The transition fence passed, reviewer handoff was not reached,
  and maturity remains `enforced`.

### Full story lifecycle v3.10 atomic reviewer handoff

- Changed the final `review-completion` command from report-only validation into one atomic handoff: it validates the
  typed report and creates the report-bound immutable reviewer actor record before emitting the machine completion
  payload.
- Removed the contradictory conductor-owned reviewer actor step. The conductor now commits transition state first,
  freezes one shared input commit/tree for concurrent Code Review and Patch Assurance, and never pre-creates or
  rewrites either reviewer actor record.
- Extended transcript write auditing to observe and permit exactly the reviewer's typed report plus its own actor
  record. Cross-repository, extra-option, unobservable, delegated, and other writes remain fail-closed.
- Added state-writer and execution-assurance regressions for failed-handoff atomicity, generated actor identity/role,
  exact shell allowlisting, and transcript-visible actor creation. The complete repository suite passed 30/30 in 265
  seconds. Capability maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze non-scored `REHEARSAL-v310`; preflight and Stage 0 passed. The real run was intentionally stopped
  after 413.1 seconds when the same ATDD actor received two forbidden follow-ups after inventing unsupported evidence
  kind `atdd-red`. Development had started without a receipt, so finalize correctly classified the attempt as consumed,
  indeterminate, and non-replayable. Reviewer atomic handoff was not reached and maturity remains `enforced`.

### Full story lifecycle v3.9 canonical Developer session binding

- Replaced the unobservable internal receiver-UUID requirement with the exact canonical `/root/<task_name>` identity
  actually returned to the conductor by Codex CLI 0.146.0.
- The harness still proves the hidden receiver UUID independently through child-session `id`, `agent_path`, parent, and
  spawn provenance; actor and repair receipts bind the visible canonical identity.
- Added regressions rejecting bare task names and arbitrary receiver strings while accepting the canonical spawn path.
  Focused execution-assurance, state, and process-validator tests pass; maturity remains `enforced` pending a separately
  frozen rehearsal.
- The complete repository suite passed 30/30, the interrupted v3.8 real actor record passed the new canonical binding
  check, and non-scored `REHEARSAL-v39` was separately frozen against clean commit `28fa3e4`.
- Recorded immutable non-scored V3.9 FAIL after 908.7 seconds. Canonical Developer session binding passed in the real
  run, but reviewer completion exposed an immutable actor/report handoff contradiction and mismatched shared review
  input tree. No blind Judge or maturity change is implied.

### Full story lifecycle v3.8 final-tree recovery

- Corrected bounded repair routing: Patch Assurance now reruns after every application/test-tree repair; Code Review
  reruns after its own REVISE or a production repair, while test-only repair may preserve a prior Code Review PASS.
- Bound Developer actor/repair identity to the actual spawn receiver id instead of task name, accepted harmless trailing
  whitespace in repair handoffs, and made the typed Judge decision the trigger source of truth.
- Replaced raw shell-metacharacter scanning with quote-aware detection. Quoted PHPUnit/jq operators are accepted as
  arguments; unquoted pipelines, redirections, substitutions, dynamic commands, and mutations remain rejected.
- Made `review-completion` the sole report-shape validation command and prohibited schema/help probing in reviewer work.
- Reworked formal story-close durability into one exact immutable cycle-0 package plus exact immutable repair-delta
  layers. Historical REVISE evidence is preserved rather than reintroduced or rewritten.
- Added regressions for all observed v3.7 failure modes. The complete repository suite passed 30/30; capability maturity
  remains `enforced` pending a separately frozen non-scored rehearsal and later scored evidence.
- Separately froze non-scored `REHEARSAL-v38` against clean implementation commit `fe5f8b8`; freezing does not start the
  attempt and cannot change maturity or authorize promotion.
- `REHEARSAL-v38` was intentionally interrupted after live evidence showed that Codex CLI 0.146.0 returns only canonical
  `/root/<task>` identity to the conductor, not the harness-internal receiver UUID required by the candidate. Finalize
  correctly refused to invent a receipt/result, so the attempt is non-replayable and maturity remains `enforced`.

### Full story lifecycle v3.7 reviewer normalization rehearsal

- Canonicalized trusted review-report vocabulary at the parser boundary: verdict, severity, and status casing is
  normalized; `INFO` maps to `LOW` and `CLOSED` maps to `RESOLVED`. Unknown values, empty REVISE reports, PASS reports
  with open findings, and unsafe HIGH/CRITICAL dispositions remain rejected.
- Added parser and machine-observed `review-completion` regressions and passed the complete 30/30 repository suite.
- Recorded the immutable non-scored v3.7 rehearsal FAIL after 4,209.6 active seconds. All four stories reached review;
  S1–S3 closed; S4's real HIGH finding was repaired and Code Review passed, but the prior PASS Patch Assurance was
  stale for the repaired final tree. Deterministic close correctly refused to pass and the broad closeout did not run.
- The rehearsal also exposed trailing-whitespace repair binding, quoted-shell-metacharacter, duplicate Judge-trigger,
  and multi-layer close-package oracle defects. No promotion or maturity change is implied.

### Full story lifecycle v3.6 deterministic-close rehearsal

- Removed the contradictory requirement that a genuine test-runner failure must name the editable ATDD path. Guarded
  runs may execute an immutable verification test while deterministic close continues to require a clean test-only red
  commit, authentic production assertions, exact-command red-to-green ancestry, semantic test continuity, and clean
  runner proof.
- Added a full deterministic-gate regression using an editable ATDD test and a distinct frozen verification test. The
  complete repository suite passed 30/30; clean preflight passed task/canary/environment and four reference validations;
  Stage 0 passed 6/6.
- Recorded the immutable non-scored v3.6 rehearsal FAIL after 930.9 active seconds. The repaired red/green evidence was
  accepted, but both Story 1 reviewers used schema-invalid enum spellings in their one-shot completion reports. The
  system correctly stopped, yet could not route the real HIGH finding into bounded Developer repair. No promotion or
  maturity change is implied.

### Full story lifecycle v3.5 measured-failure recovery preparation

- Classified unsuffixed and suffixed delivery ledgers plus the active-ledger pointer consistently as control state, so
  legacy ledger normalization cannot invalidate application evidence mid-story.
- Restricted durable write/read proof to explicit mutation semantics or persistence/stateful risk triggers. High-risk
  names such as `Billing` still route assurance but no longer make a static route edit look like database mutation.
- Replaced whole-file ATDD substring continuity with original semantic-line preservation: original assertions remain
  mandatory while repair-added tests may be corrected or isolated.
- Made the validated typed review-report verdict the single reviewer result channel. The compiled contract now embeds
  the minimum report schema, permits only one final completion call, prohibits dynamic/batched reviewer shell calls,
  and requires prior typed REVISE before a reviewer retry.
- Added a separate v3.5 withheld compatibility fixture that freezes the generic MySQL `Duplicate entry` signature for
  both webhook classifiers without modifying immutable v3.3/v3.4 artifacts.
- The complete repository suite passed 30/30 and the clean draft preflight passed task binding, collaboration canary,
  environment probe, and all four baseline-red/reference-green validations, including the new hidden MySQL oracle.
- This remains preparation-only. V3.4 is an immutable automated/blind FAIL and maturity remains `enforced`; a scored
  successor must be frozen separately.
- After preparation GO, separately froze `P0-candidate-v35` against framework commit `82b5f73`. Freezing does not start
  the attempt and does not change capability maturity before automated and blind results exist.
- Recorded the immutable v3.5 automated and blind FAIL. The attempt reached the first valid implementation and two
  concurrent typed reviewer PASS results without retries or repair, then stopped after 1,160.1 active seconds when
  deterministic close rejected the genuine test-only-red/production-only-green ancestry with a red-evidence path
  continuity anomaly. Stories 2–4, the broad lifecycle suite, and the Epic Process Judge therefore did not run; the
  blind Judge independently reported three HIGH missing-story findings. Capability maturity remains `enforced`.

### Full story lifecycle v3.4 typed-handoff recovery preparation

- Added an ATDD evidence hard wall: four-actor-v3 red evidence now refuses to run or persist until the test-only red tree
  is committed, clean, and descended from the ATDD actor input commit. ACEF active-ledger pointers are classified as
  control state rather than application dirt.
- Normalized the typed actor-result delimiter so `ACTOR_RESULT=PASS` and `ACTOR_RESULT: PASS` have identical semantics;
  punctuation can no longer quarantine an otherwise completed actor while non-success values remain fail-closed.
- Reviewer completion is now derived from the actual `acef-state review-completion` stdout in the child transcript,
  not copied final prose. The command path is deterministic from exact task name, and actor/report binding remains
  hash/tree checked.
- Added trace support for `functions.exec`-wrapped `exec_command`, including quoted command keys and safe coordination
  calls. Reviewers are constrained to one literal read-only command per call; dynamic or mutation-capable shell access
  still fails closed.
- This is preparation-only. V3.3 remains an immutable FAIL and capability maturity remains `enforced` until a separately
  frozen successor passes automated closeout and blind judgment.
- The clean v3.4 draft preflight passed task binding, collaboration canary, environment probe, and baseline-red/
  reference-green validation for all four unchanged frozen stories. This authorizes a separately frozen scored
  candidate but does not change maturity or the v3.3 result.
- Separately froze scored attempt `P0-candidate-v34` against framework commit `1deadd4`, with the unchanged task,
  quality gates, stop rules, and measured budget. Freezing the attempt does not change capability maturity before its
  automated and blind results are recorded.
- Recorded the immutable v3.4 automated and blind FAIL. The targeted typed-handoff repairs allowed all four stories to
  execute and reduced true coordination idle to 6.6 seconds, but S4 exhausted two repair cycles and reached REPLAN,
  tool calls exceeded budget, reviewer completion/retry topology still had process violations, and the blind Judge
  found one HIGH MySQL compatibility regression. Capability maturity remains `enforced`.

### Full story lifecycle v3.3 preparation hardening

- Extended offline ATDD authenticity checks to recognize PHPUnit exception contracts and namespaced PHP production
  references. The archived Story 1 red test is now a permanent golden regression, while test-framework-only PHP still
  fails authenticity.
- Added a required baseline-red/reference-green preflight for frozen task catalogs. Every story must provide a canonical
  patch whose changed paths stay inside the story envelope, applies cleanly to the pinned source, turns the exact focused
  oracle green, and leaves frozen fixtures unchanged.
- Corrected the frozen Story 2 ATDD constraint to require one resolver call and one Gate evaluation. Corrected Story 4
  scope to include the ingress dedup service; a bounded, non-scored dry-run then closed it in one actor invocation.
- Split harness waiting into total wait, productive delegated execution, and coordination-idle wait. Existing budget
  profiles retain their historical total-wait semantics; only the new `v33-measured` preparation profile budgets idle
  coordination without raising the 2,700-second/38% ceiling.
- Compiled four-actor prompts now prohibit recursive ACEF/BMAD workflow-document loading, cap initial task reads, state
  story-specific ATDD constraints, and trigger a typed bottleneck return after ten active minutes without progress.
- V3.3 artifacts remain draft and non-scored. `pilotRunAllowed: false` is enforced, and capability maturity remains
  `enforced` until a separately bound scored candidate passes every product, process, and budget gate.
- After all preparation gates passed, separately froze scored attempt `P0-candidate-v33` against framework commit
  `d339a61`. This preregistration authorizes one measured run but does not change capability maturity before its
  automated and blind results are recorded.
- Recorded the immutable v3.3 automated and blind FAIL. The run reduced active time, aggregate input tokens, tool calls,
  and invocations relative to the also-incomplete v3.2 P0, while measuring only 4.8 seconds of true coordination-idle
  wait. It still failed product and process closeout because typed handoffs were not atomic or machine-carried: stale
  red-evidence binding, punctuation-sensitive actor result parsing, and copied reviewer report paths quarantined the
  stories before Epic close. Capability maturity remains `enforced`.

### Full story lifecycle v3.2 recovery candidate

- Preserved the v3.1 P0 as an immutable FAIL: product oracle verification passed, but the run exhausted its 21 actor
  invocations before delta re-review and Epic Judge closeout, skipped the one required lifecycle integration command,
  and exposed auxiliary readiness reports in otherwise control-only story-close commits.
- Fixed blind-judge packet validation so frozen `testPaths` are product artifacts alongside production `allowedPaths`;
  protected harness/control paths remain rejected.
- Added the separately preregisterable `v32-empirical` budget profile. Its 25-invocation hard cap is derived from the
  observed 21-invocation partial run plus the two required delta reviewers, mandatory Epic Judge, and one infrastructure
  retry buffer; token, tool, active-time, and harness-wait ceilings remain unchanged.
- Product acceptance criteria are now rendered explicitly into every story actor contract. Story-close instructions
  explicitly exclude readiness/reuse working notes and require staging only the gate-bound package paths.
- Recorded the immutable v3.2 P0 automated/process/blind FAIL. The run admitted the blinded Judge and stayed within
  actor, token, tool, and active-time ceilings, but failed deterministic story close, product completion, exact broad
  closeout, and the 38% harness-wait ceiling. Capability maturity remains `enforced`, not `proven`.

### Full story lifecycle v3.1 recovery candidate

- Added story-scoped final-tree binding: deterministic gates freeze the story's explicit production/test paths, so
  later independent stories no longer invalidate earlier PASS packages while same-scope changes still do.
- Added the read-only `acef-state review-completion` command and transcript enforcement. Reviewer completion payloads
  now bind the active run, exact reviewer, story, phase, commit, tree, report bytes, and SHA-256 before acceptance;
  missing or invalid payloads stop rather than opening an unbounded reviewer follow-up.
- Added explicit per-story test envelopes to the P0 task contract and included them in scope/oracle enforcement.
- Added the exact scored SQLite story oracle to catalog preflight and timed-launch prechecks. It must produce a genuine
  behavioral red; migration/bootstrap/dependency failures are rejected. Broad tests that require the project's
  unsupported full SQLite migration chain are excluded from the frozen story test envelope.
- Added the separately preregisterable `v31-empirical` budget profile. It preserves the 17/21 actor and 180-minute hard
  topology/time bounds while freezing 50M input-token, 520 tool-call, and 2,700-second/38% harness-wait ceilings from
  the prior incomplete observation.
- Capability maturity remains `enforced`; the v3.1 P0 and blind judgment must pass before any `proven` claim.

### Full story lifecycle v3 removes duplicate assurance passes

- Added the versioned `four-actor-v3` Full-flow contract for new runs while keeping missing/`six-actor-v2` active-run
  state readable and closeable. Guarded remains an additive assurance profile, not another lifecycle.
- Reduced each new Full story to four mandatory independent actors: ATDD, Development, Code Review, and report-only
  Patch Assurance. Code Review and Patch Assurance inspect the same implementation tree in parallel; findings return
  to a scoped Developer and only affected review areas rerun.
- Replaced the mandatory per-story Process Judge with a deterministic story-close gate. A Story Process Judge is
  dispatched only for a waiver, evidence conflict, non-mechanical ambiguity, or gate anomaly and cannot override a
  failed mechanical check. Epic Process Judge remains mandatory.
- The close gate computes actor separation, red-before-green ancestry, final-tree review/assurance, successful runner
  proof, unresolved severity counts, and report/scope hashes. Historical red evidence remains integrity/ancestry-bound
  after implementation; final-tree evidence must be fresh.
- Bound every v3 actor, review report, repair receipt, conditional Judge decision, and gate to the active run and
  contract. Developer repair and conditional adjudication now use typed, hash-checked artifacts; PASS/REPLAN are
  terminal and stale records from another run cannot consume or satisfy the current lifecycle.
- Strengthened ATDD red evidence to require a real test-runner failure over production behavior, the same command green
  later, and preservation of the critical assertion while allowing additive regression coverage. Epic close persists
  and verifies the frozen expected-story inventory rather than trusting whichever story happens to remain active.
- Bounded v3 execution at two repair cycles per story, 17 base actor invocations for a four-story epic (21 maximum),
  focused tests per story, one broad suite at epic close, and separate harness-wait accounting.
- Hardened the v3 experiment oracle around aggregate conductor/child cost, exact-one broad suite, terminal zero-write
  infrastructure retries, immutable regular-file close packages, reviewer completion blobs, and a harness-launched
  fresh blind Judge that receives only the frozen product contract and product diff.
- The completed v2 candidate rerun took 11,174.7 active seconds, used 56,626,888 input tokens and 437 tool calls, and
  correctly failed process closeout despite a green integration command. Its mandatory 25-actor topology and repeated
  review/closeout passes are measured recovery evidence, not a speed success.
- Capability maturity is `enforced` in this source tree after deterministic tests; it remains uninstalled in target
  repositories and unproven. The frozen v3 candidate manifest is preregistered against implementation commit
  `23b58de`, before Stage 0 and the real-world run.
- The first preregistered v3 P0 run finished in 5,270.2 active seconds, 52.8% faster than the v2 rerun, but failed
  automated closeout, blind product judgment, and token/tool/harness-wait budgets. It therefore remains an enforced
  controlled canary rather than a proven or installable default. The run also exposed missing real-environment
  preflight and repository-wide story-tree freshness problems for a separately preregistered successor.
- Hardened experiment recovery after the run exposed two harness defects: full diff capture now tolerates patches
  above Node's default synchronous buffer, and pinned-client provenance hashes preserve raw binary bytes.

### Full + Guarded candidate recovery policy hardened

- Replaced the one-strike ATDD stop with a bounded exception path: one fresh report-only adjudication, followed only
  when upheld by one findings-hash-bound, test-artifact-only correction. Initial ATDD now targets the critical vertical
  path while mapping regression-only acceptance criteria for expansion before test review.
- Bound correction authority through a durable pre-dispatch record because pinned Codex transcripts encrypt spawn
  messages at rest; the oracle now reads real `custom_tool_call/input` events and audits adjudication as report-only.
- Added an installed typed schema/parser for that correction record, requires the binding to exist unchanged in the
  correction child's spawn commit, and deny-lists arbitrary shell execution through a narrow read/test allowlist.
- Added dependency-aware quarantine semantics so a failed story blocks its transitive dependants without discarding
  evidence from independent stories; shared safety invariants still halt the run.
- Froze the mandatory actor inventory before execution and made unexpected closeout/coverage/trace/statistics actors an
  oracle failure. Lifecycle duplication is now measured from typed collaboration dispatches rather than textual command
  mentions.
- Kept the capability at `enforced`. These changes repair mechanisms exposed by the failed first P0 pair; a new complete
  matched pair is still required before canary authorization.
- Preregistered that fresh matched pair in `manifest-p0-r2.json`; it pins candidate commit `041d849`, preserves the
  original product task and caps, and scores cost only after both product and process gates pass.

### Execution/assurance real-world pilot preregistered

- Added a separate execution/assurance experiment harness and a fixed 16-attempt paired pilot comparing legacy commit
  `d8b816c`, the candidate architecture, and Repo Native calibration without mixing results into the older lane studies.
- Added six deterministic pre-pilot traps for Guarded routing vocabulary, oversized-scope rejection, duplicate lifecycle
  detection, worker scope enforcement, dirty-worktree refusal, and pre-timer environment diagnosis.
- The first harness shakeout exposed missing Guarded synonyms and a contained-delete false positive. Expanded risk routing
  for OAuth/SSO/access-control/credentials/secrets/encryption/key rotation/subscriptions/refunds/data deletion/consent/
  retention/entitlements while keeping localized CSS/copy/docs deletion outside Guarded.
- Capability maturity remains `enforced`: Stage 0 and the paired/live campaign must pass before `proven` or `installed`.
- The pinned clean-tree Stage 0 run passed 6/6. This authorizes the paired pilot, not a speed/quality or installation
  claim.
- Added an immutable pilot catalog preflight that resolves every task selector, pinned source commit, fixture, and
  dependency tree before agent timing starts. Missing Browser RTS and MVT dependencies were found during shakeout and
  prepared before the scored preflight.
- Pinned the stochastic runtime to Codex CLI 0.146.0 / `gpt-5.6-sol` / high reasoning and added the first single-task
  Repo Native executor. It records raw transcript and diff hashes, independent lifecycle counts, scope/fixture checks,
  timing and token usage, but remains provisional until a blind artifact-only Judge passes it. ACEF treatment execution
  fails closed until exact-version lifecycle orchestration is wired.
- Preserved and invalidated the first Native sentinel after its independently captured patch proved non-replayable:
  a trimming helper removed the final newline. Diff capture now preserves exact bytes and has a regression test; the
  attempt must rerun fresh and is excluded from scored analysis despite its automated oracle passing.
- The fresh Native sentinel rerun passed its automated oracle, replayed patch, and treatment-blinded independent Judge
  with zero Critical/High/Medium findings or scope/test violations. It took 76.1 active seconds and 352,235 measured
  input tokens. This is calibration evidence only; no legacy/candidate ACEF pair has completed.
- Added exact-version Full + Guarded pilot preparation: each arm clones the pinned framework commit, installs its tools,
  skills and hook into an isolated pinned Jakomeet clone, seeds all four hidden regressions, and assigns the complete
  outcome to a fresh conductor. Compact ACEF treatment cells remain fail-closed rather than silently using current HEAD.
- The first P0 preparation exposed a harness-ordering bug before the agent clock: Laravel's gitignored storage/cache
  skeleton was created after Composer package discovery. Epic preparation now creates it before dependency linking;
  the failed preparation is not a scored attempt.
- Completed the first scored P0 Full + Guarded pair. Legacy took 26,151.6 active seconds and produced a blind-Judge product
  PASS, but failed process closeout after recursive epic review/coverage work left the run blocked. Candidate stopped
  fail-closed after 4,632.8 seconds when Story 2 ATDD returned REVISE, and the blind Judge found three unfinished High
  product outcomes. The candidate used 82.3% less active time and 82.0% fewer tool calls, but this is fail-fast cost
  evidence rather than delivery-speed superiority because the original outcome was incomplete. Capability maturity
  remains `enforced`; see `docs/experiments/execution-assurance-v2/P0_RESULT.md`.

### Execution workflow and assurance separated

- Replaced the overloaded Guarded lane model with two typed dimensions: execution workflow (`quick-fix`,
  `lightweight`, `full-bmad`) and assurance profile (`baseline`, `guarded`). User-facing names are ACEF Fix, ACEF
  Standard, and ACEF Full (BMAD v2).
- Added active-run v2 state, explicit migration for ambiguous legacy `lane: guarded` runs, v2 control dosing, and a
  monotonic overlay resolver so Guarded can add controls but cannot weaken the selected workflow.
- Updated routing, authorization, status/next output, closeout, pre-commit checks, review circuit breaker, test floor,
  and actor separation. Guarded Fix/Standard use compact developer/Judge separation; only ACEF Full requires the six
  BMAD phase actors.
- Closeout now shares identical validator executions across multiple control IDs, so current-context and evidence
  provenance remain separately declared controls without rerunning the same expensive validation.
- ACEF hook activation now requires ACEF-owned markers or typed ACEF state. Stock `.bmad`, `_bmad`, and
  `_bmad-output` directories no longer activate ACEF by themselves.
- Direct remains retired compatibility state during the upgrade bridge; it is not an execution workflow and no new
  Direct admission is allowed.

### Direct admission retired after treatment recheck

- Re-ran the 10 changed direct-treatment cells against the original 20 fixed baseline/lightweight controls after the
  compact-context/help changes. Direct improved versus its first measurement but still missed the stop thresholds:
  +60.8% paired input and +112.8% paired runtime versus baseline, +147.9% runtime versus lightweight, 25% context
  misses, 6/8 eligible direct closeouts, and 1/2 correct provider promotions.
- Retired new direct-run admission rather than adding more process. Contained reversible single-boundary/single-surface
  work now stays outside ACEF and uses the repository's native workflow plus focused verification.
- Kept direct schema/parser/status/next/hook/closeout compatibility so existing `ACEF_DIRECT_RUN.json` records can be
  read, closed, or promoted. `acef-state direct-run` mechanically rejects a new run ID.
- Added `docs/ai/capabilities/direct-admission-retirement.json` with status `enforced`.

### Run authorization and bounded review loops

- Added one shared run-authorization predicate for `acef-status`, `acef-next`, `acef-codex-guard`, the cross-client
  hard-wall hook, and pre-commit validation. Typed writes now fail closed when the active run is missing, non-active,
  points at another ledger/context, or disagrees with the worker scope.
- `acef-state worker-scope` now requires an active matching story and binds the active `runId` automatically. Legacy
  scopes remain parseable but are not authorized for writes until regenerated.
- Replaced the prose `2× REPLAN` counter with a typed guarded/full-BMAD review circuit breaker: two consecutive
  non-`PASS` review/Judge gate verdicts for the active scope stop the patch loop and require `REPLAN/SPLIT`. The legacy
  `replan-counter` check remains as an alias.
- Wired both checks into guarded/full-BMAD pre-commit and closeout without adding a new agent, review round, or evidence
  artifact. The authorization benchmark is enforced at p95 ≤50 ms.
- Added `docs/ai/capabilities/run-authorization-enforcement.json` and
  `docs/ai/capabilities/typed-review-circuit-breaker.json`, both at status `enforced`.

### Direct-lane entry reduction

- `acef-state direct-run --help` now provides the complete start/close/promote command surface without schema or source
  inspection.
- `acef-next` treats `ACEF_DIRECT_RUN.json` as the entire direct context boundary and emits the direct write/stop packet
  without bootstrapping typed active-run, ledger, context, or worker artifacts.
- The treatment recheck completed and still failed the cost/reliability thresholds; new direct admission is retired.

### Direct task lane

- Added the `direct` lane for reversible copy, style, localized UI/config/docs/mechanical changes and localized bug
  fixes that stay inside one technical boundary.
- Added `schemas/direct-run.schema.json`, `acef-state direct-run`, and
  `docs/ai/ACEF_DIRECT_RUN.json`: one compact record carries scope, acceptance, reversibility, changed paths, focused
  command/exit verification, handoff, and promotion disposition.
- Added `direct-lifecycle` validation and wired `lane-selection`/`lane-closeout` so inferred high-risk paths,
  multiple product surfaces, undeclared changed paths, failed verification, and obvious test weakening block direct
  closeout and require promotion.
- Direct intentionally skips adapter refresh, preflight, active-run bootstrap, worker scope, separate ATDD/reviewer/
  Process Judge actors, delivery ledger, evidence manifests, runner proof, gate verdict, and phase commits.
- Extended the control-dosing manifest and installer/test coverage for the fifth lane. Added
  `docs/ai/capabilities/direct-task-lane.json` with status `enforced`.
- Added deterministic disposable-clone dogfood on Agentbus and Scientificfloor: both direct closeouts passed and an
  intentional migration-shaped change was rejected. The 30-real-task empirical threshold remains pending, so the
  lane is not yet `proven`.
- Preregistered a 30-run direct-lane measurement across baseline/direct/lightweight and Codex/OpenCode, with four
  direct-eligible real-repo tasks plus one provider-integration promotion trap. The empirical harness now records
  direct state, closeout, promotion, implementation-attempt, scope, token, runtime, and quality outcomes.
- Completed the 30-run matrix with 0 invalid runs. After data-quality review, eligible pass was 8/8 baseline, 6/8
  direct, and 8/8 lightweight; direct contract closeout was 6/8, provider promotion 1/2, and context misses 25%.
  Paired task/client medians showed direct used 190% more input and took 175.1% more runtime than baseline, while
  taking 203.3% more runtime than lightweight. The capability remains `enforced`, not `proven`.
- Preserved raw scoring and added a documented oracle review: an exact source-string check falsely rejected four valid
  config-driven locale implementations. Primary cost analysis now uses paired within-client deltas so incompatible
  Codex/OpenCode token scales are not pooled.
- Refined lane triggers: provider integration, realtime, concurrency/fencing, and state-machine work route to guarded;
  generic feature and multi-surface labels no longer automatically force full-BMAD, while direct still promotes on
  multiple inferred surfaces.

### Cockpit borrow table verified — Watchfire/Archon/Chorus decoded

- Added `docs/research/cockpit-tool-decodes-2026-07-07.md`: three borrow-table tools decoded by parallel research
  agents. All verdicts BORROW, none USE — validates buy/borrow-the-shell, keep-authority-in-ACEF.
- Borrow table in `method/ACEF_COCKPIT.md` updated with verified identities (Chorus is chorus-ai.dev, not chorus.sh)
  and the concrete steals: per-task kernel sandbox from scope contract (Watchfire), DB-state pause gates +
  fail-closed evaluators (Archon), permission-bit tool registration + human-only Done (Chorus).
- Negative finding recorded: even Archon's autonomous path trusts model self-report — self-certification remains
  mechanically unsolved in the market; `product_done.self_certified_only` stays load-bearing.

### Cockpit direction reassessed — v1 narrowed to read-only state viewer

- `method/ACEF_COCKPIT.md` reassessed (2026-07-07): the original doc conflated three products. State viewer
  (`acef-cockpit-status` JSON + terminal table) stays as v1; context compiler + tool proxy deferred (token-cost
  motivation superseded by v2 measurements; context-mode covers bounded tool output today); execution shell bought
  (Nimbalyst/Conductor-class), not built.
- V1 JSON contract now carries `product_done` (persona-walk evidence, `self_certified_only`, `stale_evidence`) from the
  O2 dev-done-vs-product-done finding, and a `decision_queue` aggregating product-risk `DECISION`/`UNVERIFIED` items.
- Success criteria rewritten operator-shaped (visibility questions answerable without grepping), not token-shaped.
- Added `docs/ai/capabilities/cockpit-state-viewer.json` with status `documented-only`. The JSON/table contract is
  method documentation; no schema, artifact, `acef-cockpit*` script, tests, or installer exists yet.

### Product risk model documented

- Added `method/PRODUCT_RISK_MODEL.md`, a domain-agnostic documented-only method for pre-development product risk
  analysis: feature model -> business invariants -> generic operators -> disposition.
- Added `docs/ai/capabilities/product-risk-model.json` with status `documented-only`. No ACEF workflow, review lens,
  schema, validator, installer, or target-repo integration enforces this method yet.

### V2 honest-down + first thinning move

- README "ACEF v1 Status" → "ACEF v2 Status": token-cost claim superseded (+20%/+24% codex, ≈0% opencode), quality
  claim honest-downed (no lane edge on bounded single-step tasks; controls' remaining documented value is the
  unattended/multi-session/multi-worker regime, which is unmeasured). `VALIDATION_PLAN.md` gained a v2 Result
  section resolving the v1 sample caveat against the claim; `STABILIZATION_ROADMAP.md` records the active posture.
- First thinning move per the WS4 decision: `runner-proof` removed from the guarded lane bundle and downgraded to
  `required-if-triggered` (unattended/async) in `control-dosing.json`; the parser hard-rule and both control
  rationale dosing tables updated. Full-BMAD keeps runner-proof required. Backstop: the skeptical re-run, as the
  dosing table always documented. Worker-scope, gate-decision, and test-integrity guards are explicitly NOT
  thinned without the multi-step epic measurement.

### V2 matrix result: cost fixed, quality edge did not replicate

- Ran the full 72-run v2 matrix (12 tasks × 3 lanes × 2 clients, 0 invalid): `runs/results-v2.jsonl`, write-up in
  `docs/experiments/empirical-validation/report-v2.md`.
- WS3 validated: codex ACEF-lane overhead fell from +39%/+65% (v1) to +20%/+24%; opencode lanes now at/below
  baseline. The worker short-circuit was the entire treatment change.
- Quality: no lane differentiation. Oracle-adjusted pass is 23/24 baseline, 24/24 lightweight, 23/24 guarded; the
  purpose-built provocations (scope bait, test bait, hidden findings, wiring, persistence, multi-system) were
  passed by every lane; zero scope violations or fixture tampering. The single genuine lane split: baseline
  opencode left the traversal security regression unfixed.
- Instrument: 6 of 8 raw failures were one exact-string oracle bug (turkish task demanded literal `setLocale('tr')`
  while all six agents made the test pass) and 1 was marker-retention noise — the oracle-validity lesson recurred
  in an oracle authored after writing the lesson down.
- Decision per the pre-committed WS4 rule (outcome three): keep the freeze, honest-down the quality claim, begin
  thinning always-on controls whose only justification is defect-catching on bounded single-step tasks; next
  instrument frontier is multi-step epic benchmarks where drift controls plausibly matter.

### Epic benchmark (v3): 6/6 epic_pass — multi-session regime measured

- Ran `acef-epic-authz-v3` on jakomeet worktrees: one real 4-story deferred-work epic × 3 lanes × 2 clients, each
  story a fresh agent session (24 sessions, 0 errors, 0 scope violations). All six runs epic_pass with green
  integration. Full write-up: `docs/experiments/epic-benchmark/report-epic.md`.
- Cost pricing: lightweight is free per epic (+3.3% codex / −0.4% opencode vs baseline); guarded costs +25.7% /
  +15.5% for enforcement that was never provoked. Baseline resumed correctly from story prompts alone at this
  epic size. Honest scope: n=1 epic, sequential single worker, per-story oracles — parallel/ambiguous/long-horizon
  regimes remain the open frontier.
- Instrument hardening en route (six real bugs): Laravel storage skeleton in worktrees, manifest `setupDirs`,
  `verbatimSymlinks` for composer path repos, porcelain-trim phantom violations, `--no-verify` harness checkpoints
  vs target-repo hooks, per-story guarded actor identity (`acef-state` immutability honored). Documented opencode
  worktree `external_directory` auto-reject flake (~10%, purged + rerun).

### WS3 cost round: worker short-circuit on ACEF reference reads

- Pilot transcript audit found the dominant ACEF-lane token overhead: `skills/acef/SKILL.md` said "Always for
  concrete ACEF work: read OPERATING_MODEL + DELIVERY_RULES" (~920 lines), workers obeyed, and chat-completion
  clients resend the whole context on every subsequent tool call (guarded codex: 14 tool calls → 583k input tokens
  vs 215k baseline on the same task).
- Subtractive fix (freeze-compatible): SKILL.md worker short-circuit — when `docs/ai/ACEF_CURRENT_CONTEXT.md`
  exists, a scoped worker reads NO references/operating model/delivery rules/full ledger; reference reads are
  conductor/router-only. Mirrored into `method/CONTEXT_POLICY.md` with the pilot numbers, the benchmark
  current-context header, and both ACEF lane prompts in the harness.

### V2 matrix: 5 scouted tasks accepted (11 tasks / 66 runs)

- Fanned roster-task scouting to three agentbus codex workers (one per target repo); every proposal gated through a
  local dry-run (anchors unique at pinned commit, verify red after seed, green after canonical revert, oracles green
  on clean tree). Accepted 5: deepl reuse-helper, unprefixed-turkish ambiguous-default, admin api-keys multi-file
  wiring (+ fixture oracle), public api-key durable-persistence (+ fixture oracle), builder-state multi-system.
- Rejected 2 with recorded causes (scouting the dirty working tree instead of the pinned commit; a seed whose defect
  the chosen test cannot detect). Both scouting rules added to `task-gaps.md`; detaysoft scope-bait retry pending.

### V2 pilot run + findings

- Ran the 12-run pilot matrix (`acef-empirical-v2-pilot`): baseline 3/4 pass (recall 5/6), lightweight 4/4 (6/6),
  guarded 4/4 (6/6); zero scope violations; `fixtureUnchanged` never fired. First same-client lane split: opencode
  failed the gather-modifier task under baseline, passed under lightweight/guarded. Results in
  `docs/experiments/empirical-validation/runs/results-v2-pilot.jsonl`; full write-up in `task-gaps.md`.
- Pilot caught a live regression: the lane-aware `precommit-gate` fails guarded commits made before any gate verdict
  exists, killing guarded runs at the actor/scope binding commit. Harness fix: `commitAll` supports `--no-verify`
  for the runner's own scaffolding commits (the agent under test never commits). Logged framework follow-up: a
  bootstrap exemption for state-binding-only commits (freeze-compatible bug-fix candidate).
- Authoring lesson recorded: descriptive seed markers un-hide hidden defects; remaining roster tasks use
  non-descriptive markers.

### V2 plan: control freeze + validation/optimization roadmap

- Added `docs/experiments/empirical-validation/task-gaps.md` (WS2 gap analysis): all five v1 tasks share the
  single-file/seeded-line/provided-test shape, so recall ≡ pass by construction and scope/test-integrity metrics never
  fire; `detaysoft-download-traversal`'s 0/6 is partly an exact-string oracle-validity bug. Includes a 10-task v2
  candidate roster covering the eight missing defect classes (multi-file wiring, test-weakening bait, scope bait,
  hidden second defect, adjacent regression, reuse-before-create, durable persistence, ambiguous default) and names
  the pilot pair (`browser-rts-test-bait`, `mvt-second-defect`) plus the two additive harness extensions they need
  (`fixture-unchanged` expectation, per-finding recall).
- Authored the v2 pilot pair in `docs/experiments/empirical-validation/manifest-v2-pilot.json` (12 runs,
  experiment `acef-empirical-v2-pilot`): `browser-rts-gather-modifier-bait` (test-weakening bait — the benchmark
  script is inside `allowedPaths`, tamper caught by the new `fixtureUnchanged` expectation) and
  `mvt-people-archive-leak` (two seeded soft-delete leaks; the list-route leak is invisible to the provided vitest
  file, scored via per-task `knownFindings` recall so recall is finally independent of pass rate). Extended
  `scripts/acef-empirical-validation` additively: `fixtureUnchanged` expectations, `knownFindings` per-finding
  recall, manifest-declared `expectedRuns`. Both tasks dry-run verified in disposable clones (seed red → canonical
  fix green; hidden defect confirmed invisible to verify). New coverage in `scripts/test-acef-empirical-validation`.

- Added `docs/v2-validation-optimization-plan.md` — the v2 round plan: (1) freeze the enforcement surface, (2) expand
  the benchmark task set with 8–10 seeded-defect, lane-sensitive tasks (the v1 quality claim rests on an effective
  n=1), (3) run the already-scoped cost round (shorter worker prompts, narrower reads, one ledger load per phase,
  per-role Epic Context Packs), (4) rerun the matrix against the v1 `results.jsonl` baseline and decide:
  unfreeze control, iterate cost, or start thinning checks that never caught a defect.
- Declared the **control freeze** in `method/STABILIZATION_ROADMAP.md`, `method/CONTROL_RATIONALE.md`, and the skill
  reference: `acef-process-validator`, `control-dosing.json`, and the guard hooks accept bug fixes only — no new
  checks, gates, dosing rules, lenses, or capability records — until the v2 matrix verdict exists. This restores the
  roadmap's own "measure before adding control" rule, which the recent control-dosing/self-certification round bypassed.

### Gate self-certification guard

- Tightened typed `gate-verdict` validation so guarded/full-BMAD PASS gates must be decided by a real Process Judge
  actor: both phase and role must be Process Judge, and the implementation/developer actor cannot certify its own work.
- Added regression coverage for developer-decided gates and Process Judge actors mislabeled as Developer.
- **Wired the guard into the commit path.** The hardened self-certification guard only helps if it runs; previously the
  pre-commit hook ran only `lean-evidence`, so a conductor could mint a developer-self-decided PASS gate and commit
  without ever invoking closeout (the STU360-001 hole — certification path and commit path had diverged). Added a
  lane-aware `precommit-gate` meta-check that the pre-commit hook now calls: guarded/full-BMAD commits must clear
  `gate-decider` **and** `lean-evidence`; quick-fix/lightweight only `lean-evidence`.
- Added `gate-decider`, a narrow tree-independent check that enforces **only** the decider rule: a guarded/full-BMAD PASS
  gate must be decided by a genuine, distinct Process Judge, never the developer. `precommit-gate` uses it instead of full
  `gate-verdict` on purpose: `gate-verdict`'s surface-inference and durable-persistence requirements are tree-sensitive
  and can over-classify read-only guarded work at commit time. Full `gate-verdict` remains the closeout/CI check, where
  the tree is clean and surface/persistence evidence is intentionally being certified. Regression coverage: good guarded
  gate passes; a developer-decided gate blocks the commit; a guarded commit can pass `precommit-gate` even when full
  `gate-verdict` is red for surface/persistence evidence; a lightweight lane does not require `gate-decider`.
- Known follow-up (logged via STU360-001 dogfood): full `gate-verdict` over-classifies read-only `ui` surfaces — it infers
  surfaces from path heuristics and the whole dirty working tree and demands persistence from read-only code paths, instead of
  honoring an explicit read-only/`ui` surface classification and the scope's own changed paths. Closeout/CI surface +
  persistence enforcement should defer to the declared surface; tracked separately.
- Capability status: see `docs/ai/capabilities/gate-self-certification-guard.json`.

### Control dosing validator

- Added a machine-readable control dosing manifest (`method/control-dosing.json`) and schema
  (`schemas/control-dosing.schema.json`) that classifies ACEF integrity controls by lane, role, dose, enforcement level,
  and fallback backstop.
- Added `acef-process-validator --check control-dosing` and wired `lane-closeout` to select control checks from the
  manifest's per-lane bundles instead of a parallel hardcoded control list.
- Added `lean-evidence` to the dosing manifest and made `checkLeanEvidence` consume its lane dose: quick-fix gets light
  evidence, lightweight gets compact evidence, and guarded/full-BMAD keep full closeout evidence.
- `install-acef-tools` now installs the default manifest to `.acef/control-dosing.json`; target repos must refresh ACEF
  tools before this check is available locally.
- Capability status: see `docs/ai/capabilities/control-dosing-enforcement.json`.

### Surface-done closeout contract

- Added `scripts/acef-closeout-verify` (with `scripts/lib/acef-surface-contract.js` and `scripts/test-acef-closeout-verify`): a code-grounded, per-surface "done" verifier that derives required evidence from the project adapter's per-surface registry and enforces fail-closed rules.
- Enforces: **cold-process / separate-process fresh-read** for persistence surfaces (a same-process read does not count); **reachability** as separate evidence (an isolated render that nothing links to is `partial`, not pass); fail-closed on unknown surfaces (no nearest-match); no story self-downgrade of a surface its goal owns; human-signed, versioned waivers recorded in output.
- Added `schemas/surface-evidence.schema.json`.
- Reconciled into `method/DELIVERY_RULES.md` as the rule **"Done = surface-proven."**
- CI-gated: `validate.yml` runs the full `test-acef-*` matrix and a closeout integration check.

### Audit remediation (Tier 1)

- CI now runs the **full `test-acef-*` matrix** (was only the process-validator), plus a closeout integration check.
- `scripts/install-acef-bmad-guard` now installs a packaged **git pre-commit gate** (`acef-precommit-gate.sh`) that fires the lean-evidence check on an active ACEF run (no-op otherwise).
- `acef-closeout-verify` now rejects empty or mislabeled surface-evidence records — missing required fields or an empty `goal.surfaceSet` fail-closed rather than vacuously passing — and is wired into `install-acef-tools`.
- **Fix: default ledger resolution.** `acef-process-validator`'s `findLedger` (used when `--ledger` is omitted, e.g. by the pre-commit gate) chose the alphabetically-first ledger candidate, which could resolve a legacy `ACEF_ACTIVE_LEDGER` ahead of the active run's audit and produce a false FAIL (forcing `--no-verify` commits). It now prefers `ACEF_ACTIVE_RUN.json`'s declared `ledgerPath` when present, falling back to the alphabetical scan otherwise. Regression test added.
- **Fix: pre-commit wrapper quoting.** The git `pre-commit` wrapper that `install-acef-bmad-guard` writes single-quoted the `$(git rev-parse --show-toplevel)` path, so the command substitution never expanded; the `-x` test always failed and the wrapper exited 1 on every commit — forcing `--no-verify` even when the ACEF gate itself passed. Now double-quoted and wrapped in an `if` so a missing gate does not block while a failing gate still does.
- Fixed a self-test that was red on `main`.
- Honest-up'd overstated claims in `method/RULE_ENFORCEMENT_MAP.md`, `method/TRUST_MODEL.md`, `README.md`, `method/VALIDATION_PLAN.md`, and `method/ACEF_COCKPIT.md`: evidence mechanisms detect accidental/lazy evidence gaps, not a forging agent; right-sized the quality claim to the actual benchmark; added a "not yet built" banner on COCKPIT.

### Hard-wall identity fallback

- The BMAD hard-wall previously failed-closed on **all** guarded writes when the harness did not propagate worker identity (which the Claude subagent harness never does), blocking a correctly set-up developer worker from writing any code.
- Fix: when no identity is present, the hard wall **degrades from per-actor to scope-level enforcement** — a guarded write is allowed only when the active conductor-written worker scope is in an implementation phase AND the path is in `allowedPaths`; all other cases remain denied.
- Strict per-actor enforcement is kept when `ACEF_WORKER_ID` is present in the environment. `ACEF_WORKER_ID` is env-only and cannot widen authority beyond the scope's `workerId`, so the conductor-written scope file remains the unforgeable trust anchor.
- Documented limitation added to `method/TRUST_MODEL.md`: without harness identity propagation, the hard wall provides scope-phase+path proof, not per-actor proof. Raw shell writes are not path-gated.

### Goal coverage gate

- Added typed `activeGoal` and `goalCoverage` fields to `ACEF_ACTIVE_RUN.json` so story PASS and original product-goal
  completion are mechanically separate.
- Added `goal-coverage` validation: user-facing complete runs must prove visible product surface coverage and cannot use
  `foundation` or `backend-capability` stories to close workspace/staff-flow/product goals.
- Wired `goal-coverage` into full-BMAD and guarded closeout and added `acef-state active-run` flags for recording goal
  coverage metadata.

### Surface evidence quality

- Tightened existing surface-evidence validation for state-changing work: CRM/notes/tracking/finance/payment/persistence
  closeout can no longer pass on schema existence, route/render/status smoke, or in-memory/demo-store evidence alone.
- Full-BMAD/guarded `gate-verdict` and lightweight lifecycle closeout now require the evidence package to include at
  least one durable write/read signal such as DB insert/select, persisted row, fresh-request requery, or read-after-write
  proof when the work creates or mutates product state.

### Spec-readiness gate

- Added the `spec-readiness` skill as an intake-time product/spec readiness classifier for vague or risky requests before
  route dispatch, spec writing, story creation, or implementation.
- Added `schemas/spec-readiness.schema.json` and parser support for file-backed `docs/ai/ACEF_SPEC_READINESS.json`
  verdicts with `PASS`, `NEEDS_PM`, `NEEDS_DISCOVERY`, `NEEDS_BMAD`, `NEEDS_GUARDED_DISCOVERY`, and `REJECT` routing.
- Added the `spec-readiness` validator check and wired `lane-selection` so planning/execution phases that are full-BMAD,
  guarded, or risk-triggered by CRM/notes/tracking/persistence/RBAC/schema/PII/money/finance cannot proceed without a
  current `PASS` verdict.
- Installed `spec-readiness` as a default ACEF skill and added
  `docs/ai/capabilities/spec-readiness-gate.json` with status `enforced`.

### Operational friction reduction

- Allowed `acef-state evidence-run` to capture evidence while application paths are dirty, recording
  `dirtyApplicationPathsBefore` and `dirtyApplicationPathsAfter` in the evidence manifest instead of refusing to run.
  `clean-tree` remains the certification/Process Judge cleanliness gate.
- Fixed current-context semantics so typed active runs with `status: complete` can still satisfy `current-context`
  instead of failing only because the run is closed.
- Improved worker-scope hard-wall denials so stale or mismatched `ACEF_ACTIVE_WORKER_SCOPE.json` states report the active
  story, phase, worker id, allowed paths, requested path, and whether to close stale ACEF state or dispatch a matching
  worker.
- Added `docs/ai/capabilities/operational-friction-reduction.json` to classify these friction fixes as `enforced`.

### Intake decision gate

- Added `intakeDecision` to typed active runs so planning/execution phases must record the selected route, confidence,
  clarifying questions asked, inferred answers, unresolved questions, and execution approval state.
- Tightened `lane-selection` so typed runs in planning/execution fail when intake was skipped or unresolved questions are
  marked execution-approved.
- Tightened raw feature handling: low/medium-confidence work must record clarifying questions, full-BMAD/guarded work
  must record an approved interview brief, and CRM/notes/tracking/accounting/finance signals route upward instead of
  letting agents invent specs from a thin prompt.
- Added `docs/ai/capabilities/intake-decision-gate.json` with status `enforced`; target repos must refresh ACEF before
  the gate is installed there.

### Quick-fix envelope and test-integrity gate

- Expanded quick-fix from a narrow file fence to a computed fix envelope: implementation paths, relevant tests, fixtures,
  smoke/route files, and shared resources.
- Added quick-fix test-integrity metadata to `ACEF_LIGHTWEIGHT_RUN.json` and validator checks for edited tests: tests
  must be inside the envelope, assertion counts cannot drop, skip/only/todo/xfail patterns are rejected, matcher
  loosening can be flagged, and each test edit must name the implementation reference it still exercises.
- Tightened parallel quick-fix guidance: workers need disjoint files and disjoint shared resources, not just
  non-overlapping filenames.

### Installation versioning and update path

- Added `docs/ai/ACEF_INSTALLATION.json` as the target-repo ACEF installation stamp. Repo-local tool, skill, and guard
  installers update the same manifest with the ACEF source path, source commit, branch, dirty/clean source state,
  installed components, and refresh command.
- Added `scripts/update-acef-installation` and installed it into target repos as `.acef/bin/update-acef-installation`.
  The target-local updater resolves the original ACEF checkout from `ACEF_INSTALLATION.json` and refreshes tools,
  skills, guard hooks, schemas, workflows, and the stamp.
- Updated `acef-status` to report the installed ACEF source version and installed components, and to block readiness when
  the installation manifest is missing or invalid.
- Added installer tests proving both the manifest stamp and the target-local update command.

### Lane and surface enforcement

- Added runner-proof validation for typed evidence manifests and lightweight surface evidence. Evidence artifacts must now
  carry command/exit metadata and a deterministic runner proof, so fake prose logs cannot pass merely by matching a hash.
- Added the `quick-fix` lane for BMAD-style narrow bug fixes, with required repro, before-patch, after-patch, independent
  review, and touched-surface evidence in `docs/ai/ACEF_LIGHTWEIGHT_RUN.json`.
- Added `lane-selection` and `lane-closeout` validator checks so quick-fix, lightweight, full-BMAD, and guarded lanes
  have mechanical selection and closeout bundles.
- Added touched-surface validation for lightweight runs and typed full-BMAD/guarded PASS gates.
- Added path-name inference for obvious undeclared surfaces and high-risk triggers so hidden UI/API/auth/payment-style
  changes cannot pass solely by omitting them from the run declaration.
- Tightened guarded closeout so guarded work inherits full typed closeout checks plus the guarded test floor.
- Added capability records for quick-fix, lane closeout, lean surface validation, and full-flow surface validation.

### Capability completeness

- Added `capability-change` validation so ACEF flow/gate/role/enforcement changes must declare their implemented layers
  instead of being reported as complete after markdown-only edits.
- Added `schemas/capability-change.schema.json` and parser support for capability records.
- Added `docs/ai/capabilities/capability-change-completeness.json` as the proven record for this mechanism.
- Added `docs/ai/capabilities/implementation-shape-review.json` to classify implementation-shape review honestly as
  `wired`, not enforced.
- Added `AGENTS.md` as a fresh-session entry point that tells agents to inspect capability records and run
  `capability-change` before reporting ACEF implementation status.
- Updated the static documentation site to expose the changelog/capability-record model and the wired status of
  `implementation-shape-review`.

### Implementation shape review

- Added `skills/implementation-shape-review/` as an optional report-only review lens for finding simplification/refactor
  candidates before a separate patching actor touches code.
- Wired the lens into `scripts/install-acef-skills --review-lenses`.
- Added installer and metadata tests for the lens.
- Limitation: this lens is not currently a mandatory story or epic gate.

## 2026-06-25 and earlier reconstructed milestones

These entries are reconstructed from git history and summarize broad phases rather than every commit.

### Surface and runtime evidence gates

- Added validation for surface input-output evidence.
- Added test-authenticity gates to reject hollow-green tests, status-only smoke, silent skip patterns, and fake framework
  shims.
- Added guidance that runtime entrypoints, CMS/admin paths, UI round trips, and author-controlled input bindings require
  real-path evidence.

### Workflow and state machinery

- Added workflow-as-code guardrails, including lightweight workflow validation.
- Added `acef-next` next-action helper and `acef-status` fresh-session status helper.
- Added typed ACEF state foundation and operationalization.
- Added worker result rollup substrate.

### Review and lightweight lanes

- Added bounded `bug-hunter` review lens and piloted it through PR review.
- Added codemap-backed PR review profile validation.
- Added lightweight lane lifecycle validation.
- Archived external QA skills that were not ACEF-native.

### Context and token policy

- Ran the context retrieval pilot and rejected retrieval-provider default changes where token reduction did not preserve
  quality/scope.
- Defined the current optimization target: shorter worker prompts, narrower reads, less repeated ledger loading, and
  better per-role context packs.

### v1 empirical validation

- Ran the empirical validation matrix across repositories/stacks/clients.
- Closed the ACEF v1 policy loop: ACEF is evidence-backed for quality/process control, not yet for token-cost reduction.
