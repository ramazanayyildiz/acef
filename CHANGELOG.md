# ACEF Changelog

This file is the human-readable history of ACEF's framework changes. Git remains the exact source of truth, and
`docs/ai/capabilities/*.json` remains the layer-by-layer truth for whether a capability is documented, wired, enforced,
proven, or installed.

Update this file whenever ACEF itself gains or changes a flow, gate, validator, hook, skill, installer behavior, workflow,
or evidence contract. Do not use it to claim implementation status; link to the capability record for that.

## Unreleased

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
