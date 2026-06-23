<?php

namespace Tests\Feature;

use App\Http\Controllers\DocumentDownloadController;
use ReflectionClass;
use Tests\TestCase;

class BenchmarkDocumentDownloadTraversalTest extends TestCase
{
    public function test_benchmark_document_download_rejects_traversal_segments(): void
    {
        $method = (new ReflectionClass(DocumentDownloadController::class))->getMethod('isAllowedWhitepaperPath');
        $method->setAccessible(true);
        $controller = new DocumentDownloadController();

        $this->assertTrue($method->invoke($controller, 'whitepapers/report.pdf'));
        $this->assertFalse($method->invoke($controller, 'whitepapers/../secret.pdf'));
        $this->assertFalse($method->invoke($controller, '/whitepapers/report.pdf'));
        $this->assertFalse($method->invoke($controller, 'whitepapers/%2e%2e/secret.pdf'));
    }
}
