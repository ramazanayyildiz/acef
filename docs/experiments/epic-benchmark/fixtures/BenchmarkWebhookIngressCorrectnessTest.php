<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Billing\Jobs\ProcessRevolutWebhookJob;
use App\Modules\Billing\Providers\Revolut\RevolutPaymentProvider;
use App\Modules\Billing\Services\SubscriptionLifecycleService;
use App\Modules\Billing\Services\WebhookIngressDedupService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BenchmarkWebhookIngressCorrectnessTest extends TestCase
{
    private const SECRET = 'whsec_benchmark_webhook';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.revolut.webhook_secret' => self::SECRET]);
        config(['services.revolut.skip_webhook_verification' => false]);
        config(['services.revolut.api_key' => 'sk_test_benchmark']);
        config(['services.revolut.base_url' => 'https://merchant.revolut.com']);

        Schema::dropIfExists('revolut_webhook_events');
        Schema::create('revolut_webhook_events', function ($table): void {
            $table->id();
            $table->string('provider')->default('revolut');
            $table->string('env_name');
            $table->string('event_id');
            $table->string('event_type');
            $table->json('payload');
            $table->timestamp('received_at')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamps();
            $table->unique(['provider', 'env_name', 'event_id'], 'revolut_webhook_events_provider_env_event_unique');
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('revolut_webhook_events');

        parent::tearDown();
    }

    #[Test]
    public function revolut_webhook_outer_catch_returns_500_so_provider_retries_infrastructure_errors(): void
    {
        Bus::fake();

        $this->app->instance(WebhookIngressDedupService::class, new class extends WebhookIngressDedupService
        {
            public function recordAsReceived(string $provider, string $eventId, string $eventType, array $data): bool
            {
                throw new \RuntimeException('simulated infrastructure outage');
            }
        });

        $response = $this->signedRevolutPost(json_encode([
            'id' => 'evt_benchmark_outer_catch',
            'event' => 'ORDER_COMPLETED',
            'order' => ['id' => 'ord_benchmark_outer_catch'],
        ], JSON_THROW_ON_ERROR));

        $response->assertStatus(500);
        Bus::assertNothingDispatched();
    }

    #[Test]
    public function process_revolut_webhook_job_treats_sqlite_unique_constraint_as_duplicate_for_crash_recovery(): void
    {
        $eventId = 'evt_benchmark_sqlite_unique';
        $envName = app()->environment();

        DB::table('revolut_webhook_events')->insert([
            'provider' => 'revolut',
            'env_name' => $envName,
            'event_id' => $eventId,
            'event_type' => 'BENCHMARK_UNKNOWN_EVENT',
            'payload' => json_encode(['event' => 'BENCHMARK_UNKNOWN_EVENT'], JSON_THROW_ON_ERROR),
            'received_at' => now()->subMinute(),
            'processed_at' => null,
            'attempts' => 1,
            'created_at' => now()->subMinute(),
            'updated_at' => now()->subMinute(),
        ]);

        $payload = [
            'id' => $eventId,
            'event' => 'BENCHMARK_UNKNOWN_EVENT',
            'order' => ['id' => 'ord_benchmark_sqlite_unique'],
        ];

        (new ProcessRevolutWebhookJob($payload))->handle(
            app(RevolutPaymentProvider::class),
            app(SubscriptionLifecycleService::class),
        );

        $this->assertNotNull(
            DB::table('revolut_webhook_events')->where('event_id', $eventId)->value('processed_at'),
            'SQLite duplicate ledger rows must enter crash recovery instead of rethrowing.',
        );
    }

    private function signedRevolutPost(string $body): \Illuminate\Testing\TestResponse
    {
        $timestamp = (string) (int) (microtime(true) * 1000);
        $signature = 'v1='.hash_hmac('sha256', "v1.{$timestamp}.{$body}", self::SECRET);

        return $this->call(
            'POST',
            '/api/webhooks/revolut',
            [],
            [],
            [],
            [
                'HTTP_Revolut-Signature' => $signature,
                'HTTP_Revolut-Request-Timestamp' => $timestamp,
                'CONTENT_TYPE' => 'application/json',
            ],
            $body,
        );
    }
}
