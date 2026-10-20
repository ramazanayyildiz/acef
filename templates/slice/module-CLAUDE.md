# <Modül> Module — agent rules

<!-- Generic, stack-neutral module rules file (structure from a source project's module rules, JKM in docs/slice-lane/SOURCES.md; product content replaced by placeholders). Place it at <modules dir>/<Modül>/CLAUDE.md (or AGENTS.md). Keep it under ~80 lines: hard rules only, link the specs. A stack adapter may ship a filled-in variant: stacks/<stack>/templates/module-CLAUDE.md. -->

## Canonical specs to read BEFORE editing

- `<docs/specs/<modül>-states.md>` — <state machine: N states, M legal edges>.
- `<service contract doc>` — <the module's public service contract>.
- `<test design doc>` — <risk model, P0 coverage, fixture strategy>.

## Hard rules

1. **No business logic or direct queries in the UI/HTTP layer.** No <query builder / ORM calls> in <UI components> or <controllers / handlers> — even for reads. Data access goes through `<Modül>Service` (and its repositories). Handlers stay thin: validation + delegation + serialisation.
2. **Never bypass the state machine.** State writes only via `<Modül>Service::transition()` or its named wrappers (`<publish>`, `<cancel>`…). Assigning the state field directly and saving is forbidden.
3. **Single transaction for state + audit.** Every state-changing method writes the new state AND the audit row in one transaction; audit failure rolls back state.
4. **Lock before re-checking state.** Inside `transition()` the row is locked (<row lock call>) and state is re-read inside the lock.
5. **Domain events fire AFTER commit** (<after-commit hook> or post-transaction dispatch). Never inside the transaction.
6. **Capability via the authorisation layer.** Routes declare their capability through <route permission mechanism>; no ad-hoc per-module guards. Capabilities are 3-segment dotted (`<resource>.<action>.<scope>`).
7. **Module views/templates** live under `<modules dir>/<Modül>/<views dir>/`, referenced through the module's own namespace/prefix.
8. **i18n.** User-facing strings via the translation helper with `<modül>.*` keys; keys in every locale file, parity-tested.
9. **Tenant scope bypass discipline.** Bypassing the tenant scope (<scope bypass call>) only on the listed surfaces: <public surfaces>, <tenant-less jobs>. Authorise (or apply the equivalent public guard) BEFORE the bypass. New bypass sites need review.
10. **Module boundaries.** New references to another module must not add an edge to the boundary baseline; run `{{boundary_check}}`.

## Lifecycle editability

`<Support/<Modül>Editability>` answers "may this surface still change?" for UI and write paths; `assert()` under the row lock throws `<StateLocked>`. Add new surfaces there instead of ad-hoc state lists.

## Error codes

| Code | Exception | HTTP |
| --- | --- | --- |
| <PRJ-MOD-1001> | <IllegalStateTransition> | 422 |
| <PRJ-MOD-1002> | <StateLocked> | 409 |

## General agent rules

Follow `<docs/rules/general.md>`: verify reality before reasoning, scope discipline, minimal verifiable change, tests are part of the change, output is the source of truth, no silent risk (migrations need a rollback step or a written reason), stop conditions.
