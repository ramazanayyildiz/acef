# Feedback loop (method self-improvement)

Status: active, 2026-10-25 (owner decision). ACEF improves its own instructions from experience: Karpathy's "system
prompt learning", where the instructions change with use and the model weights do not. The owner already asks every
agent that uses ACEF for its pros and cons; this page turns that habit into a bounded, measured loop.

## Sources (raw)

- Host observation logs, for example B2Press `coord/.tmp/acef-observations.md` (#1–#67 by 2026-10-25).
- Agent feedback the owner collects and pastes, for example `acef-paylasilan-notlar.md`.
- Closing notes: wall time, tokens per role, REVISE rounds, escaped defects.
- Route decisions and their diff-check corrections (`templates/slice/intake-card.md`).

## Weekly cycle

1. **Digest:** once a week the coordinator groups the new observations by failure mode. Typical modes are wrong
   sizing, ceremony that does not fit the route, review rounds, test scope, infrastructure, and lost state. Each mode
   lists its occurrences with a source and a cost (hours, rounds, defects).
2. **Proposal:** at most three rule changes, each naming its target file (`method/`, `templates/`,
   `control-dosing.json`, a script), the expected effect and how it will be measured. Prefer a script over prose: a
   rule written only in prose slipped under load in every host.
3. **Owner decision:** the owner approves, rejects or defers each change. Nothing changes the method without that
   decision.
4. **Change and measure:** an approved change ships as a normal ACEF PR with a CHANGELOG entry. After about a week, or
   about ten slices, the digest reports the measured effect. A change without an effect is reverted or narrowed.

## Rules

- Agent self-reports are evidence of a problem, not proof of a cause. Confirm causes in the record (diffs, logs,
  timings) before changing the method.
- Change the smallest thing that removes the cost. Do not add a new pass when tightening an existing one is enough.
- Lessons that belong to a technology stack (for example Laravel test databases) go into a stack standard and the
  stack profile, not into the general method.
