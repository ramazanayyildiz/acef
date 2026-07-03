<?php

declare(strict_types=1);

namespace Tests\Feature;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Platform\Authz\Http\RouteRequirementResolver;
use Tests\TestCase;

#[Group('benchmark')]
#[Group('authz')]
class BenchmarkAuthzResolverFailClosedTest extends TestCase
{
    #[Test]
    public function empty_permission_expressions_fail_closed_after_normalization(): void
    {
        $resolver = new RouteRequirementResolver();

        foreach (['', '   ', ' & ', '  &  & ', '|', ' | '] as $permissionString) {
            try {
                $resolver->parse($permissionString);
                $this->fail("Malformed route permission [{$permissionString}] should fail closed.");
            } catch (InvalidArgumentException $exception) {
                $this->assertSame(
                    'Route permission expression must contain at least one capability.',
                    $exception->getMessage()
                );
            }
        }
    }
}
