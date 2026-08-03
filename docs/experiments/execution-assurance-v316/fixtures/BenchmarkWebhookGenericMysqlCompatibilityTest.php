<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Billing\Jobs\ProcessRevolutWebhookJob;
use App\Modules\Billing\Providers\Revolut\RevolutPaymentProvider;
use App\Modules\Billing\Services\PlanChangeService;
use App\Modules\Billing\Services\RefundOperationFinalizationService;
use App\Modules\Billing\Services\SubscriptionLifecycleService;
use App\Modules\Billing\Services\WebhookIngressDedupService;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Mockery;
use PDOException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BenchmarkWebhookGenericMysqlCompatibilityTest extends TestCase
{
    #[Test]
    public function ingress_duplicate_classifier_accepts_a_generic_mysql_duplicate_behaviorally(): void
    {
        [$insert, $lookup] = $this->duplicateLedgerMocks();

        DB::shouldReceive('table')
            ->twice()
            ->with('revolut_webhook_events')
            ->andReturn($insert, $lookup);

        $shouldDispatch = app(WebhookIngressDedupService::class)->recordAsReceived(
            'revolut',
            'evt_generic_mysql_ingress',
            'ORDER_COMPLETED',
            ['id' => 'evt_generic_mysql_ingress'],
        );

        $this->assertFalse($shouldDispatch, 'A processed generic MySQL duplicate must be deduplicated.');
    }

    #[Test]
    public function job_duplicate_classifier_accepts_a_generic_mysql_duplicate_behaviorally(): void
    {
        [$insert, $lookup] = $this->duplicateLedgerMocks();

        DB::shouldReceive('table')
            ->twice()
            ->with('revolut_webhook_events')
            ->andReturn($insert, $lookup);

        $provider = Mockery::mock(RevolutPaymentProvider::class);
        $provider->shouldReceive('handleWebhook')
            ->once()
            ->andReturn([
                'event_type' => 'ORDER_COMPLETED',
                'order_id' => 'ord_generic_mysql_job',
            ]);

        (new ProcessRevolutWebhookJob([
            'id' => 'evt_generic_mysql_job',
            'event' => 'ORDER_COMPLETED',
            'order' => ['id' => 'ord_generic_mysql_job'],
        ]))->handle(
            $provider,
            Mockery::mock(SubscriptionLifecycleService::class),
            Mockery::mock(PlanChangeService::class),
            Mockery::mock(RefundOperationFinalizationService::class),
        );

        $this->addToAssertionCount(1);
    }

    /**
     * @return array{0: \Mockery\MockInterface, 1: \Mockery\MockInterface}
     */
    private function duplicateLedgerMocks(): array
    {
        $insert = Mockery::mock();
        $insert->shouldReceive('insert')
            ->once()
            ->andThrow($this->genericMysqlDuplicate());

        $lookup = Mockery::mock();
        $lookup->shouldReceive('where')->times(3)->andReturnSelf();
        $lookup->shouldReceive('first')->once()->andReturn((object) [
            'processed_at' => now(),
        ]);

        return [$insert, $lookup];
    }

    private function genericMysqlDuplicate(): QueryException
    {
        $previous = new PDOException(
            "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'event' for key 'unrecognized_key'",
        );
        $previous->errorInfo = [
            '23000',
            1062,
            "Duplicate entry 'event' for key 'unrecognized_key'",
        ];

        return new QueryException(
            'mysql',
            'insert into `revolut_webhook_events` (`event_id`) values (?)',
            ['event'],
            $previous,
        );
    }
}
