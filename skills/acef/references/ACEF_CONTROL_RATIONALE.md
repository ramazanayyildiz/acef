# ACEF Control Rationale

ACEF controls were not added as paperwork. They close specific failure modes seen in real agent work: wrong actor, wrong
scope, stale evidence, generic approval, phase drift, self-review, and repeated full-ledger reads.

The useful distinction is:

- **Correctness-producing controls**: adversarial independent review, recall/regression tests, reuse-before-create,
  runtime/surface floors, and guarded boundary tests.
- **Drift/scope/evidence controls**: typed state, actor records, worker scope, evidence manifests, gate verdicts,
  approval receipts, active run state, and `acef-next`.

The second group is not a semantic correctness oracle, but it is not theater. It protects the delivery process around
the correctness controls.

**Archived v2 control freeze:** the freeze in `docs/v2-validation-optimization-plan.md` governed the v2 measurement
round. That evidence is immutable. Versioned v3 changes use a new contract/run and must not rewrite v2 results or
silently alter existing active runs.

## Why Typed State Exists

Markdown remains the human chronology. JSON sidecars carry machine truth.

Typed state exists so hooks, validators, status tools, and query tools do not each parse prose differently for critical
facts. It closes fragile Markdown parsing, stale ledger prose, tool-specific interpretation drift, chat-only state, and
missing state at session resume.

## Why Actor Records Exist

Actor records make actor separation checkable. They prevent a code author reviewing their own work, the conductor
becoming developer/reviewer/judge, generic subagents being called BMAD personas, and Process Judge verdicts without an
independent judge identity.

## Why Worker Scope Exists

Worker scope is the write fence. It prevents workers from editing outside approved paths, continuing into another story,
editing ledgers or ACEF state, spawning workers, or making broad changes under a narrow prompt. The hard-wall hook is
built around this control.

When a harness can propagate identity, the hook checks actor and scope. When identity is unavailable, the scope file
remains the trust anchor and the hook may degrade to phase/path enforcement.

## Why Evidence Manifests Exist

Evidence manifests exist because agent claims are not evidence. They bind command, exit code, repository state, actor,
story, raw output, hash, runner proof, and satisfied gates. They reduce accidental fake-green, stale-output,
wrong-commit, and chat-only evidence. They do not stop a malicious actor who can forge all inputs.

## Why Gate Verdicts Exist

Gate verdicts make `PASS` a file-backed decision. They prevent story close because artifacts merely exist, a Judge
passes without successful evidence, skipped evidence hides in prose, or stale/unrelated commands satisfy gates. Legacy
Full contracts require a real Process Judge actor. New `four-actor-v3` stories use a deterministic close gate over four
independent actors; a Story Process Judge is added only for a waiver, evidence conflict, ambiguity, or gate anomaly and
cannot override a failed mechanical check. Epic close remains independently judged. Neither form proves semantic
correctness by itself.

## Why Approval Receipts Exist

Approval receipts prevent generic continuation text from becoming scope approval. They stop `go on`, `continue`,
`devam`, or `tamamla` from starting the next epic or high-risk work. They bind the decision, target scope, actor type,
exact quote, and commit.

## Why Active Run And `acef-next` Exist

Active run state and `acef-next` stop moment-before-work drift: agents choosing a new story from chat memory, workers
silently moving phases, every worker rereading the full ledger, and tool-specific skills becoming the authority.
`acef-next` projects the next allowed action, allowed paths, required evidence, forbidden actions, and stop condition.

## Why Surface Contracts Exist

Surface contracts are a runtime floor, not full semantic proof. They prevent in-memory persistence, isolated renders,
status-only HTTP smoke, and unknown surfaces from passing as done. They do not prove correct actors, frozen values, or
business math; those semantics come from tests, review, and domain-specific assertions.

## How To Price Integrity Controls

"This closes failure mode Y" is necessary, but not enough. Also ask:

- Did this control actually fire, or only record that the problem did not occur?
- If this artifact did not exist, what would catch the failure mode, and is that alternative cheaper or stronger?

Pricing guide:

- Worker scope mechanically catches scope escape before writes; keep it in every admitted lane. Contained native work
  stays outside ACEF, while existing retired direct records retain changed-path compatibility closeout.
- Cold-read and active-run context matter most for drift-prone, cross-session, or multi-agent work.
- Evidence manifests, runner proof, and gate verdicts mainly defend against honest stale-output, wrong-commit,
  wrong-command, and chat-only evidence; they are most valuable for guarded, unattended, async, or later-audited work.
- Actor records make separation auditable. If the runtime does not propagate worker identity, they record separation
  more than they cause it; topology and write-scope guards cause the separation.
- Approval receipts matter most at epic transitions, guarded/high-risk starts, and ambiguous continuation points.
- Surface contracts are runtime floors, not semantic proof.

The trust ceiling remains: keyless self-hashes and agent-supplied evidence can pass a self-consistent forgery. Price
them as cooperative-local guardrails and async audit trails, not cryptographic proof. A skeptical re-run from disk is a
stronger backstop when available.

## Control Dosing Table

Use this table to choose full artifact, lighter form, or human/backstop check:

| Control | Role | Required dose | Backstop if lighter |
| --- | --- | --- | --- |
| Worker scope | Active enforcement | ACEF Fix/Standard/Full; Guarded strengthens actor+path binding | Direct changed-path validation |
| Cold-read/current context | Drift guard | Cross-session, multi-agent, or drift-prone work | Tight single-context quick fix |
| Active run and `acef-next` | Next-action guard | ACEF Standard/Full; compact for Fix; Guarded strengthens the selected workflow | Manual ledger/status check |
| Actor records | Audit plus policy guard | Any independent workers/reviewers; required for guarded/full-BMAD | Real topology plus reviewer report |
| Approval receipts | Scope guard | Epic transitions, guarded starts, high-risk expansions | Fresh explicit user confirmation |
| Evidence manifest | Evidence guard | ACEF Full or any Guarded workflow; lighter command log for Baseline Fix/Standard | Skeptical disk re-run |
| Runner proof | Cooperative integrity guard | Full-BMAD; guarded only when unattended/async (v2 thinning) | Skeptical re-run and raw log inspection |
| Gate verdict | Decision guard | ACEF Full or any Guarded workflow | Manual closeout checklist |
| Surface contract | Runtime floor | Non-direct user-visible/persistence feature lanes; direct keeps focused runtime verification and promotes on expansion | Manual browser/runtime persistence proof |
| Test-integrity check | Test-gutting guard | Any lane where tests are edited | Reviewer assertion/skip/import diff |
| Lean evidence | Evidence guard | ACEF Fix/Standard/Full; Guarded raises dose without replacing workflow | Focused artifacts plus skeptical disk re-run |

If another stronger backstop is present and cheaper for the lane, use the lighter form. If no backstop catches the
failure mode before harm, keep the stronger control.

The machine-readable version is `method/control-dosing.json` in the ACEF source repo and `.acef/control-dosing.json` in
installed target repos. `lane-closeout` uses its lane bundle to select control checks, and dose-sensitive checks such as
`lean-evidence` read their lane dose before deciding which fields are mandatory. Validate it with:

```bash
acef-process-validator --check control-dosing
```

## How To Trim Safely

Trim by lane, not by deleting the safety model:

- Native contained work: outside ACEF with focused verification and no ACEF artifacts. Existing retired direct records
  keep compact compatibility closeout; no new direct run may start.
- Quick-fix/operator: compact envelope, focused regression evidence, independent review, lightweight surface and
  test-integrity gates.
- Lightweight: reuse-before-create, review, focused tests, and surface floors without full-BMAD actor matrices unless
  risk triggers require them.
- Guarded/full-BMAD: keep typed actor, worker-scope, evidence, approval, and gate records because they pay for
  separation, auditability, and high-risk drift control.

Reduce controls that duplicate a stronger control for the current lane; keep controls that guard a distinct failure
mode.
