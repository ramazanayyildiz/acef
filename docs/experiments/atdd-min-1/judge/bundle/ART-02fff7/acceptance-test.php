<?php

declare(strict_types=1);

namespace Tests\Feature\Navigation;

use App\Enums\PlanTier;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\View;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Billing\Support\BillingTestFixtures;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T3 — mobile primary navigation active state and scroll restoration
 * contract.
 *
 * Asserts the server-rendered contract only (markers + keys a client would
 * consume); no JavaScript behaviour is exercised here.
 */
class MobileNavScrollStateTest extends FeatureTestCase
{
    use BillingTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    #[Test]
    public function current_primary_nav_item_is_programmatically_marked_in_both_variants(): void
    {
        [$admin] = $this->adminWithPlan(PlanTier::GROWTH);

        $html = $this->actingAs($admin)
            ->get(route('user.dashboard'))
            ->assertOk()
            ->getContent();

        $desktop = $this->primaryNavLinks($html, mobile: false);
        $mobile = $this->primaryNavLinks($html, mobile: true);

        $this->assertNotEmpty($desktop, 'desktop primary navigation rendered no links');

        // AC3 — both variants render, with distinct but paired test ids.
        $this->assertSame(
            array_map(static fn (string $id): string => $id . '-mobile', array_keys($desktop)),
            array_keys($mobile),
            'mobile variant must stay separately addressable from desktop',
        );

        // AC1 + AC2 — current-ness is programmatic and singular per variant.
        $currentDesktop = $this->currentLinks($desktop);
        $currentMobile = $this->currentLinks($mobile);

        $this->assertCount(1, $currentDesktop, 'exactly one desktop item must be marked current');
        $this->assertCount(1, $currentMobile, 'exactly one mobile item must be marked current');

        $desktopTestid = array_key_first($currentDesktop);

        $this->assertSame(
            $desktopTestid . '-mobile',
            array_key_first($currentMobile),
            'desktop and mobile must mark the same item current',
        );

        // AC6 — the current item is the page actually requested, href unchanged.
        $this->assertSame(route('user.dashboard'), $currentDesktop[$desktopTestid]['href'] ?? null);
        $this->assertSame(route('user.dashboard'), $currentMobile[$desktopTestid . '-mobile']['href'] ?? null);
    }

    #[Test]
    public function primary_nav_links_expose_stable_shared_scroll_restoration_keys_and_a_page_region(): void
    {
        [$admin] = $this->adminWithPlan(PlanTier::GROWTH);

        $first = $this->actingAs($admin)->get(route('user.dashboard'))->assertOk()->getContent();
        $second = $this->actingAs($admin)->get(route('user.dashboard'))->assertOk()->getContent();

        $desktop = $this->primaryNavLinks($first, mobile: false);
        $mobile = $this->primaryNavLinks($first, mobile: true);
        $desktopAgain = $this->primaryNavLinks($second, mobile: false);

        $this->assertNotEmpty($desktop, 'desktop primary navigation rendered no links');

        $keys = [];

        foreach ($desktop as $testid => $attributes) {
            $key = $attributes[self::SCROLL_KEY_ATTRIBUTE] ?? null;

            $this->assertIsString($key, "{$testid} is missing a scroll-restoration key");
            $this->assertNotSame('', $key, "{$testid} has an empty scroll-restoration key");

            // AC4 — identical across variants…
            $this->assertSame(
                $key,
                $mobile[$testid . '-mobile'][self::SCROLL_KEY_ATTRIBUTE] ?? null,
                "{$testid} scroll-restoration key differs between desktop and mobile",
            );

            // …and stable across requests.
            $this->assertSame(
                $key,
                $desktopAgain[$testid][self::SCROLL_KEY_ATTRIBUTE] ?? null,
                "{$testid} scroll-restoration key is not stable across requests",
            );

            $keys[] = $key;
        }

        $this->assertSameSize($keys, array_unique($keys), 'scroll-restoration keys must identify distinct items');

        // AC5 — the layout marks the region for the page being rendered, using
        // the same key space as the links so Back/Forward can match them up.
        $this->assertSame(
            1,
            preg_match('/data-scroll-restore-region="([^"]+)"/', $first, $region),
            'authenticated layout must emit a scroll-restoration region marker',
        );

        $currentDesktop = $this->currentLinks($desktop);
        $currentKey = reset($currentDesktop)[self::SCROLL_KEY_ATTRIBUTE] ?? null;

        $this->assertSame(
            $currentKey,
            $region[1],
            'region marker must identify the page currently rendered',
        );
    }

    #[Test]
    public function mobile_variant_preserves_exclusion_filtering_badges_and_existing_output(): void
    {
        $html = View::make('components.topbar-navigation', [
            'variant' => 'mobile',
            'except' => ['tenant-events'],
            'items' => [
                [
                    'key' => 'tenant-dashboard',
                    'label' => 'Dashboard',
                    'route' => 'user.dashboard',
                    'data_testid' => 'nav-dashboard',
                    'active' => true,
                    'badge' => 7,
                ],
                [
                    'key' => 'tenant-events',
                    'label' => 'Events',
                    'route' => 'events.index',
                    'data_testid' => 'nav-events',
                    'active' => false,
                ],
                [
                    'key' => 'tenant-routeless',
                    'label' => 'Routeless',
                    'route' => null,
                ],
            ],
        ])->render();

        $links = $this->primaryNavLinks($html, mobile: true);

        // AC6 — exclusion list and route-less items still drop out; test id and
        // href output is unchanged.
        $this->assertSame(['nav-dashboard-mobile'], array_keys($links));
        $this->assertSame(route('user.dashboard'), $links['nav-dashboard-mobile']['href'] ?? null);
        $this->assertStringNotContainsString('nav-events', $html);
        $this->assertStringNotContainsString('nav-tenant-routeless', $html);

        // AC6 — badge still renders alongside the new contract attributes.
        $this->assertMatchesRegularExpression('/<span[^>]*>\s*7\s*<\/span>/', $html);

        // AC1/AC4 — the mobile-only rendering still carries both markers.
        $this->assertSame('page', $links['nav-dashboard-mobile']['aria-current'] ?? null);
        $this->assertNotSame('', $links['nav-dashboard-mobile'][self::SCROLL_KEY_ATTRIBUTE] ?? '');
    }

    private const SCROLL_KEY_ATTRIBUTE = 'data-scroll-restore-key';

    /**
     * Primary-navigation anchors from rendered HTML, keyed by test id.
     *
     * @return array<string, array<string, string>>
     */
    private function primaryNavLinks(string $html, bool $mobile): array
    {
        preg_match_all('/<a\b[^>]*>/i', $html, $tags);

        $links = [];

        foreach ($tags[0] as $tag) {
            preg_match_all('/([a-zA-Z0-9_:.\-]+)="([^"]*)"/', $tag, $matches, PREG_SET_ORDER);

            $attributes = [];

            foreach ($matches as $match) {
                $attributes[$match[1]] = $match[2];
            }

            $testid = $attributes['data-testid'] ?? '';

            if (! str_starts_with($testid, 'nav-')) {
                continue;
            }

            if (str_ends_with($testid, '-mobile') !== $mobile) {
                continue;
            }

            $links[$testid] = $attributes;
        }

        return $links;
    }

    /**
     * @param  array<string, array<string, string>>  $links
     * @return array<string, array<string, string>>
     */
    private function currentLinks(array $links): array
    {
        return array_filter(
            $links,
            static fn (array $attributes): bool => ($attributes['aria-current'] ?? null) === 'page',
        );
    }
}
