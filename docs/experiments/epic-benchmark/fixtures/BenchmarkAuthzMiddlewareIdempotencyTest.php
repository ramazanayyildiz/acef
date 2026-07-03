<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Mockery;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Platform\Authz\Http\RouteCapabilityMiddleware;
use Platform\Authz\Http\RouteRequirement;
use Platform\Authz\Http\RouteRequirementResolver;
use Tests\TestCase;

#[Group('benchmark')]
#[Group('authz')]
class BenchmarkAuthzMiddlewareIdempotencyTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();

        parent::tearDown();
    }

    #[Test]
    public function middleware_evaluates_a_request_only_once_when_registered_twice(): void
    {
        $resolver = Mockery::mock(RouteRequirementResolver::class);
        $middleware = new RouteCapabilityMiddleware($resolver);
        $user = Mockery::mock(Authenticatable::class);
        $request = $this->createRequestWithRoute('user.dashboard');
        $request->setUserResolver(fn () => $user);

        $resolver
            ->shouldReceive('resolve')
            ->with('user.dashboard')
            ->once()
            ->andReturn(new RouteRequirement(RouteRequirement::TYPE_NONE));

        $response = $middleware->handle($request, function (Request $request) use ($middleware) {
            return $middleware->handle($request, fn () => response('OK'));
        });

        $this->assertSame('OK', $response->getContent());
    }

    private function createRequestWithRoute(string $routeName): Request
    {
        $request = Request::create('/test', 'GET');
        $route = new Route(['GET'], '/test', []);
        $route->name($routeName);
        $request->setRouteResolver(fn () => $route);

        return $request;
    }
}
