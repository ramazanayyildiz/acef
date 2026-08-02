<?php

// Golden source extracted from P0-candidate-v32 red commit
// 57373aac606f8f33a19f52d31b960dbb1944e50b.

namespace Tests\Unit\Platform\Authz;

use InvalidArgumentException;
use Tests\TestCase;
use Platform\Authz\Http\RouteRequirementResolver;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;

class RouteRequirementResolverTest extends TestCase
{
    private RouteRequirementResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resolver = new RouteRequirementResolver([]);
    }

    #[Test]
    #[DataProvider('malformedPermissionExpressions')]
    public function parse_rejects_empty_or_operator_only_expression(string $expression): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Route permission expression must contain at least one capability.');

        $this->resolver->parse($expression);
    }

    /** @return array<string, array{string}> */
    public static function malformedPermissionExpressions(): array
    {
        return [
            'empty expression' => [''],
            'whitespace-only expression' => ['   '],
            'single AND operator' => ['&'],
            'repeated AND operators' => ['  &  &  '],
            'single OR operator' => ['|'],
            'repeated OR operators' => ['  |  |  '],
            'mixed operators' => ['  &  |  &  '],
        ];
    }
}
