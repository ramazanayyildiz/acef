# ACEF Guarded Lane — high-risk work at any scale, with the capstone close at epic scale

The guarded lane is ACEF's high-risk delivery lane: auth, payment/entitlements, PII/data-protection, data
deletion/migration, permissions, irreversible side effects (outbound email, external publishing), or any
boundary where a mistake cannot be apologized away. It is one lane that scales with the work:

- **Story/work-item scale** — the classic guarded contract (below).
- **Epic scale** — the same per-story contract, plus a mandatory **capstone**: the BMAD v2 epic-close wrapper
  set at every epic boundary. The capstone is not a separate lane; it is what "guarded" means when the unit of
  work is an epic.

## Per story / work item (any scale)

- Typed record chain, no exceptions: actor record, worker-scope singleton (allowed paths — the worker cannot
  drift outside them), evidence runs for every verification command, typed gate verdict, human push approval.
  A claim without its record on disk is not work.
- Independent review is non-negotiable: the authoring actor never reviews, approves, or marks done its own
  output. No self-review waiver exists in this lane. Cross-engine review (different agent runtime for author
  vs reviewer) is encouraged where available.
- Guarded test floor: the risky boundary's *failure* scenarios are tested, not just its happy path —
  fail-closed behavior is proven by test (provider failure must not burn credits; erased identities must not
  re-import; foreign custody must not be claimable). An independent boundary test author applies on the
  highest-risk boundaries.
- Red-before-green evidence on new guarded behavior: the failing test is recorded before the implementation
  that turns it green.

## Per epic boundary (the capstone — mandatory, fail-closed)

Before a guarded epic closes, a closeout oracle actor must produce:

1. **Full-chain real-surface smoke** — one run exercising the epic's user-visible chain end-to-end through real
   entry points (HTTP routes, UI flows, CLI, queue), faking only at external-provider seams. Per-story test
   reruns relabeled as smoke do not satisfy this. Include negative assertions for the epic's forbidden
   surfaces/leakage classes.
2. **FR/AC-capability trace** — every functional requirement and story AC assigned to the epic maps to a green
   real-path test or an explicit typed blocker/deferral. `UNCOVERED` rows are findings, not footnotes.
3. **Cross-story test staleness check** — expect earlier stories' tests to be stale about later stories'
   behavior (reproduced on every multi-story epic observed: O2-21); a failed first oracle run is preserved as
   evidence and healed through its own mini typed cycle, never rerun-until-green.
4. **Guarded-boundary re-review** — an adversarial pass over the epic's money/PII/authz/irreversible surfaces
   as they exist *after* all stories, not as each story left them.
5. **Persona product-done check, evidenced by the committed Layer-2 chain** — for every user-facing promise the
   epic claims to deliver, verify the owning persona can actually *discover and perform* the capability through a
   real entry point (navigable UI/route, not a service call or a direct-URL test). The real-surface smoke (item 1)
   proves the surfaces that exist work; this check asks the question the smoke structurally cannot: **do all the
   promised surfaces exist at all, and do they render?** A capability whose service layer is green but which no
   persona can reach — or whose page returns 200 but renders blank — is `dev-done`, not `product-done`.

   For any epic that ships a `ui`/`admin`/user-facing surface, this check's evidence is **not** a one-off manual
   walk; it is the framework's defined Layer-2 chain (`TEST_PIPELINE.md`), committed to the repo:
   `test-user-flow-mapper` → Flow Map · `test-case-planner` → Manual Test Case Plan (happy/negative/edge, P0–P2,
   guarded-boundary flags) · `test-browser-generator` → **committed browser/E2E tests that drive the RENDERED
   page** (navigate, assert controls exist in the DOM, click the real control), never in-process component-isolation
   smoke. Component tests (`Livewire::test`, direct HTTP/action calls) are structurally blind to render/reachability
   defects and do not satisfy this item. A manual owner walk may *discover* the gap but the durable evidence is the
   committed test — otherwise the check evaporates the moment the walker leaves. Non-UI epics (pure
   backend/library/data/`surface:none`) are exempt but must carry the justification.

   Escapes this rule has caught live, each invisible to component-isolation tests and caught only by driving the
   rendered page: service-only-no-UI delivery (E-CERT deferred purchase/campaign UI 'to E-INV', the deferral fell
   through E-INV's cut — O2-30); a publish/audit UI deadlock (O2-33); an emergency kill-switch page rendering blank
   (O2-38). "Defer to a later epic" requires a typed deferral that names the owning story in an approved cut.
6. **Typed epic gate** — the capstone closes with its own gate verdict citing the evidence above. A FAIL gate
   is preserved and superseded by a new PASS gate after fixes (supersede-not-mutate); the next epic must not
   start while the capstone gate is FAIL.

## Origin of the capstone rule: validated live before codification

The epic-scale rule was not designed on paper. It emerged from the 2026-07 jakomeet validation run (see
`docs/experiments/epic-benchmark/observation-report-machinery-vs-baseline.md`, O2-19/O2-22):

- Five epics ran guarded-per-story where `DELIVERY_RULES.md` routed epic work to full BMAD v2 (an unledgered
  lane deviation, surfaced as O2-19).
- A retro-certification pass (E-CERT) applied the heavy lane's epic wrappers backwards over four of those
  epics: **three passed heavy-lane close criteria unmodified**, and the wrappers found **one HIGH
  production-path defect** that ~30 guarded gate cycles, independent per-story review, and a 72-test green
  suite had all missed — the story tests stubbed the validator on the exact path that broke (O2-22).
- Conclusion: guarded per-story controls deliver near-certified quality at a fraction of BMAD v2's ceremony,
  but the heavy lane's *epic-close real-surface evidence* catches a failure class (test-double masking of
  production paths) that per-story review structurally cannot. So the guarded lane absorbs that wrapper set as
  its epic-scale close requirement. (Initially codified as a separate "Capstone lane"; merged into guarded the
  same day on the owner's call — one lane that scales beats a fourth lane.)

Owner ratification is a typed approval in the validation repo (`approval-capstone-lane-policy`, superseded by
`approval-guarded-epic-scale-merge`).

## Lane selection at epic scale

- Routing an epic to guarded instead of full BMAD v2 is a **human decision, never an agent default**: it
  requires a typed lane approval with the owner's exact words (`acef-state approval`) and `laneRationale` set
  on the active run. An agent that starts an epic in guarded without that record has reproduced the O2-19
  deviation.
- Prefer **full BMAD v2** when the epic needs heavy *planning* discipline per story — ambiguous requirements,
  architecture conformance risk, unfamiliar stack — because guarded adds its extra weight at the close, not at
  readiness/ATDD time.
- Prefer **guarded** when story specs are firm (code-grounded story cuts, established patterns, experienced
  conductor) and the dominant residual risk is integration/masking at the epic level — the failure class the
  capstone demonstrably catches.
- Escalate mid-epic: if stories start failing readiness (soft ACs, replans), promote the remaining stories to
  full BMAD v2; the capstone still runs at the boundary.

## Markers and state

Runs use `.acef-lane` (or `.acef-lightweight-lane`) as the hook marker like other non-BMAD lanes, with
`lane: "guarded"` on the active run and `laneRationale` citing the typed lane approval for epic-scale use.
Active-run updates are part of the story-open ritual — between-gate state staleness is a known drift mode
(O2-25).
