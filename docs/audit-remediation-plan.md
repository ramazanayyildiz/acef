# Audit Remediation Plan — Tier 1 (arm + honest-up)

> An independent external audit (main @ 1c7caa1) produced 56 findings, 45 confirmed. We are **deliberately NOT fixing all of them.** ACEF is an open draft; piling new mechanism onto a draft would worsen the exact "machinery exists but is not armed" gap the audit named, and create the over-engineering/friction failure we want to avoid. This plan fixes the **spine** and **honest-ups the claims** — the ~80% of value — and consciously defers anything that ADDS new mechanism.

## Decision rule (applied to every finding)
- **ARM** (make existing machinery fire) → do now.
- **REMOVE** (close a gap / align an overstated claim) → do now (cheap, subtractive).
- **ADD** (new mechanism/concept) → defer. Especially for a draft; only build when value clearly exceeds the weight.

## DO NOW — Tier 1 (this branch)

### Workstream A — Arm the verification surface (code/CI)
1. **CI full matrix** — `.github/workflows/validate.yml` runs **all** `scripts/test-acef-*`, not just `test-acef-process-validator`. *(Root cause behind the unseen red test + contract drift; closes the CI half of P0-1.)*
2. **Fix the red self-test** — `test-acef-status` fails (rc=1) because its fixture lacks `docs/ai/ACEF_INSTALLATION.json` (blocker added at `acef-status:105`). Add the file to the fixture. *(P1-2)*
3. **Reject empty/mislabeled records** — `acef-closeout-verify` returns PASS/exit 0 on an empty `{}` (empty goalSet ⇒ vacuously true). Add fail-closed input validation + a test asserting `{}` FAILs. *(P1-5 sharpest consequence)*
4. **Wire `acef-closeout-verify`** — add to `install-acef-tools` `tools[]`, reference/install under `.acef/bin/` like every other gate, and into the lane-closeout bundle so a target repo can invoke it via the documented path. *(P1-6a — our own half-wired merge)*
5. **Arm the validators** — a packaged git pre-commit/pre-push (via `install-acef-bmad-guard`) + a CI step that runs the closeout `--check` set against a delivery fixture, not just the unit test. *(P0-1 core — moves closeout from "remember the CLI" to "fires without memory".)*

### Workstream B — Honest-up the claims (docs, subtractive)
6. **Align integrity language** — in `RULE_ENFORCEMENT_MAP.md` / the "Designed To Catch" framing, soften "tamper rejection" to what the code actually delivers (detects accidental/lazy evidence gaps, not a malicious agent), and add a `TRUST_MODEL.md` "Does Not Guarantee" row for the reproduced failure: agent-authored fresh-read / reachability / runner-proof inputs are trusted, so forged inputs pass. *(P1-1, language path)*
7. **Right-size the quality claim** — `README.md` + `VALIDATION_PLAN.md`: the "evidence-backed for quality / 6→8" headline rests on an effective n=1 (1 of 5 tasks differentiates; recall≡pass-rate). Reword to match the sample; don't overstate. *(P1-4)*
8. **Stop over-attribution** — `ACEF_COCKPIT.md` gets a top banner ("Direction — not yet built; `acef-cockpit*` commands do not exist"); `README.md` install count fixed (6 skills incl. `spec-readiness`, not 5). *(P2 honest-ups)*

## DEFER — ADD-mechanism (decide later, not this round)
- **Harden integrity** (keyed runner-proof, bind fresh-read/reachability specs into the witness fingerprint, derive the import graph in-tool) — bigger lift; TRUST_MODEL already disclaims malicious bypass. Revisit only if adversarial-agent resistance is actually needed. *(P1-1, harden path)*
- **Schema enforcement engine (ajv)** — don't add a validation framework to a draft. At most a cheap reconcile (`dirtyDigest` + surface vocabulary). *(P1-5 remainder)*
- **Expand the benchmark task set** — softening the claim is enough now. *(P1-4 remainder)*
- **Release-readiness check** — mark release reference-only; don't build a gate yet. *(P1-6b)*

## DROP / polish (no user, no value yet)
Terminology overload (`guarded` lane vs track), hook↔validator shared-predicate lib, skills dedup (`test-gen`, `map-codebase`/`acef-adapter`), abort/rollback + locking.

## Verification
Two disjoint workstreams (A = code/CI/fixtures/install; B = method docs + README) → no file overlap. Done = the **full `test-acef-*` matrix is green** (re-run by the reviewer, not self-reported) and the claim edits match reality without underselling ACEF's genuine strengths.
