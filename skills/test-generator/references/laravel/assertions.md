---
title: assertions
type: note
permalink: ram/04-ai-toolkit/skills/test/test-generator/references/laravel/assertions
---

# Assertions & Anti-Patterns Reference

Used by `test-generator`. Quick reference for all assertion types and common mistakes to avoid.

---

## HTTP Response Assertions

```php
$response->assertOk();                          // 200
$response->assertCreated();                     // 201
$response->assertNoContent();                   // 204
$response->assertUnauthorized();                // 401
$response->assertForbidden();                   // 403
$response->assertNotFound();                    // 404
$response->assertUnprocessable();               // 422
$response->assertTooManyRequests();             // 429
$response->assertRedirect('/expected-url');
$response->assertJsonFragment(['key' => 'val']);
$response->assertJsonMissing(['key' => 'val']);
$response->assertJsonStructure(['data' => [['id', 'name']]]);
$response->assertJsonValidationErrors(['field']);
$response->assertJsonValidationErrorFor('field');
$response->assertJsonCount(3, 'data');
$response->assertJsonPath('data.0.title', 'Expected Title');
```

---

## Database Assertions

```php
$this->assertDatabaseHas('table', ['col' => 'val']);
$this->assertDatabaseMissing('table', ['col' => 'val']);
$this->assertSoftDeleted('table', ['id' => 1]);
$this->assertDatabaseCount('table', 5);
$this->assertModelExists($model);
$this->assertModelMissing($model);
```

---

## Fake Facade Assertions

```php
// Mail
Mail::assertSent(SomeMailable::class);
Mail::assertSent(SomeMailable::class, fn($m) => $m->hasTo('user@example.com'));
Mail::assertNotSent(SomeMailable::class);
Mail::assertSentCount(2);
Mail::assertNothingSent();

// Queue
Queue::assertPushed(SomeJob::class);
Queue::assertPushed(SomeJob::class, fn($job) => $job->userId === 1);
Queue::assertNotPushed(SomeJob::class);
Queue::assertPushedOn('high', SomeJob::class);
Queue::assertNothingPushed();

// Event
Event::assertDispatched(SomeEvent::class);
Event::assertDispatched(SomeEvent::class, fn($e) => $e->userId === 1);
Event::assertNotDispatched(SomeEvent::class);
Event::assertDispatchedTimes(SomeEvent::class, 2);
Event::assertNothingDispatched();

// Notification
Notification::assertSentTo($user, SomeNotification::class);
Notification::assertSentTo($user, SomeNotification::class, fn($n) => $n->amount === 100);
Notification::assertNotSentTo($user, SomeNotification::class);
Notification::assertNothingSent();

// Storage
Storage::assertExists('path/to/file.pdf');
Storage::assertMissing('path/to/file.pdf');

// Http (outgoing)
Http::assertSent(fn($request) => $request->url() === 'https://api.example.com/endpoint');
Http::assertNotSent(fn($request) => str_contains($request->url(), 'dangerous'));
Http::assertSentCount(1);
Http::assertNothingSent();
```

---

## General PHPUnit Assertions

```php
$this->assertEquals($expected, $actual);
$this->assertSame($expected, $actual);          // strict ===
$this->assertNull($value);
$this->assertNotNull($value);
$this->assertTrue($condition);
$this->assertFalse($condition);
$this->assertCount(3, $collection);
$this->assertEmpty($collection);
$this->assertNotEmpty($collection);
$this->assertInstanceOf(Carbon::class, $value);
$this->assertContains('item', $array);
$this->assertArrayHasKey('key', $array);
$this->assertStringContainsString('needle', $haystack);
$this->expectException(SomeException::class);
$this->expectExceptionMessage('Expected message');
$this->expectExceptionCode(404);
```

---

## Time Control

```php
// Set fixed time for the entire test
Carbon::setTestNow(Carbon::parse('2025-01-15 10:00:00'));

// Laravel travel helpers (preferred in Feature tests)
$this->travel(5)->days();
$this->travelTo(Carbon::parse('2025-06-01'));
$this->travelBack();

// Freeze time for a closure
$this->freezeTime(function () {
    // time is frozen here
});

// UUID sequences (for deterministic UUID generation)
Str::createUuidsUsingSequence([
    'uuid-001',
    'uuid-002',
]);
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|---|---|---|
| `Model::create([...])` in tests | Brittle, misses factory states | Use `Model::factory()->create()` |
| Testing private methods directly | Couples to implementation | Test through public interface |
| `sleep()` in tests | Slow, flaky | Use `Carbon::setTestNow()` or `travel()` |
| No `RefreshDatabase` with DB calls | Tests pollute each other | Add `use RefreshDatabase` |
| `dd()` / `dump()` left in tests | Breaks CI | Always remove debug helpers |
| Asserting on HTML content | Brittle | Use `assertJsonFragment` or dedicated assertions |
| Logic inside tests (if/foreach) | Tests become untestable | Use `@dataProvider` |
| Hard-coded IDs | Brittle across environments | Use factories and relationships |
| `assertTrue(true)` | Meaningless | Assert actual observable behavior |
| Mocking what you own | Over-isolation | Only mock external dependencies |
| Not asserting side effects | False confidence | Assert every [SE{n}] from risk profile |
| Missing failure path tests | Only tests happy path | At least one failure test per method |