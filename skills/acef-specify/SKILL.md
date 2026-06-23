---
name: acef-specify
version: 1.0.0
description: "Prepare requirements, design, and planning artifacts for ACEF brownfield large-feature work. Use when a route requires requirements/design/planning before implementation. Imports BMAD/Kiro/manual artifacts if they exist and does not regenerate them. If no artifacts exist, guides a lightweight requirements/design/planning flow and keeps traceability from requirements to stories/tasks."
---

# ACEF Specify

Use this skill for Route B large features or unclear work that has escalated beyond a small feature.

## Sources

- `docs/ai/ACEF_BROWNFIELD_PILOT_ROUTES.md`
- project adapter
- existing BMAD/Kiro/manual artifacts if present

## Rule

Generate once.

If BMAD/Kiro/manual requirements/design/tasks already exist, import and normalize them. Do not recreate the same content.

Use ACEF to normalize, trace, and check readiness. Do not run a second planning pipeline when a good artifact already
exists.

For Route B/full BMAD v2, `acef-specify` may import BMAD output only after the preflight artifact proves the real BMAD
conductor/skills resolved and ran. Artifact-shaped files are not proof of BMAD. If BMAD is missing, return `HALT` or
ask for an explicit non-BMAD lightweight exception; do not generate a BMAD-like substitute.

## Procedure

1. Confirm Route B or large/new-pattern route.
2. Read the preflight artifact. If it is missing, or its verdict is not `PASS`, stop and ask for the missing gate.
   For Route B, verify whether BMAD is available or halted; do not infer it from the route label.
3. Check existing artifacts:
   - brief
   - requirements
   - design/architecture
   - story map
   - epic/story/task breakdown
4. If artifacts exist:
   - map requirements to AC
   - map design to affected modules/contracts
   - map stories/tasks to requirements
5. If artifacts do not exist:
   - gather minimal brief
   - draft requirements with acceptance criteria
   - draft design focused on affected modules, data/API/UI flow, risks
   - split into stories/tasks
6. Add route readiness:
   - scope/non-goals
   - risks
   - golden neighbors
   - tests needed
   - open decisions

## Traceability Format

Prefer this chain when creating or normalizing artifacts:

- `FR-###` for functional requirements
- `US-###` for user stories
- `SC-###` for scenarios / acceptance criteria
- task rows tagged with the related `FR/US/SC`

Acceptance criteria should use EARS-style wording when practical:

- WHEN {trigger}, THE {system} SHALL {response}
- IF {condition}, THEN THE {system} SHALL {response}

For brownfield changes, represent changes as deltas where useful:

- ADDED
- MODIFIED
- REMOVED

Tasks should include dependencies and test strategy when non-trivial.

## Output

```md
Route:
Existing artifacts:
Requirements summary:
Design summary:
Planning breakdown:
Traceability:
Open decisions:
Ready for implementation: yes/no
```

## Guards

- Do not turn small feature work into ceremony.
- Do not overwrite BMAD/Kiro artifacts without approval.
- Do not proceed to implementation if scope, AC, or affected modules are unclear.
- Do not treat route classification as permission to run the large-feature lane. Capability preflight must pass first.
- Do not treat trace IDs as bureaucracy; use them only to preserve requirement → story/scenario → task/test linkage.
