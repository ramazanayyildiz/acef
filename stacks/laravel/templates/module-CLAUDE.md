# <Modül> Module — agent rules

<!-- Laravel adapter variant of templates/slice/module-CLAUDE.md (stack-neutral core). Structure taken from the JKM module rules (docs/slice-lane/SOURCES.md); product content replaced by placeholders. Place it at app/Modules/<Modül>/CLAUDE.md (or AGENTS.md). Keep it under ~80 lines: hard rules only, link the specs. -->

## Canonical specs to read BEFORE editing

- `<docs/specs/<modül>-states.md>` — <state machine: N states, M legal edges>.
- `<service contract doc>` — <the module's public service contract>.
- `<test design doc>` — <risk model, P0 coverage, fixture strategy>.

## Hard rules

1. **No business logic or direct queries in Livewire/controllers.** No `Model::query()`, `::where()`, `::find()`, `->paginate()`, `DB::table()` there — even for reads. Data access goes through `<Modül>Service` (and its repositories). Controllers stay thin: validation + delegation + serialisation.
2. **Never bypass the state machine.** State writes only via `<Modül>Service::transition()` or its named wrappers (`<publish>`, `<cancel>`…). Direct `$model->state = …; save()` is forbidden.
3. **Single transaction for state + audit.** Every state-changing method writes the new state AND the audit row in one transaction; audit failure rolls back state.
4. **Lock before re-checking state.** Inside `transition()` the row is locked (`lockForUpdate()`) and state is re-read inside the lock.
5. **Domain events fire AFTER commit** (`DB::afterCommit()` or post-transaction dispatch). Never inside the transaction.
6. **Capability via the authz package.** Routes use `route.permission` middleware + `config/route_permissions.php`. No custom `Ensure*` middleware. Capabilities are 3-segment dotted (`<resource>.<action>.<scope>`).
7. **Module views** live under `app/Modules/<Modül>/Resources/views/`, rendered as `view('<modül>::…')`.
8. **i18n.** User-facing strings via `__('<modül>.*')`; keys in every locale file, parity-tested.
9. **Tenant scope bypass discipline.** `withoutGlobalScope(<TenantScope>::class)` only on the listed surfaces: <public surfaces>, <tenant-less jobs>. Authorise (or apply the equivalent public guard) BEFORE the bypass. New bypass sites need review.
10. **Module boundaries.** New `App\Modules\<Other>\…` references must not add an edge to `scripts/module-boundaries.json`; run `php scripts/check-module-boundaries.php`.

## Lifecycle editability

`<Support/<Modül>Editability>` answers "may this surface still change?" for UI and write paths; `assert()` under the row lock throws `<StateLocked>`. Add new surfaces there instead of ad-hoc state lists.

## Error codes

| Code | Exception | HTTP |
| --- | --- | --- |
| <PRJ-MOD-1001> | <IllegalStateTransition> | 422 |
| <PRJ-MOD-1002> | <StateLocked> | 409 |

## General agent rules

Follow `<docs/rules/general.md>`: verify reality before reasoning, scope discipline, minimal verifiable change, tests are part of the change, output is the source of truth, no silent risk (migrations need `down()` or a written reason), stop conditions.
