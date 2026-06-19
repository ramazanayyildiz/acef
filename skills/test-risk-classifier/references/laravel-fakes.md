---
title: laravel-fakes
type: note
permalink: ram/04-ai-toolkit/skills/test/test-risk-classifier/references/laravel-fakes
---

# Laravel Fakes & Mock Mapping

Framework-specific reference for `test-risk-classifier` when analyzing Laravel codebases.
Maps dependency classifications to the correct Laravel test helper.

---

## Classification → Laravel Fake / Helper

| Classification | Laravel implementation |
|---|---|
| `DB` | `use RefreshDatabase` trait |
| `HTTP` | `Http::fake([...])` + always add `Http::preventStrayRequests()` |
| `QUEUE` | `Queue::fake()` — for simple dispatch |
| `QUEUE_CHAIN` | `Bus::fake()` — required for `Bus::chain()`, `Bus::batch()`, `Bus::dispatchChain()` |
| `EVENT` | `Event::fake()` |
| `EMAIL` | `Mail::fake()` |
| `NOTIFICATION` | `Notification::fake()` |
| `CACHE` | `Cache::fake()` or `Cache::store('array')` |
| `FILESYSTEM` | `Storage::fake('disk-name')` |
| `TIME` | `Carbon::setTestNow(now())` or `$this->travel()->days(n)` |
| `RANDOM` | `Str::createUuidsUsingSequence([...])` |
| `CONFIG` | `config(['key' => 'value'])` in setUp() |
| `AUTH` | `$this->actingAs($user)` or `$this->actingAs($user, 'api')` |

> **Critical**: Always add `Http::preventStrayRequests()` alongside `Http::fake()`.
> Without it, any URL not explicitly faked silently returns a null response,
> hiding real bugs instead of failing fast.

---

## Common Laravel Dependency Patterns

### Facades to classify

| Facade / class | Classification |
|---|---|
| `DB::`, `Model::`, `->save()`, `->update()`, `->delete()` | `DB` |
| `Http::`, `Guzzle`, `\Illuminate\Http\Client` | `HTTP` |
| `Queue::`, `dispatch()`, `SomeJob::dispatch()` | `QUEUE` |
| `Event::`, `event()`, `$model->dispatchEvent()` | `EVENT` |
| `Mail::`, `Mailable`, `->send()` | `EMAIL` |
| `Notification::`, `$user->notify()` | `NOTIFICATION` |
| `Cache::` | `CACHE` |
| `Storage::` | `FILESYSTEM` |
| `Carbon::now()`, `now()`, `today()` | `TIME` |
| `Str::random()`, `Str::uuid()` | `RANDOM` |
| `config()`, `env()` affecting logic | `CONFIG` |
| `Auth::`, `auth()->user()`, `$request->user()` | `AUTH` |
| `app()`, service container, DI | `FRAMEWORK` |

---

## Global setUp() Template for Risk Profile Output

When listing global mock setup in the Risk Profile for a Laravel class, use:

```php
protected function setUp(): void
{
    parent::setUp();

    // TIME
    Carbon::setTestNow(Carbon::parse('2025-01-15 10:00:00'));

    // EVENT / QUEUE / MAIL / NOTIFICATION
    Event::fake();
    Queue::fake();
    Mail::fake();
    Notification::fake();

    // HTTP
    Http::fake([
        'https://api.example.com/*' => Http::response(['ok' => true], 200),
    ]);

    // FILESYSTEM
    Storage::fake('public');

    // AUTH
    $this->user = User::factory()->create();
}
```

Only include the fakes that are actually needed for the class being analyzed.

---

## Laravel-Specific Precondition Patterns

Common preconditions for Laravel and their setUp implications:

| Precondition | setUp implementation |
|---|---|
| Model must exist in DB | `$model = Model::factory()->create([...])` |
| User must be authenticated | `$this->actingAs($user)` per test or in setUp |
| User must have a role/permission | `$user->assignRole('admin')` (Spatie) or factory state |
| Feature flag must be enabled | `config(['features.flag' => true])` |
| Subscription must be active | Factory state: `User::factory()->subscribed()->create()` |
| Related model must exist | `RelatedModel::factory()->for($model)->create()` |
| Time-sensitive state | `Carbon::setTestNow(Carbon::parse('specific-date'))` |

---

## Bus::fake() vs Queue::fake() — When to Use Which

| Scenario | Correct fake |
|---|---|
| `dispatch(new SomeJob())` | `Queue::fake()` |
| `SomeJob::dispatch()` | `Queue::fake()` |
| `Bus::chain([...])` | `Bus::fake()` |
| `Bus::batch([...])` | `Bus::fake()` |
| `SomeJob::withChain([...])` | `Bus::fake()` |
| Mixed dispatch + chain | `Bus::fake()` (covers both) |

```php
// Queue::fake() assertions
Queue::assertPushed(SomeJob::class);
Queue::assertPushed(SomeJob::class, fn($job) => $job->userId === $user->id);
Queue::assertPushedOn('high', SomeJob::class);
Queue::assertNotPushed(SomeJob::class);
Queue::assertNothingPushed();
Queue::assertPushedWithChain(SomeJob::class, [AnotherJob::class]);

// Bus::fake() assertions
Bus::assertChained([JobA::class, JobB::class, JobC::class]);
Bus::assertBatched(fn($batch) => $batch->jobs->count() === 3);
Bus::assertNothingDispatched();
Bus::assertDispatched(SomeJob::class);
```

## Http::preventStrayRequests() — Required Pattern

```php
protected function setUp(): void
{
    parent::setUp();

    Http::preventStrayRequests(); // ALWAYS — fail fast on unexpected calls
    Http::fake([
        'https://api.service.com/press-releases' => Http::response(['id' => 1], 201),
        'https://api.service.com/*' => Http::response([], 200),
        // Any unmatched URL now throws an exception, not returns null
    ]);
}

// Assertions
Http::assertSent(fn($request) => $request->url() === 'https://api.service.com/press-releases');
Http::assertSentCount(1);
Http::assertNotSent(fn($request) => str_contains($request->url(), 'unexpected'));
Http::assertNothingSent();
```