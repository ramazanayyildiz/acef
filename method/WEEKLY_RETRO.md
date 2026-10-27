# Weekly retro: writing the judgment parts

Status: active, 2026-10-27 (owner decision). `scripts/acef-retro` collects the numbers; the coordinator writes the
judgment on top; the owner decides by number. This page is for the coordinator. See `method/FEEDBACK_LOOP.md`
("Detection loop", "Weekly cycle") for the loop itself.

## Before writing

1. Run `acef-note due` and `acef-detect --repo <host>` once, so overdue alerts and the last poll are current.
2. Run `acef-retro --all` (or `--project <p>`). It refuses to overwrite an existing retro, because the owner's answers
   live in it; regenerate with `--force` only before the owner has answered.
3. Open the file in the store (`retros/<YYYY>-W<ww>.md`). Leave the collected tables and lines as they are; they are
   the evidence. Replace only the `<coordinator>` placeholders and the HTML comments.

## Section by section

- **What went well:** one or two sentences that cite the numbers in the table (closed work per class, cycle time
  against expected, alerts resolved). Name a cause only when the record shows it (a merged change, a resolved alert).
  When a number came from a fallback or a proxy, say so; do not round "unknown" into a figure.
- **What repeats:** keep the collected lines. For each, add at most one sentence: is the covering rule working (then
  the repeat should fall next week), missing (a proposal), or wrong (a proposal to narrow or remove it)? Agent
  self-reports are evidence of a problem, not proof of a cause: confirm in diffs, logs and timings first.
- **Overdue or unowned alerts:** for each, propose an owner and a slice id or a dated deferral with a reason. Do not
  leave an alert without an owner in the file.
- **Rules past their review date:** keep, narrow or retire each, with its measured effect (the retro's numbers or the
  log's repeat counts). A rule that cost more than it saved is narrowed or retired.
- **Proposed changes:** at most five, numbered. Rewrite or merge the collected candidates, delete the weak ones. Each
  proposal states: the change in one sentence; evidence ids (log entries, alert ids, slice ids); the target layer
  (`acef` for the method and its scripts, `stack` for a stack standard or profile, `host` for one project's config or
  tooling); the expected effect in numbers; how it will be measured next week (usually a detector's alert count or a
  log tag's repeat count). Prefer a script or a detector over prose; prefer tightening an existing rule over a new
  pass; say what the change costs.

## After the owner answers

- The owner answers by number: accept, reject or defer. Record the answers with
  `acef-retro --project <p> --answer 1=accept --answer "2=reject:<why>" --answer "3=defer:<why>"` (with `--all` for an
  all-project retro). When every row is answered the file says `Status: decided`.
- An accepted change gets `rules/R-<n>.md` in the store (Incidents, Cost, Review-by, Activation with an owner and a
  date, Status) and ships as a normal ACEF or host change with a CHANGELOG entry. `inactive_improvement` raises an
  alert when its activation has no owner or its date passes.
- A deferred proposal comes back in the next retro only if its evidence repeats.
