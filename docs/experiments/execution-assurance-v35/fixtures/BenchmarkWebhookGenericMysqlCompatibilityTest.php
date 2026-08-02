<?php

declare(strict_types=1);

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class BenchmarkWebhookGenericMysqlCompatibilityTest extends TestCase
{
    #[Test]
    public function both_duplicate_classifiers_retain_the_generic_mysql_signature(): void
    {
        $paths = [
            app_path('Modules/Billing/Jobs/ProcessRevolutWebhookJob.php'),
            app_path('Modules/Billing/Services/WebhookIngressDedupService.php'),
        ];

        foreach ($paths as $path) {
            $source = file_get_contents($path);

            $this->assertIsString($source, "Unable to read {$path}");
            $this->assertStringContainsString(
                "str_contains(\$e->getMessage(), 'Duplicate entry')",
                $source,
                "{$path} dropped the frozen generic MySQL duplicate signature",
            );
        }
    }
}
