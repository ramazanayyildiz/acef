# Feedback loop (method self-improvement)

Status: active, 2026-10-25 (owner decision). ACEF improves its own instructions from experience: Karpathy's "system
prompt learning", where the instructions change with use and the model weights do not. The owner already asks every
agent that uses ACEF for its pros and cons; this page turns that habit into a bounded, measured loop.

## Central log (2026-10-27)

All hosts write to one machine-wide store through one script, `scripts/acef-note` (store: `ACEF_FEEDBACK_DIR`, default
`~/CODE/acef-feedback`, its own local git repository). Per-host logs are no longer kept; an old host log is imported as
the legacy head of its project file, and its old path may stay as a symlink.

- **Entry:** one line, `id | date | tags | cost | what | fix | ref`. `id` = `<project>-<n>`. Tags: 1–4 from the closed
  list in `tags.txt` (the failure modes below plus `tooling`, `rulebreach`; one scope tag `method`, `runner`, `host`,
  `stack:<x>` or `os:<x>`). Cost is a number with a unit (`50min`, `2rounds`, `1escaped`) or `?`, never a severity word.
  Entries are never edited: a recurrence is `add --repeat <id>`, a correction `add --retag <id>`.
- **When to write** (below this, do not log): a rule breach or safety near miss (always), about 30 minutes or more lost,
  a tool that lost results, a review round caused by something the brief should have said, a speed-up merged but not
  in effect, an escaped defect. One incident = one entry; `add` prints the three most similar entries, and a match is
  recorded with `--repeat`.
- **Who writes:** the coordinator is each host's funnel. Developer and reviewer reports carry one line
  `ACEF-gözlem: <sentence | yok>` (they often cannot write outside their lane); the coordinator moves the non-empty ones
  with `acef-note add` at closeout and lists the ids in the closing note. Side sessions and other agents call the
  script directly.
- **When to read** (coordinator only, at most five entries each time): at intake (`acef-note search`, ids and the
  `acef-note version` stamp go into the intake card as `Bilinen tuzaklar: <ids> @<stamp>`), at the review brief
  (`acef-note check <stamp>`: `unchanged` means nothing to read; otherwise only the newer matching entries), and before
  a change to shared infrastructure (runners, worktree or cleanup scripts, ports, databases). Entries already promoted
  to a rule are left out. Developers and reviewers do not read the raw log; lessons reach them as templates and scripts.
- **Method version:** at session start the coordinator runs `scripts/acef-version-check --repo <host>`; exit 0 means the
  installation is current, exit 1 lists the CHANGELOG sections added since the installed commit, which are the only
  method text to read before updating.

## Sources (raw)

- The central log above (`acef-note`), including imported host logs (for example the first host's #1–#112).
- Agent feedback the owner collects and pastes, for example `acef-paylasilan-notlar.md`.
- Closing notes: wall time, tokens per role, REVISE rounds, escaped defects.
- Route decisions and their diff-check corrections (`templates/slice/intake-card.md`).

## Weekly cycle

1. **Digest:** once a week the coordinator groups the new observations by failure mode. `acef-note due` (run at
   session start next to the version check) prints `DIGEST DUE` when the oldest undigested entry is a week old and
   `RULE REVIEW DUE` for rules past their review date; `acef-note digest --write` pre-groups the entries with repeat
   counts and cost sums and leaves the proposal skeleton. Typical modes are wrong
   sizing, ceremony that does not fit the route, review rounds, test scope, infrastructure, and lost state. Each mode
   lists its occurrences with a source and a cost (hours, rounds, defects).
2. **Proposal:** at most three rule changes, each naming its target file (`method/`, `templates/`,
   `control-dosing.json`, a script), the expected effect and how it will be measured. Prefer a script over prose: a
   rule written only in prose slipped under load in every host.
3. **Owner decision:** the owner approves, rejects or defers each change. Nothing changes the method without that
   decision.
   An approved change gets `rules/R-<n>.md` in the store (`Incidents:` ids, `Cost:`, `Review-by:`, `Activation:`,
   `Status: approved | shipped | measuring | retained | narrowed | retired`). Its incidents then drop out of searches.
4. **Change and measure:** an approved change ships as a normal ACEF PR with a CHANGELOG entry. After about a week, or
   about ten slices, the digest reports the measured effect. A change without an effect is reverted or narrowed.

## Rules

- **Every rule added after an incident carries its cost and an expiry.** Write what it adds (for example "+1 full suite
  per review round"), the incident it answers, and a review date about two to four weeks out. On that date the digest
  keeps it, narrows it or removes it with numbers. Rules that only ever get added are how hosts reached 2–4 full suites
  per slice.

- Agent self-reports are evidence of a problem, not proof of a cause. Confirm causes in the record (diffs, logs,
  timings) before changing the method.
- Change the smallest thing that removes the cost. Do not add a new pass when tightening an existing one is enough.
- Lessons that belong to a technology stack (for example Laravel test databases) go into a stack standard and the
  stack profile, not into the general method.
