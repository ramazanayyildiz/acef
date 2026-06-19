---
title: laravel
type: note
permalink: ram/04-ai-toolkit/skills/test/test-case-planner/references/laravel
---

# Laravel Reference — Test Case Planner

Framework-specific terminology and examples for `test-case-planner`
when analyzing Laravel codebases.

Read this file when the source code is identified as a Laravel project
(presence of `use Illuminate\`, `artisan`, `composer.json` with `laravel/framework`, etc.)

---

## Terminology Mapping

| Generic term (SKILL.md) | Laravel equivalent |
|---|---|
| Module / Class | Service, Repository, Action, Trait |
| HTTP handler | Controller (Resource or Invokable) |
| Route guard / middleware | Middleware, Gate, Policy |
| Data model | Eloquent Model |
| Query / scope | Eloquent scope (`scopeActive()`, etc.) |
| Input validator | FormRequest (`rules()`, `authorize()`) |
| Async job | Job (`implements ShouldQueue`) |
| Event | Event + Listener / Observer |
| Notification | Notification (`via()`, `toMail()`, etc.) |
| Queue worker | Horizon worker, queue connection |
| Background task | Scheduled command (`php artisan schedule:run`) |
| Browser test tool | Laravel Dusk (use `test-browser-generator` for code) |

---

## Section A: Unit Tests — Laravel Examples

```
[U-001] PressReleaseService::distribute() — happy path
  Scenario : Call with a valid published PressRelease model
  Expected : Returns distribution result, no exception thrown

[U-002] PricingCalculator::calculate() — zero quantity
  Scenario : Pass quantity = 0
  Expected : Returns 0.00, no division by zero error

[U-003] SubscriptionService::renew() — payment gateway failure
  Scenario : Mock PaymentGateway to throw PaymentFailedException
  Expected : Exception caught, subscription status unchanged, error logged
```

---

## Section B: Data Model Tests — Laravel Examples

```
[M-001] PressRelease — mass assignment via factory
  Scenario : PressRelease::factory()->create([all fillable fields])
  Expected : All fields persisted and retrieved correctly

[M-002] PressRelease::scopePublished() — filters by status
  Scenario : Seed 3 published + 2 draft records
  Expected : scope returns 3, all with status = 'published'

[M-003] PressRelease — published_at cast to Carbon
  Scenario : Set published_at to a date string, retrieve model
  Expected : $model->published_at instanceof Carbon

[M-004] PressRelease::distributions() — hasMany relationship
  Scenario : Create 3 Distribution records for a PressRelease
  Expected : $pressRelease->distributions returns collection of 3
```

---

## Section C: Feature / HTTP Tests — Laravel Examples

```
[F-001] POST /api/press-releases — authenticated, valid payload
  Scenario : actingAs($user)->postJson('/api/press-releases', $validData)
  Expected : 201 Created, JSON matches structure, DB has new record

[F-002] POST /api/press-releases — unauthenticated
  Scenario : postJson('/api/press-releases', $data) without actingAs()
  Expected : 401 Unauthorized

[F-003] POST /api/press-releases — missing title
  Scenario : postJson with payload missing 'title' field
  Expected : 422 Unprocessable, errors.title present in response

[F-004] DELETE /api/press-releases/{id} — other user's resource
  Scenario : actingAs($userA)->deleteJson("/api/press-releases/{$userB_record->id}")
  Expected : 403 Forbidden, record still in DB
```

---

## Section D: Validation Tests — Laravel Examples

```
[V-001] StorePressReleaseRequest — all valid fields
  Scenario : Validator::make($validData, $request->rules())->passes()
  Expected : true

[V-002] StorePressReleaseRequest — title missing
  Scenario : Omit 'title' from input array
  Expected : $validator->errors()->has('title') === true

[V-003] StorePressReleaseRequest — title exceeds 255 chars
  Scenario : Set title to str_repeat('a', 256)
  Expected : Validation fails on 'title' with max rule error

[V-004] StorePressReleaseRequest — authorize() blocks non-owner
  Scenario : Call authorize() as user who doesn't own the resource
  Expected : Returns false, request rejected with 403
```

---

## Section E: Async / Queue / Event Tests — Laravel Examples

```
[J-001] DistributePressReleaseJob — dispatched on publish
  Scenario : Queue::fake(); $pressRelease->publish();
  Expected : Queue::assertPushed(DistributePressReleaseJob::class)

[J-002] DistributePressReleaseJob::handle() — distributes successfully
  Scenario : Instantiate job with valid PressRelease, call handle()
  Expected : Distribution records created, status updated to 'distributed'

[J-003] PressReleasePublished event — fired on publish
  Scenario : Event::fake(); $pressRelease->publish();
  Expected : Event::assertDispatched(PressReleasePublished::class)

[J-004] SendPublishedNotification — sent to owner
  Scenario : Notification::fake(); trigger publish flow
  Expected : Notification::assertSentTo($owner, PublishedNotification::class)
```

---

## Section H: Manual Tests — Laravel Examples

```
[MN-001] Distribution API integration — real provider call
  Test     : Trigger distribution with a real press release in staging
  Check    : Distribution appears in provider dashboard within 5 minutes
  Notes    : Requires staging API key, use provider sandbox mode

[MN-002] Published confirmation email — rendering
  Test     : Trigger publish, open email in Gmail and Outlook
  Check    : Subject, sender name, CTA button, footer links all correct
  Notes    : Test with both Turkish and English content

[MN-003] Stripe payment flow
  Test     : Complete subscription purchase in staging with test card 4242...
  Check    : Subscription created, webhook received, plan updated in DB
  Notes    : Use Stripe test mode, check Stripe dashboard for event log
```

---

## What NOT to Test in Laravel Projects

- Eloquent's own casting, query building, or relationship loading logic
- Laravel's validation rule implementations (`required`, `email`, `max`, etc.)
- Spatie package internals (roles, permissions, activity log core logic)
- Laravel Cashier or Stripe SDK internals
- Queue driver behavior (Redis, SQS) — only assert your job was dispatched
- Middleware pipeline order — only test that your middleware blocks/allows correctly
- `php artisan` command infrastructure — only test your command's logic