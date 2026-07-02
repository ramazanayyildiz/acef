# V2 Plan — Fix the Measurement, Then Cut the Cost

> ACEF v1 closed with an honest but weak verdict: quality/process control is "evidence-backed" on an effective
> n=1 (only 1 of 5 benchmark tasks differentiated lanes), and token cost went **up**, not down. Meanwhile the last
> control-hardening round grew the enforcement layer to ~4,600 lines of shell/JS (`acef-process-validator` alone is
> 2,722 lines) — new control added without the measurement the roadmap itself requires. This plan inverts that:
> **freeze control, fix the measuring instrument, run the cost round, then re-measure.** No step 3 result is
> interpretable until step 2 lands.

## Decision rule (applied to every proposed change during this round)
- **MEASURE** (benchmark tasks, fixtures, scoring, baseline comparison) → do now.
- **SUBTRACT** (shorter prompts, narrower reads, fewer repeated loads) → do now.
- **ADD CONTROL** (new gate, check, dosing rule, lens, hook) → frozen until the v2 matrix has run. No exceptions —
  this is the rule (`STABILIZATION_ROADMAP.md`: measure before adding control) that the control-dosing /
  self-certification round quietly violated.

## Workstream 1 — Validator freeze (immediate, zero effort)

1. **Declare the freeze** — add a short freeze notice to `method/STABILIZATION_ROADMAP.md` and
   `method/CONTROL_RATIONALE.md`: `scripts/acef-process-validator`, `method/control-dosing.json`, and the
   guard hooks accept **bug fixes only** (a check that fires wrongly may be fixed; no new checks) until the v2
   matrix result exists.
2. **Scope note** — the freeze covers new capabilities under `docs/audits/**/capabilities/` too: no new
   capability JSON without a matching measured defect it catches.

*Exit criterion: freeze text merged; any PR adding a validator check during the freeze is rejected by review, not
by more machinery.*

## Workstream 2 — Expand the benchmark task set (the highest-leverage work)

The v1 matrix (`docs/experiments/empirical-validation/`) had 5 tasks × lanes/clients = 30 runs, and only one task
produced lane differentiation. The instrument, not the framework, is the bottleneck.

3. **Task-gap analysis** — read `docs/experiments/empirical-validation/manifest.json` + `report.md`, classify the
   existing 5 tasks by what they *can* differentiate (defect class, stack, lane-sensitivity), and write the gap
   list into `docs/experiments/empirical-validation/task-gaps.md`.
4. **Author 8–10 seeded-defect tasks** — each task ships with:
   - a seeded, *known* defect (or defect family) with an objective detection oracle;
   - a reason it should be lane-sensitive (i.e., a lightweight run plausibly misses it, a guarded run plausibly
     catches it) — tasks that all lanes pass or all lanes fail are ballast;
   - coverage across the defect classes v1 lacked (candidates from the audit findings themselves: forged/vacuous
     evidence, half-wired install, closeout-on-empty-record, contract drift between hook and validator);
   - the same fixture format as the existing runs so `results.jsonl` scoring is unchanged.
5. **Dry-run 2 tasks first** — pilot two new tasks end-to-end on one repo/one client before authoring the rest;
   fix the harness friction the pilot exposes, then batch the remainder.

*Exit criterion: ≥8 new tasks in the manifest, each with a documented oracle and a lane-sensitivity rationale;
pilot pair has produced clean `results.jsonl` rows.*

## Workstream 3 — Cost round (only after WS2's task set is fixed, may overlap authoring)

Exactly the narrow scope already written in `STABILIZATION_ROADMAP.md` — nothing more:

6. **Shorter worker prompts** — audit the worker prompt templates (`skills/acef*/`, dispatcher fan-out prompts) for
   repeated boilerplate; target the persona/track preamble first.
7. **Narrower reads** — workers get file/diff slices per `CONTEXT_POLICY.md` budgets instead of whole-file reads;
   measure by input tokens per run, not by policy prose.
8. **Kill repeated ledger/artifact loading** — the ledger is re-read every phase; load once per phase into the
   handoff, reference by path thereafter.
9. **Per-role Epic Context Packs** — one pack per persona (Planner / Developer / Judge / Test Author), built at
   ledger creation, replacing ad-hoc re-retrieval mid-run.

*Exit criterion: each change is a measurable prompt/context diff — no new retrieval infrastructure (SQLite, vector,
graph, SCIP, Serena, Codebase-Memory, Context Mode remain excluded per the roadmap).*

## Workstream 4 — Re-run the matrix and decide

10. **Run the full v2 matrix** — old 5 + new 8–10 tasks, same three lanes, same clients, append to
    `docs/experiments/empirical-validation/runs/results.jsonl` with a `matrix: v2` tag.
11. **Compare against the v1 baseline** — pass rate, known-defect recall, median input tokens, per-lane.
12. **Decide by outcome:**
    - Quality holds **and** tokens drop → declare v2; unfreeze the validator; re-prioritize the deferred
      delivery-quality track (PR-review entry point, report-only `bug-hunter` pilot).
    - Quality holds, tokens flat → cost round failed; iterate WS3 once more before touching control.
    - Lanes still don't differentiate on the expanded set → the honest conclusion is that the control layer's
      measured value is near zero at current task difficulty: begin **thinning** the validator (dosing dials down,
      checks with no caught-defect evidence are removed), not hardening it.

*Exit criterion: a v2 verdict written into `README.md` + `VALIDATION_PLAN.md` with the same honesty standard as v1
(sample caveats included).*

## DEFER (unchanged from the audit plan)
- Adversarial hardening of evidence integrity (keyed runner-proof etc.) — `TRUST_MODEL.md` already disclaims the
  malicious-agent case; the guards are advisory by architecture and no amount of shell closes that.
- Schema enforcement engine, release-readiness gate, cockpit runtime — direction docs only.

## Order and dependency

```text
WS1 (freeze)  ── immediate, unblocks nothing but stops the bleeding
WS2 (tasks)   ── the critical path; WS3 results are uninterpretable without it
WS3 (cost)    ── may start in parallel with WS2 authoring, must finish before WS4
WS4 (measure) ── strictly last; its outcome decides whether control gets unfrozen or thinned
```

## Verification
Done = the v2 matrix has run on the expanded task set, the comparison against the v1 `results.jsonl` baseline is
written down, and one of the three WS4 outcomes has been explicitly chosen — by a reviewer reading the numbers,
not by the agent that ran the round.
