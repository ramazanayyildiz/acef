# State-Machine Pushed Context

ACEF should make the next safe instruction explicit before an agent reads broad docs, picks skills, or continues from
chat memory. The design is Noskills-inspired in one narrow sense: the agent asks ACEF for the next small instruction, and
ACEF pushes the bounded context for the current state.

This does not replace ACEF's evidence, gate, ledger, typed-state, or Process Judge model. It is a projection over those
sources.

## Why ACEF needs this

ACEF already has skills, ledgers, typed state, worker scope, current-context slices, evidence manifests, and validators.
The remaining drift usually comes from the moment before work starts:

- a user says "go on" and the agent infers a new epic or story;
- a worker finishes one phase and silently continues into another;
- every worker rereads the full ledger or planning folder to discover what to do;
- tool-specific skill behavior differs between Claude, Codex, and OpenCode;
- a prompt treats retrieved text as permission or evidence.

State-machine pushed context narrows that moment. Instead of "agent chooses a skill and reads docs", the agent calls:

```sh
acef next --repo .
```

ACEF returns one bounded instruction packet for the active state: role, next allowed action, write boundary, required
evidence, context artifacts, forbidden actions, and stop condition.

## Skill selection vs state-machine instruction

| Concern | Skill selection | State-machine instruction |
| --- | --- | --- |
| Trigger | Agent interprets task and chooses a skill | ACEF reads active typed state and returns the next allowed action |
| Authority | Skill prompt can advise behavior | Ledger, typed state, worker scope, gates, and approvals remain authoritative |
| Scope | Skill may be broad unless constrained | Output is bounded to active story/phase/role |
| Evidence | Skill may describe what evidence to collect | Evidence still comes from commands, manifests, hashes, and gate records |
| Tool parity | Skill bodies can drift across clients | `acef next` returns the same JSON contract for Claude, Codex, and OpenCode |

Skills remain useful as lenses or workflows after the next state is known. They do not decide the active story, gate
status, next epic, or write boundary.

## Proposed command

Future scaffold:

```sh
acef next --repo . [--role developer] [--format json]
```

Expected behavior:

1. Read `docs/ai/ACEF_ACTIVE_RUN.json`.
2. Read the active ledger pointer (`ACEF_ACTIVE_LEDGER` or `docs/ai/ACEF_ACTIVE_LEDGER`) for canonical run identity.
3. Read the current actor record and `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` when a worker is active.
4. Validate `docs/ai/ACEF_CURRENT_CONTEXT.md` freshness using the existing current-context validator.
5. Inspect gate verdicts, evidence manifests, and approval receipts relevant to the active phase.
6. Emit a bounded JSON instruction packet.
7. Refuse to emit a forward-moving action when required state, evidence, scope, or approval is missing.

`acef next` should be read-only. It should not advance state, edit ledgers, approve gates, run tests, spawn workers, or
choose the next story.

## Proposed JSON contract

```json
{
  "schema": "acef.next.v1",
  "repo": "example",
  "active_state": {
    "lane": "lightweight|bmad",
    "phase": "atdd|dev|review|judge|epic-close",
    "story": "4.1",
    "role": "developer",
    "last_passed_gate": "Story 4.1 ATDD",
    "next_allowed_action": "implement_to_green"
  },
  "allowed": {
    "can_write": true,
    "paths": ["tests/Feature/Story41*.php", "app/Twill/Capsules/Blogs/**"],
    "commands": ["php artisan test --filter=Story41"]
  },
  "forbidden": {
    "paths": ["docs/ai/ACEF_*", "_bmad-output/**"],
    "actions": ["start_next_story", "spawn_worker", "push"]
  },
  "context": {
    "current_context": "docs/ai/ACEF_CURRENT_CONTEXT.md",
    "epic_pack": "docs/ai/epic-4-context-pack.md",
    "story_artifact": "_bmad-output/stories/story-4.1.md",
    "pattern_slice": "docs/ai/pattern-registry.json#twill-content-capsule"
  },
  "evidence_required": [
    "failing_tests_before_implementation",
    "green_test_command",
    "changed_files_summary"
  ],
  "stop_condition": "one_commit_then_report"
}
```

The packet should stay small enough to paste into any client prompt. Large artifacts are referenced by path and hash
where applicable; their full contents are not embedded.

## Existing ACEF inputs

`acef next` is a projection over existing ACEF state:

- `ACEF_ACTIVE_RUN.json` provides lane, story, phase, status, and active ledger.
- `docs/ai/actors/*.json` provides actor identity and allowed context profile.
- `ACEF_ACTIVE_WORKER_SCOPE.json` provides write paths, base ref, max commits, and no-spawn/no-ledger-edit boundaries.
- `ACEF_CURRENT_CONTEXT.md` provides the hot slice, but is not canonical state.
- Epic Context Pack and story artifacts provide bounded human-readable context.
- Pattern registry and generated PR review profiles provide conformance slices.
- `docs/ai/evidence/*.json` provides command evidence and raw artifact hashes.
- `docs/ai/gates/*.json` provides gate verdicts.
- `docs/ai/approvals/*.json` provides human approval receipts for guarded transitions.
- The delivery ledger remains the durable narrative of the run.

## Must not do

`acef next` must not:

- replace the delivery ledger;
- replace Story or Epic Process Judge;
- treat retrieval, current-context, or selected snippets as evidence;
- auto-approve gates;
- let workers choose their own next story;
- infer human approval from generic phrases like "go on", "continue", "devam", or "tamamla";
- spawn workers or allow worker-spawned workers;
- push, merge, or change external state;
- promote a retrieval backend, database, vector store, graph, SCIP, Serena, or custom runtime.

## Drift prevention

| Drift risk | State-machine response |
| --- | --- |
| `go on` drifts into next epic | Return only the active state's next allowed action. Epic transition requires a typed approval receipt naming the target epic. |
| Worker continues into another story | Worker scope binds `workerId`, story, phase, allowed paths, base ref, and stop condition. The forbidden actions include `start_next_story`. |
| Every worker rereads full ledger/context | Return paths to current-context, epic pack, story artifact, pattern slice, and focused commands instead of full ledgers. |
| Fake user approval | Require a typed approval receipt with exact quote, scope, target epic when applicable, actor type, and repository commit. |
| Tool-specific skill drift | Claude, Codex, and OpenCode receive the same JSON packet; tool-specific skills become execution helpers, not route authority. |

## Phase examples

| Phase | `next_allowed_action` | Allowed | Forbidden | Evidence required | Stop condition |
| --- | --- | --- | --- | --- | --- |
| Planning | `write_or_update_story_artifact` | story/planning artifact paths | implementation files, gate approval | story artifact, AC trace, open questions | story ready for ATDD or blocked |
| ATDD | `write_failing_tests` | target test files | production implementation beyond fixtures | failing test command, test intent matrix | failing test artifact then report |
| Dev | `implement_to_green` | active worker-scope paths | next story, ledger edits, gate approval | failing-before, green command, changed-files summary | one commit then report |
| Review | `review_report_only` | review report artifact | implementation writes, gate approval | file:line findings, AC trace, focused test evidence | report findings then stop |
| Verify-patch | `apply_required_review_patch` | scoped patch paths from review disposition | unrelated fixes, new scope | patch summary, regression command, disposition evidence | patch commit then report |
| Process Judge | `judge_current_story_or_phase` | judge report/gate artifact | implementation edits, approval fabrication | actor records, evidence manifests, gate checklist | PASS/FAIL/REVISE/BLOCKED verdict |
| Epic close | `audit_epic_gate_chain` | epic close report/gate artifact | next epic start without approval | full epic evidence trace, story gates, runtime smoke | close epic or request explicit approval |

## Future `scripts/acef-next` scaffold

Do not build a runtime first. The smallest useful scaffold would be:

- schema: `schemas/acef-next.schema.json`;
- parser helper in `scripts/lib/acef-state-parser.js`;
- CLI: `scripts/acef-next`;
- validator checks:
  - active run exists and is not stale;
  - current context matches active story/phase and is fresh;
  - worker scope matches active actor when the phase can write;
  - required gate/evidence/approval records exist before transitions;
  - output remains bounded and role-specific.

## Intended tests

Add these before admitting `acef next` as a real command:

- no next-epic output without explicit typed approval;
- no worker story continuation after stop condition;
- stale current-context rejected;
- output is bounded and role-specific;
- approval receipt required for human gates;
- retrieval/current-context path cannot satisfy evidence requirements;
- missing worker-scope blocks write-capable phases;
- same output contract works for Claude, Codex, and OpenCode adapters.
