# Laravel commands for the review checklist and dev report

Stack-specific fill-ins for `templates/slice/review-checklist.md` and the self-check table of
`templates/slice/dev-report.md`. The templates stay stack-neutral; the `{{…}}` placeholders resolve through
`stacks/laravel/profile.json`, and the `<…>` patterns below are the Laravel values. These rows are the commands the
core templates carried before ACEF-NEUTRAL-01 (provenance: `docs/slice-lane/SOURCES.md`).

## Placeholders (profile.json)

| Placeholder | Laravel command |
|---|---|
| `{{test_command}}` | `php vendor/bin/phpunit` (lane config: `-c phpunit.l<N>.xml`) |
| `{{test_filter}}` | `php vendor/bin/phpunit --filter` |
| `{{static_analysis}}` | `php vendor/bin/phpstan analyse --no-progress` |
| `{{boundary_check}}` | `php scripts/check-module-boundaries.php` (`--modules-dir=app/Modules --namespace='App\Modules'`) |
| `{{standards_check}}` | `scripts/standards-check.sh {tree}` with `scripts/standards/rules.json` from `standards/rules.example.json` |
| `{{route_list}}` | `php artisan route:list --json` |
| `{{app_shell}}` | `php artisan tinker --execute` |
| `{{migrate_roundtrip}}` | `scripts/migrate-roundtrip.sh [--database=<conn>] [--path=…] [--realpath] [--force] [--schema-path=…]` (from `migrate-roundtrip.sh`): `php artisan migrate`, then `php artisan migrate:rollback --step=<n>`, n = rows newer than the newest batch before the run; arguments reach status, migrate and rollback alike, all calls `--no-ansi`; any other argument exits 2; nothing applied, zero Ran rows before the run (missing or empty migrations table: a schema dump could load), or new rows in more than one batch exit 3 without a rollback. Laravel 10+ (two-column `migrate:status`) |
| `{{dependency_check}}` | `composer validate --strict` |
| `{{browser_smoke}}` | `APP_ORIGIN=http://127.0.0.1:{port} npm run test:smoke` |

## Checklist B, C, D

| # | Laravel evidence command |
|---|---|
| B1 | `git -C <host> grep -n "<package-prefix>::"` (view/lang namespace) |
| B2 | `git -C <host> ls-files 'resources/views/vendor/<package>/*' 'lang/vendor/<package>/*' 'config/<package>*.php'` (vendor:publish copies) |
| C1 | `git grep -ohE "route\('[^']+'" -- resources app/Modules \| sort -u` ↔ `php artisan route:list --json` (difference 0) |
| C2 | `Route::has` loop over `config/route_permissions.php` and `navigation` config (architecture test or `php artisan tinker --execute`) |
| C5 | `git diff <base>..<candidate> -- phpstan-baseline.neon` deletions only; PHPStan prints no "Ignored error pattern … was not matched" |
| C6 | `git grep -n "env('" -- config` ↔ `.env.example`, `phpunit*.xml` (e.g. `CACHE_DRIVER` ↔ `CACHE_STORE`) |
| C7 | `config/route_permissions.php` value ↔ `Policy::<ability>` line, per changed route |
| C8 | `View::exists` loop, or `route:list` + `git grep "view('"` |
| C9 | `scripts/migrate-roundtrip.sh` on a database at the base schema (the slice's migrations pending): rolls back only those (`--step=<n>`), never an earlier batch; afterwards host table and index still there; `down()` never drops a host table |
| D2 | Octane workers, queue workers: request-scoped cache, static state, generation/invalidation |
| D3 | cross-tenant matrix covers HTML + JSON + Livewire payloads |

## Dev report self-check rows

| Rule | Laravel pattern |
|---|---|
| no business logic in the UI layer | `GATE-LW1` (`DB::transaction`, `Mail::`, `->forceFill(` in `app/Livewire`, `app/Modules/*/Livewire`) |
| tenant scope bypass | `git grep -n withoutGlobalScope` |
| new route names registered, new views exist | C1, C8 above (`route('…')`, `view('…')`) |
| migration rollback | `git grep -n "function down" -- database/migrations` |
| no direct queries in UI/controllers (module rules) | `Model::query()`, `::where()`, `::find()`, `->paginate()`, `DB::table()`; see `templates/module-CLAUDE.md` |
