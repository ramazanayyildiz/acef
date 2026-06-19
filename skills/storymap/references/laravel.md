---
title: laravel
type: note
permalink: ram/04-ai-toolkit/skills/test/storymap/references/laravel
---

# Laravel Extraction Reference

## Route Discovery

```
routes/web.php      → browser-facing routes
routes/api.php      → API routes
routes/console.php  → CLI commands (Artisan)
routes/channels.php → broadcast channels
```

Group routes by prefix: `/admin/*`, `/api/users/*`, `/dashboard/*` = activities.
Each route = a task. HTTP method hints at the action type.

Run `php artisan route:list --json` for the complete route table.

## Controller Discovery

```
app/Http/Controllers/*.php
app/Http/Controllers/Api/*.php
```

Each controller class = a feature area (often maps to an activity).
Each public method = a task:
- `index()` → "Browse [things]"
- `create()` / `store()` → "Create [thing]"
- `show()` → "View [thing]"
- `edit()` / `update()` → "Edit [thing]"
- `destroy()` → "Remove [thing]"

Resource controllers have all 7 methods. Invokable controllers have one.

## Auth / Actor Discovery

```
app/Http/Middleware/*.php
app/Policies/*.php
app/Http/Kernel.php → middleware groups
```

- `auth` middleware → authenticated user
- `guest` middleware → unauthenticated visitor
- `admin` / `role:admin` → admin actor
- Policies define per-model permissions → fine-grained actor capabilities

Also check `config/auth.php` for guards (web, api, sanctum).

## Model / Entity Discovery

```
app/Models/*.php
database/migrations/*.php
```

Models = the nouns. Relations (`hasMany`, `belongsTo`) = entity connections.
Migrations show the schema evolution = entity history.

Factories (`database/factories/`) show test data patterns.

## Test Discovery

```
tests/Feature/*.php    → integration/HTTP tests
tests/Unit/*.php       → unit tests
tests/Browser/*.php    → Dusk E2E tests
```

Map test classes to controllers/models by naming convention.

## Special Laravel Patterns

- **Form Requests** (`app/Http/Requests/`) → validation rules = edge cases/failure modes
- **Events** (`app/Events/`) → side effects
- **Jobs** (`app/Jobs/`) → async operations
- **Notifications** (`app/Notifications/`) → user-facing outputs
- **Observers** (`app/Observers/`) → implicit behavior triggered by model changes
- **Middleware** stacks → the gates users pass through

## Git Co-Change Patterns

- Controller + Form Request + Views = feature boundary
- Model + Migration + Factory = entity boundary
- Event + Listener + Notification = side effect chain