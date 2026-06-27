# ACEF Changelog

This file is the human-readable history of ACEF's framework changes. Git remains the exact source of truth, and
`docs/ai/capabilities/*.json` remains the layer-by-layer truth for whether a capability is documented, wired, enforced,
proven, or installed.

Update this file whenever ACEF itself gains or changes a flow, gate, validator, hook, skill, installer behavior, workflow,
or evidence contract. Do not use it to claim implementation status; link to the capability record for that.

## Unreleased

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
