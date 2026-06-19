---
title: templates
type: note
permalink: ram/04-ai-toolkit/skills/test/test-generator/references/laravel/templates
---

# Test Templates Reference

Base templates for every test class type in Laravel.
Used by `test-generator` — select the appropriate template and customize it.
Never copy verbatim — always adapt to the actual class being tested.

---

## Unit Test (Pure PHP / Service / Repository)

```php
<?php

namespace Tests\Unit\Services;

use PHPUnit\Framework\TestCase;
use App\Services\YourService;
use Mockery;
use Mockery\MockInterface;

class YourServiceTest extends TestCase
{
    private YourService $service;
    private MockInterface $dependencyMock;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dependencyMock = Mockery::mock(SomeDependency::class);
        $this->service = new YourService($this->dependencyMock);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function test_method_with_valid_input_returns_expected_result(): void
    {
        // Arrange
        $this->dependencyMock
            ->shouldReceive('someMethod')
            ->once()
            ->with('valid-input')
            ->andReturn('expected-result');

        // Act
        $result = $this->service->yourMethod('valid-input');

        // Assert
        $this->assertEquals('expected-result', $result);
    }
}
```

---

## Feature / HTTP Test (Controller / API Endpoint)

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use App\Models\User;
use App\Models\YourModel;

class YourControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Event::fake();
        Queue::fake();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function test_index_returns_paginated_results(): void
    {
        // Arrange
        YourModel::factory()->count(3)->create(['user_id' => $this->user->id]);

        // Act
        $response = $this->actingAs($this->user)
            ->getJson('/api/your-endpoint');

        // Assert
        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure(['data' => [['id', 'title', 'created_at']]]);
    }

    /** @test */
    public function test_store_with_valid_data_creates_record(): void
    {
        // Arrange
        $payload = ['title' => 'Test Title', 'body' => 'Test body'];

        // Act
        $response = $this->actingAs($this->user)
            ->postJson('/api/your-endpoint', $payload);

        // Assert
        $response->assertCreated()
            ->assertJsonFragment(['title' => 'Test Title']);

        $this->assertDatabaseHas('your_table', [
            'title'   => 'Test Title',
            'user_id' => $this->user->id,
        ]);
    }

    /** @test */
    public function test_store_with_missing_required_field_returns_validation_error(): void
    {
        $response = $this->actingAs($this->user)
            ->postJson('/api/your-endpoint', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    /** @test */
    public function test_index_as_guest_returns_unauthorized(): void
    {
        $this->getJson('/api/your-endpoint')->assertUnauthorized();
    }

    /** @test */
    public function test_update_other_users_record_returns_forbidden(): void
    {
        // Arrange
        $otherUser = User::factory()->create();
        $record = YourModel::factory()->create(['user_id' => $otherUser->id]);

        // Act
        $response = $this->actingAs($this->user)
            ->putJson("/api/your-endpoint/{$record->id}", ['title' => 'Hacked']);

        // Assert
        $response->assertForbidden();
        $this->assertDatabaseMissing('your_table', ['title' => 'Hacked']);
    }

    /** @test */
    public function test_destroy_owned_record_soft_deletes(): void
    {
        // Arrange
        $record = YourModel::factory()->create(['user_id' => $this->user->id]);

        // Act
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/your-endpoint/{$record->id}");

        // Assert
        $response->assertNoContent();
        $this->assertSoftDeleted('your_table', ['id' => $record->id]);
    }
}
```

---

## Model Unit Test

```php
<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use App\Models\YourModel;
use App\Models\RelatedModel;

class YourModelTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_fillable_fields_are_mass_assignable(): void
    {
        $model = YourModel::factory()->create([
            'title'  => 'Test Title',
            'status' => 'draft',
        ]);

        $this->assertEquals('Test Title', $model->title);
        $this->assertEquals('draft', $model->status);
    }

    /** @test */
    public function test_active_scope_returns_only_active_records(): void
    {
        YourModel::factory()->count(2)->create(['status' => 'active']);
        YourModel::factory()->count(3)->create(['status' => 'inactive']);

        $results = YourModel::active()->get();

        $this->assertCount(2, $results);
        $results->each(fn($m) => $this->assertEquals('active', $m->status));
    }

    /** @test */
    public function test_published_at_is_cast_to_carbon(): void
    {
        $model = YourModel::factory()->make(['published_at' => now()]);
        $this->assertInstanceOf(Carbon::class, $model->published_at);
    }

    /** @test */
    public function test_has_many_relationship_returns_correct_models(): void
    {
        $model = YourModel::factory()->create();
        RelatedModel::factory()->count(3)->create(['your_model_id' => $model->id]);

        $this->assertCount(3, $model->relatedModels);
        $this->assertInstanceOf(RelatedModel::class, $model->relatedModels->first());
    }
}
```

---

## FormRequest Validation Test

```php
<?php

namespace Tests\Unit\Requests;

use Tests\TestCase;
use App\Http\Requests\YourFormRequest;
use Illuminate\Support\Facades\Validator;

class YourFormRequestTest extends TestCase
{
    private function validate(array $data): \Illuminate\Validation\Validator
    {
        return Validator::make($data, (new YourFormRequest())->rules());
    }

    /** @test */
    public function test_valid_data_passes_validation(): void
    {
        $validator = $this->validate([
            'title' => 'Valid Title',
            'email' => 'test@example.com',
        ]);

        $this->assertFalse($validator->fails());
    }

    /** @test */
    public function test_missing_title_fails_validation(): void
    {
        $validator = $this->validate(['email' => 'test@example.com']);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('title', $validator->errors()->toArray());
    }

    /** @test */
    public function test_invalid_email_format_fails_validation(): void
    {
        $validator = $this->validate([
            'title' => 'Valid Title',
            'email' => 'not-an-email',
        ]);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('email', $validator->errors()->toArray());
    }

    /**
     * @test
     * @dataProvider invalidTitleProvider
     */
    public function test_invalid_title_values_fail_validation(mixed $title): void
    {
        $validator = $this->validate(['title' => $title, 'email' => 'test@example.com']);
        $this->assertTrue($validator->fails());
    }

    public static function invalidTitleProvider(): array
    {
        return [
            'empty string' => [''],
            'null'         => [null],
            'too long'     => [str_repeat('a', 256)],
        ];
    }
}
```

---

## Job / Event / Listener Test

```php
<?php

namespace Tests\Unit\Jobs;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Event;
use App\Jobs\YourJob;
use App\Events\YourEvent;
use App\Mail\YourMailable;

class YourJobTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_job_is_dispatched_when_action_occurs(): void
    {
        Queue::fake();

        // trigger the action that dispatches the job
        // e.g. $model->publish();

        Queue::assertPushed(YourJob::class, function ($job) {
            return $job->someProperty === 'expected-value';
        });
    }

    /** @test */
    public function test_job_handle_performs_expected_action(): void
    {
        Mail::fake();

        $job = new YourJob($someData);
        $job->handle();

        Mail::assertSent(YourMailable::class, function ($mail) {
            return $mail->hasTo('expected@example.com');
        });
    }

    /** @test */
    public function test_job_handle_with_invalid_data_throws_exception(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $job = new YourJob(null);
        $job->handle();
    }
}
```

---

## Artisan Command Test

```php
<?php

namespace Tests\Feature\Console;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class YourCommandTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_command_runs_successfully(): void
    {
        $this->artisan('your:command')
            ->assertExitCode(0);
    }

    /** @test */
    public function test_command_with_dry_run_option_does_not_mutate_data(): void
    {
        $this->artisan('your:command', ['--dry-run' => true])
            ->expectsOutput('Dry run mode enabled')
            ->assertExitCode(0);

        // Assert nothing was written to DB
    }
}
```

---

## Data Provider Template

Use when testing many similar inputs for the same method:

```php
/**
 * @test
 * @dataProvider invalidInputProvider
 */
public function test_invalid_inputs_are_rejected(mixed $input, string $expectedError): void
{
    $validator = $this->validate(['field' => $input]);

    $this->assertTrue($validator->fails());
    $this->assertArrayHasKey($expectedError, $validator->errors()->toArray());
}

public static function invalidInputProvider(): array
{
    return [
        'empty string'  => ['', 'field'],
        'null value'    => [null, 'field'],
        'too long'      => [str_repeat('x', 256), 'field'],
        'wrong format'  => ['not-valid', 'field'],
    ];
}
```