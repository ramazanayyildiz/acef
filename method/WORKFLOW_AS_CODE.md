# Workflow-as-Code

ACEF adopts three workflow-runner ideas without adopting a full external runtime:

1. **Workflow-as-code** — common delivery flows can be expressed as small YAML graphs under `workflows/`.
2. **Artifact passing** — nodes name their input and output files instead of inheriting a full chat transcript.
3. **Fresh node context** — each worker/node starts from `acef-status`, `acef-next`, and the node's declared artifacts.

This does not replace ACEF's ledger, typed state, evidence manifests, Process Judge, or human approvals. A workflow file
describes permitted sequencing; it is not evidence that a node ran.

## Minimal workflow format

Example:

```yaml
workflow: lightweight-review
version: 1
nodes:
  - id: implement
    type: agent
    role: developer
    inputs:
      - docs/ai/ACEF_CURRENT_CONTEXT.md
      - docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json
    outputs:
      - docs/ai/reports/lightweight-implementation.md
  - id: test
    type: command
    command: focused-test-command-from-current-context
    requires:
      - implement
    inputs:
      - docs/ai/reports/lightweight-implementation.md
    outputs:
      - docs/ai/evidence/lightweight-focused-test.json
```

Validate definitions with:

```bash
.acef/bin/acef-workflow-validate --repo . --workflow .acef/workflows/lightweight-review.yaml
```

The validator checks node IDs, node types, dependency order, required agent roles/commands, and repo-relative
input/output paths. It does not execute the graph.

## Active run binding

`ACEF_ACTIVE_RUN.json` may point at the current workflow node:

```json
{
  "workflowPath": ".acef/workflows/lightweight-review.yaml",
  "workflowNodeId": "implement"
}
```

When present, `.acef/bin/acef-next --repo .` includes:

- `active_state.workflow_node_id`
- `workflow_node.id/type/requires/inputs/outputs`
- `context.inputs`
- `context.outputs`

Fresh workers should receive only those inputs plus the role-specific task prompt. They should write only the declared
outputs and the paths allowed by `ACEF_ACTIVE_WORKER_SCOPE.json`.

## Guard behavior

The Codex guard now treats typed state as a prerequisite for worker writes. A worker-scoped write is not certifiable
unless:

- `docs/ai/ACEF_ACTIVE_RUN.json` exists and is active;
- `docs/ai/ACEF_CURRENT_CONTEXT.md` exists;
- the active run ledger exists;
- `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` exists and matches the active story;
- changed files stay inside the worker scope.

This is the practical answer to "what if the agent does not ask ACEF first?": the write boundary refuses to certify a
worker that skipped active state.

## Not in this slice

This slice does not add:

- a workflow runner;
- visual cockpit;
- automatic agent spawning;
- automatic state transitions;
- token optimizer;
- vector/graph/SQLite backend.

Those should be admitted only after this small workflow contract proves useful in real ACEF runs.
