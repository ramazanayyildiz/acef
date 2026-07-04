# ACEF Capstone Lane — guarded stories, heavy epic close (the 4th lane)

The measured middle between the guarded lane and full BMAD v2 for **epic-scale delivery**: every story runs the
guarded lane (typed actor/scope/evidence/gate cycle with independent review), and every epic boundary carries a
mandatory **capstone** — the BMAD v2 epic-close wrapper set — before the epic may be marked done or the next epic
may start.

## Origin: validated live before codification

This lane was not designed on paper. It emerged from the 2026-07 jakomeet validation run (see
`docs/experiments/epic-benchmark/observation-report-machinery-vs-baseline.md`, O2-19/O2-22):

- Five epics ran guarded-lane-per-story where `DELIVERY_RULES.md` routed epic work to full BMAD v2 (an
  unledgered lane deviation, surfaced as O2-19).
- A retro-certification pass (E-CERT) then applied the heavy lane's epic wrappers backwards over four of those
  epics: **three passed heavy-lane close criteria unmodified**, and the wrappers found **one HIGH
  production-path defect** that ~30 guarded gate cycles, independent per-story review, and a 72-test green suite
  had all missed — because the story tests stubbed the validator on the exact path that broke (O2-22).
- Conclusion: the guarded lane's per-story controls deliver near-certified quality at a fraction of BMAD v2's
  ceremony, but the heavy lane's *epic-close real-surface evidence* catches a failure class (test-double masking
  of production paths) that per-story review structurally cannot. Dose accordingly.

Owner ratification of the policy and the lane name is a typed approval in the validation repo
(`approval-capstone-lane-policy`).

## Per story (unchanged guarded lane)

Typed actor record, worker-scope singleton, evidence runs for every verification command, independent reviewer
who is not the author, typed gate verdict, human push approval. Guarded boundaries (money, PII, auth,
irreversible effects) keep the guarded test floor and independent boundary test author.

## Per epic boundary (the capstone — mandatory, fail-closed)

Before an epic closes, a closeout oracle actor must produce:

1. **Full-chain real-surface smoke** — one test/run that exercises the epic's user-visible chain end-to-end
   through real entry points (HTTP routes, Livewire/UI flows, CLI, queue — whatever the epic ships), faking only
   at external-provider seams. Per-story test reruns relabeled as smoke do not satisfy this. Include negative
   assertions for the epic's forbidden surfaces/leakage classes.
2. **FR/AC-capability trace** — every functional requirement and story AC assigned to the epic maps to a green
   real-path test or an explicit typed blocker/deferral. `UNCOVERED` rows are findings, not footnotes.
3. **Cross-story test staleness check** — expect earlier stories' tests to be stale about later stories' behavior
   (this reproduced on every multi-story epic observed: O2-21); a failed first oracle run is preserved as
   evidence and healed through its own mini typed cycle, never rerun-until-green.
4. **Guarded-boundary re-review** — an adversarial pass over the epic's money/PII/authz/irreversible surfaces as
   they exist *after* all stories, not as each story left them.
5. **Typed epic gate** — the capstone closes with its own gate verdict citing the evidence above. A FAIL gate is
   preserved and superseded by a new PASS gate after fixes (supersede-not-mutate); the next epic must not start
   while the capstone gate is FAIL.

## Lane selection rules

- Capstone is a **human decision, never an agent default**: routing an epic here instead of full BMAD v2 requires
  a typed lane approval with the owner's exact words (`acef-state approval`), and `laneRationale` set on the
  active run. An agent that starts an epic in capstone without that record has reproduced the O2-19 deviation.
- Prefer **full BMAD v2** when the epic needs heavy *planning* discipline per story — ambiguous requirements,
  architecture conformance risk, unfamiliar stack — because capstone only adds weight at the close, not at
  readiness/ATDD time.
- Prefer **capstone** when story specs are firm (code-grounded story cuts, established patterns, experienced
  conductor) and the dominant residual risk is integration/masking at the epic level — the failure class the
  capstone demonstrably catches.
- Escalate mid-epic: if stories start failing readiness (soft ACs, replans), promote the remaining stories to
  full BMAD v2; the capstone still runs at the boundary.

## Markers and state

Runs use `.acef-lane` (or `.acef-lightweight-lane`) as the hook marker like other non-BMAD lanes, with
`lane: "capstone"` on the active run once state tooling supports it (until then: `lane: "guarded"` +
`laneRationale: "capstone: guarded stories + heavy-lane epic-close wrappers, approval-<id>"`). Active-run updates
are part of the story-open ritual — between-gate state staleness is a known drift mode (O2-25).
