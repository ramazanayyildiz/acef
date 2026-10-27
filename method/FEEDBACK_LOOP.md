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

## Detection loop (2026-10-27)

Owner decision 2026-10-27: recurring waste (stuck agents, finished work waiting, idle or contended runners, review
loops, forgotten sessions, improvements merged but not in effect, open work far past its usual time) went unnoticed
until the owner asked, and a whole day could be lost. Detection runs **during the day**, not nightly.

- **When:** the coordinator's ~15-minute check runs `.acef/bin/acef-detect --repo . --quiet` (installed by
  `install-acef-tools`, or `scripts/acef-detect` from the ACEF checkout;
  target under 5 s, no tests, no network, a few git calls and stat-only scans). It prints only new, reopened,
  overdue and stale-acked alerts; without `--quiet` it also prints `OK`, `SKIP <name> (no source: …)`, `WATCH` and
  `INFO` lines. Every run ends with a timing line (`acef-detect 1.8 s (git 5 call(s) …, index … hit(s))`), also under
  `--quiet`; `--timing` adds one `TIME <detector> <ms>` line each. `--dry-run` writes nothing; `--list` shows the
  detectors with their headers.
- **Speed:** a poll reads each source once, whatever the number of detectors and windows: one `git log` of main over
  the widest window (each window is an exact view of it), one `git log <heads> --not <main>` for every worktree head,
  and each glob, directory and file once. Finished run items are kept in `alerts/<project>.index.json` in the store
  (never the host), keyed on the mtime and size of the directory and of its stamp, status and result files; a row whose
  files changed is read again, running items are always read. `--no-cache` ignores the index; the findings are the
  same with or without it. The index is a speed cache, not a source of truth: `--no-cache` is the reference answer,
  and deleting the file costs one slower poll. Only `acef-detect` writes it, under the project's alert lock; each row
  carries a sha256 checksum (salted, over the row and its key), and each cached value is checked against the shape its
  consumer expects. Corruption, truncation, a mistaken hand edit or an old format is a cache miss, never a crash or a
  different answer; a deliberately forged row with a valid checksum is out of scope.
- **Detectors:** one small file each, core in `scripts/detectors/`, host-specific in `<host>/.acef/detectors/`. The
  header names the question, source, rule, default threshold, owner, scope (`acef`, `stack:<x>`, `host:<name>`) and
  kind (budget, ratio, age, trend, absence); `detect(ctx)` returns findings. Core: `stuck_agent`, `waiting_work`,
  `machine`, `review_loop`, `forgotten_session`, `inactive_improvement`, `size_ratio`. Tests are not in this version.
- **Host config:** `slice-method.json` → `detectors` (or `--config <json>`): `project` (the store's project name),
  `owners`, `working_hours` (default 09–18 Monday–Friday, local time), `ack_hours` (4), `overdue_polls` (2), `stale_ack_hours` (24), `sources`
  (where the host keeps run directories, reviews, developer reports, the merge queue, the slot event log, `main_ref`),
  `thresholds` per detector, `disabled`. A detector whose source is not configured prints `SKIP`; it never guesses.
- **Measurements, not self-reports:** durations come from git timestamps and from the files runs leave behind (start
  and finish stamps, log modification times). Expected duration = median cycle time (first own commit to merge) of the
  same route class from closed work, with a fixed fallback (native 60, HAFİF 180, TAM 480 min) until there are five
  samples; the output says which one it used. What was not measured is printed as unknown.
- **Alert lifecycle** (`alerts/<project>.jsonl` in the store, append-only events): a breach **opens** an alert with an
  owner and an ack deadline (4 working hours); one alert per detector + subject. The owner answers with
  `acef-note ack <id> --slice <id>` (it becomes work), `--defer <date> --reason "…"` (a dated, reasoned deferral) or
  `--resolve "<evidence>"`. An alert **resolves** by itself only when its detector positively observes the cleared
  condition (the run finished, the work merged, the worktree is gone from `git worktree list`); a subject that merely
  dropped out of a window or vanished stays open and is printed `UNSEEN`. A source that cannot be read (git
  fails, `ps` fails, a log or directory is missing or unreadable, a row lacks a required field) is never read as
  "nothing there" or "success": the detector prints `SOURCE_ERROR <source>` and none of its alerts resolves in that
  poll; an unreadable line in the alert log itself blocks every resolve until it is repaired, and an alert log that
  cannot be read at all (I/O or decode error) makes `acef-detect` record nothing and exit 4, so the loop sees it. A recurrence **reopens** the same id; a
  deferral past its date reopens it with the deadline counted from the deferral's expiry. Parallel polls and acks
  share one lock per project, so a key never gets two alerts. `acef-note due` prints `ALERT OPEN` once an alert has stayed unacked
  for more than two polls and `ALERT OVERDUE` once its ack deadline has passed; overdue and unowned alerts go to the
  owner's weekly retro. `acef-note alerts` lists the states.
- **An ack is not an end:** `ack --slice` says which slice owns the wait; it does not make the wait invisible. Each
  poll records which acked alerts its detectors still saw breaching. When an acked alert is still seen breaching
  `stale_ack_hours` (host config, default 24 h wall clock) after the ack, `acef-detect` prints
  `ALERT <id> ACKED-STALE` (also under `--quiet`) and `acef-note due` prints `ALERT ACKED-STALE: <id> … acked <n> h
  ago to slice <id>` until the owner acks again (a new period; `--recheck-hours N` sets a different one for this ack),
  defers with a date and reason, or resolves it. An acked alert that is only UNSEEN (no observation) is not stale.
  The weekly retro lists every acked-but-open alert with its age, slice, last observed breach and STALE mark.
- **Central log:** only real losses are also written there by `acef-detect`: 30 minutes or more lost (also when an open
  alert crosses 30 minutes later, once), lost results, an improvement merged but not in effect (later: a rule breach,
  an escaped defect). The first loss of a detector is a new
  entry with the detector's tags; later ones are `--repeat` of it. Waiting work and size overruns stay alerts.
- **Investigations close with a detector:** a "why is X slow" or "why does X keep happening" slice closes with
  `Dedektör: <path | yok — reason>` in its closing note: either a detector that would have caught it, or why none can.

Example host section (paths are the host's own):

```json
"detectors": {
  "project": "<store project>",
  "owners": {"default": "coordinator", "waiting_work": "merge-operator", "machine": "merge-operator"},
  "sources": {
    "main_ref": "origin/main",
    "agent_runs": {"glob": "<run dirs>/*", "attempt_glob": "events-*.log", "result_file": "report.md"},
    "reviews": {"glob": "<review run dirs>/*", "result_file": "report.md", "id_regex": "^<prefix>-(?P<id>.+?)-(?P<round>\\d+)$"},
    "dev_reports": "<worktrees>/*/docs/slices/*-dev-report.md",
    "merge_queue": "<merge queue file>",
    "slot_events": "<slot events .jsonl>"
  },
  "thresholds": {"forgotten_session": {"leftovers": ["<snapshot dir>/{name}-src"]}}
}
```

## Sources (raw)

- The central log above (`acef-note`), including imported host logs (for example the first host's #1–#112).
- Agent feedback the owner collects and pastes, for example `acef-paylasilan-notlar.md`.
- Closing notes: wall time, tokens per role, REVISE rounds, escaped defects.
- Route decisions and their diff-check corrections (`templates/slice/intake-card.md`).

## Weekly cycle

1. **Retro (owner-facing, 2026-10-27; replaces the digest as the owner's step):** once a week the coordinator runs
   `scripts/acef-retro --all` (or `--project <p>`; `--week YYYY-Www` for a past week). It collects the last seven
   days without the owner — central log entries, alerts opened, resolved, overdue or unowned, closed work by route
   class with cycle time against the expected time, REVISE rounds, merges per day, worktrees with no own commit — and
   writes `retros/<YYYY>-W<ww>.md` in the store: what went well (numbers), what repeats (one real example each and the
   rule that already covers it), overdue and unowned alerts, rules past their review date, and **at most five**
   numbered proposals (evidence ids, target layer acef / stack / host, expected effect, how it is measured). The
   coordinator writes the judgment parts on top (`method/WEEKLY_RETRO.md`); the owner answers by number
   (`acef-retro --project <p> --answer 1=accept --answer "2=defer:<why>"`), recorded in the same file. `acef-note due`
   (run at session start next to the version check) prints `RETRO DUE` when the last retro is seven days old and
   `RULE REVIEW DUE` for rules past their review date. `acef-note digest --write` still works and pre-groups entries
   by mode with repeat counts and cost sums; a retro's `Through:` date also marks entries as digested. Typical modes are wrong
   sizing, ceremony that does not fit the route, review rounds, test scope, infrastructure, and lost state. Each mode
   lists its occurrences with a source and a cost (hours, rounds, defects).
2. **Proposal:** at most five changes in a retro (three in a digest), each naming its target file (`method/`, `templates/`,
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
