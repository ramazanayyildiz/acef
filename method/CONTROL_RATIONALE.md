# ACEF Control Rationale

ACEF controls were not added as paperwork. They were added to close specific failure modes seen in real agent work:
wrong actor, wrong scope, stale evidence, generic approval, phase drift, self-review, and repeated full-ledger reads.

The important distinction is:

- **Correctness-producing controls** help find product or code bugs directly.
- **Drift/scope/evidence controls** make sure the right actor worked on the right scope with durable evidence and did not
  silently skip or invent a gate.

The second group is not a correctness oracle, but it is not theater. It protects the delivery process around the
correctness controls.

## Correctness-Producing Controls

These controls are the parts most likely to catch real product bugs:

- **Adversarial independent review** catches missing surfaces, wrong defaults, hidden regressions, and self-confirming
  implementation assumptions.
- **Recall/regression tests** prove the specific bug, behavior, or acceptance criterion that matters.
- **Reuse-before-create** prevents parallel engines, duplicate helpers, and accidental divergence from established local
  contracts.
- **Runtime and surface floors** prevent "green" work that only passes in memory, through an isolated render, or through a
  status-only smoke.
- **Guarded boundary tests** force high-risk auth, payment, entitlement, data, and permission changes to have at least
  one symbol-grounded test.

These are the spine of quality. When ACEF catches a semantic bug, it is usually through this group.

## Drift, Scope, And Evidence Controls

These controls exist because agents can produce plausible narratives while drifting across roles, phases, or scope.

They answer questions that tests alone usually do not answer:

- Who was allowed to write?
- Which story and phase was active?
- Was this actor allowed to edit this path?
- Did the reviewer approve their own work?
- Was the command actually run on this commit?
- Did the raw output still match the evidence record?
- Was a human approval exact, or inferred from "go on"?
- Did a worker continue into the next phase or story?
- Did a gate pass because an artifact exists, or because the required evidence exists?

These controls should be scaled by lane. Quick-fix and operator work should not carry full-BMAD ceremony, but guarded and
full-BMAD work still need strong actor, scope, evidence, and gate boundaries.

## Why Typed State Exists

Markdown remains the human chronology. JSON sidecars carry machine truth.

Typed state exists because hooks, validators, status tools, and query tools should not each parse prose differently for
critical facts. A delivery ledger can say what happened in human terms; a sidecar gives machinery one unambiguous place
to read the active run, actor, scope, evidence, gate, or approval.

Primary failure modes it closes:

- fragile Markdown parsing;
- stale or conflicting ledger prose;
- tool-specific interpretation drift;
- "chat said it passed" replacing repo-backed state;
- missing state at session resume.

Typed state is not a semantic correctness oracle. It is the substrate that lets mechanical guards read the same facts.

## Why Actor Records Exist

Actor records are not only attribution. They make actor separation checkable.

They exist to prevent:

- a code author reviewing or approving their own work;
- the conductor becoming the developer, reviewer, verifier, or Process Judge;
- generic subagents being called BMAD personas without a bound role;
- phase provenance collapsing into one invisible assistant session;
- a Process Judge verdict without an independent judge identity.

Independent review caught real bugs in dogfood. Actor records make that independence auditable instead of only asserted.

## Why Worker Scope Exists

Worker scope is the write fence.

It exists to prevent:

- a worker continuing into another story;
- a worker writing outside the approved paths;
- a reviewer or conductor patching implementation files;
- a worker editing the delivery ledger or active ACEF state;
- worker-spawned subagents escaping the active phase;
- multiple commits or broad edits under one narrow worker prompt.

The hard-wall hook is built around this control. When the harness can propagate identity, the hook checks the actor and
scope. When identity is unavailable, the scope file remains the trust anchor and the hook can degrade to phase/path
enforcement instead of blocking all writes.

## Why Evidence Manifests Exist

Evidence manifests exist because agent claims are not evidence.

They bind a command result to:

- exact command;
- exit code;
- repository commit or tree;
- dirty/clean worktree state;
- actor and story;
- raw output path and hash;
- runner proof over the relevant fields;
- gates or checks satisfied.

This reduces accidental fake-green, stale-output, wrong-commit, and chat-only evidence. It does not stop a malicious
actor who can forge all inputs, and ACEF should not claim that it does. The trust model is cooperative-local: these
records defend against honest or lazy evidence gaps.

## Why Gate Verdicts Exist

Gate verdicts make `PASS` a file-backed decision, not a word in chat.

They exist to prevent:

- a story being marked done because supporting artifacts exist;
- a Process Judge pass without successful evidence;
- skipped evidence being hidden inside prose;
- a stale or unrelated command satisfying a gate;
- inconsistent closeout checks across clients.

A gate verdict still does not prove semantic correctness by itself. It proves that the required gate evidence exists and
was used by the right decision role.

## Why Approval Receipts Exist

Approval receipts exist because generic continuation text caused scope drift.

They prevent:

- "go on", "continue", "devam", or "tamamla" from starting the next epic;
- guarded/high-risk work starting without explicit human approval;
- broad autonomy being mistaken for scope approval;
- approval claims without an exact quote and target scope.

The approval receipt binds the decision, target scope, actor type, quote, and commit. It is still not cryptographic proof
of user intent; it is a durable local record that can be reconciled to the conversation.

## Why Active Run And `acef-next` Exist

Active run state and `acef-next` exist to stop the moment-before-work drift.

They prevent:

- agents choosing a new story from chat memory;
- workers silently moving from dev to review or judge;
- every worker rereading the full ledger to discover what to do;
- tool-specific skill instructions becoming the authority;
- current-context snippets being treated as approval or evidence.

`acef-next` is a projection over typed state and the active ledger. It returns the next allowed action, allowed paths,
required evidence, forbidden actions, and stop condition. It does not replace the ledger, evidence, Process Judge, or
human approvals.

## Why Surface Contracts Exist

Surface contracts are a runtime floor, not full semantic proof.

They prevent:

- in-memory persistence passing as durable behavior;
- an isolated component render passing as a reachable user surface;
- status-only HTTP smoke replacing meaningful runtime proof;
- unknown surfaces passing by omission.

They do not prove that the right actor was stamped, the right value was frozen, or the business math is correct. Those
semantics must come from tests, review, and domain-specific assertions.

## How To Price Integrity Controls

"This control closes failure mode Y" is necessary, but not enough. Every integrity control should also answer two
questions:

- Did this control actually fire in the run, or did it only record that the problem did not occur?
- If this artifact did not exist, what would catch the failure mode, and would that alternative be cheaper or stronger?

This keeps ACEF honest about the difference between active enforcement, audit insurance, and redundant ceremony.

Use this pricing model:

- **Worker scope** is load-bearing because few other controls mechanically catch scope escape before the write happens.
  Keep it in every lane, with the strictest behavior reserved for guarded/full-BMAD work.
- **Cold-read and active-run context** are load-bearing when the executor is drift-prone, cross-session, or multi-agent.
  They can be lighter in a tight single-context quick fix, but they should not disappear when workers are involved.
- **Evidence manifests, runner proof, and gate verdicts** mainly defend against honest stale-output, wrong-commit,
  wrong-command, and chat-only evidence. A skeptical re-run can catch many of the same issues, so these records are most
  valuable when review is asynchronous, unattended, guarded, or later-audited.
- **Actor records** make separation auditable. In runtimes where the harness does not propagate worker identity, they
  record separation more than they cause it; the causal control is the actual separate worker topology plus the
  write-scope guard.
- **Approval receipts** are strongest against scope drift from ambiguous human text. They matter most at epic
  transitions, guarded/high-risk starts, and any point where "continue" could be misread as new scope approval.
- **Surface contracts** are a floor against fake runtime proof. They do not replace semantic tests, review, or domain
  assertions.

The trust ceiling matters: keyless self-hashes and agent-supplied evidence can pass a self-consistent forgery. They
should be priced as cooperative-local guardrails and async audit trails, not cryptographic proof. When a skeptical
observer re-runs the commands from disk, that observer is the stronger backstop. When no observer is present, the
artifact earns more of its cost.

## Control Dosing Table

Use this table when deciding whether a lane needs the full artifact, a lighter form, or only a human/backstop check.

| Control | Primary failure mode | Role | Required dose | Backstop if lighter |
| --- | --- | --- | --- | --- |
| Worker scope | Scope escape before or during writes | Active enforcement | All lanes; strict actor+path binding for guarded/full-BMAD | Human diff review is weaker and happens after the write |
| Cold-read/current context | Chat-memory drift, stale story, wrong phase | Active guidance plus drift guard | Any cross-session, multi-agent, or drift-prone work | Tight single-context quick fix with explicit user scope |
| Active run and `acef-next` | Wrong next action, phase jump, broad ledger reread | Active guidance | Lightweight/guarded/full-BMAD; optional compact form for quick-fix | Manual conductor check against ledger/status |
| Actor records | Self-review, role collapse, unverifiable separation | Audit plus policy guard | Any lane with independent workers/reviewers; required for guarded/full-BMAD | Real separate-worker topology plus reviewer report, but less auditable |
| Approval receipts | Ambiguous "continue" treated as new scope approval | Scope guard | Epic transitions, guarded starts, high-risk expansions | Fresh explicit user confirmation |
| Evidence manifest | Stale output, wrong command, wrong commit, chat-only evidence | Audit plus evidence guard | Guarded/full-BMAD/unattended; lighter command log for quick-fix/lightweight | Skeptical re-run from disk |
| Runner proof | Evidence record edited after command or detached from raw output | Cooperative integrity guard | Guarded/full-BMAD/unattended | Skeptical re-run and raw log inspection |
| Gate verdict | PASS without required evidence or wrong decision actor | Decision guard | Guarded/full-BMAD; lightweight closeout when typed gates are used | Manual closeout checklist plus independent review |
| Surface contract | Fake runtime proof, in-memory persistence, unreachable UI | Runtime floor | Any user-visible or persistence-affecting feature lane | Manual browser/runtime check with durable persistence proof |
| Test-integrity check | Green-by-weakening-tests | Active guard | Any lane where the worker edits tests inside the envelope | Reviewer diff of assertions/skips/imports |

The table is intentionally not a universal "always require everything" rule. It is a dosing rule: if another stronger
backstop is present and cheaper for the lane, use the lighter form; if no backstop catches the failure mode before harm,
keep the stronger control.

The machine-readable version lives in `method/control-dosing.json` and is validated by:

```bash
node scripts/acef-process-validator --repo . --check control-dosing
```

Target repos installed with current ACEF tools receive the same manifest at `.acef/control-dosing.json`. The
`lane-closeout` check validates this manifest before running the lane's closeout bundle.

## How To Trim Without Breaking The Safety Model

Trim ceremony by lane, not by deleting the safety model:

- Quick-fix and operator work can use compact envelopes, focused regression evidence, independent review, and lightweight
  surface/test-integrity gates.
- Lightweight work should keep reuse-before-create, review, focused tests, and surface floors, but avoid full-BMAD actor
  matrices unless risk triggers require them.
- Guarded and full-BMAD work should keep typed actor, worker-scope, evidence, approval, and gate records because the
  cost is paying for separation, auditability, and high-risk drift control.

The practical rule: reduce controls that only duplicate another stronger control for the current lane; keep controls that
guard a distinct failure mode.
