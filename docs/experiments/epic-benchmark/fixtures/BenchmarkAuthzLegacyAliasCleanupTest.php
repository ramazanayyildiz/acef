<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

#[Group('benchmark')]
#[Group('authz')]
class BenchmarkAuthzLegacyAliasCleanupTest extends TestCase
{
    #[Test]
    public function web_routes_do_not_redeclare_the_global_route_permission_alias(): void
    {
        $routesWithLegacyAlias = collect(Route::getRoutes())
            ->filter(fn ($route) => in_array('route.permission', $route->middleware(), true))
            ->map(fn ($route) => $route->getName() ?: $route->uri())
            ->values()
            ->all();

        $this->assertSame(
            [],
            $routesWithLegacyAlias,
            'route.permission is globally appended to the web group; remove route-level aliases to avoid double execution.'
        );
    }
}
