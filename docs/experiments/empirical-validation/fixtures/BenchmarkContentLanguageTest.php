<?php

namespace Tests\Feature;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\Request;
use Tests\TestCase;

class BenchmarkContentLanguageTest extends TestCase
{
    public function test_response_declares_the_resolved_english_locale(): void
    {
        $request = Request::create('/en/example');
        $response = (new SetLocale())->handle($request, fn () => response('ok'));

        $this->assertSame('en', $response->headers->get('Content-Language'));
    }

    public function test_response_declares_turkish_for_the_canonical_unprefixed_locale(): void
    {
        $request = Request::create('/example');
        $response = (new SetLocale())->handle($request, fn () => response('ok'));

        $this->assertSame('tr', $response->headers->get('Content-Language'));
    }
}
