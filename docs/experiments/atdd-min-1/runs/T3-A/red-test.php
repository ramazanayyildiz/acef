<?php

declare(strict_types=1);

namespace Tests\Feature\Navigation;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\View;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T3 — mobile primary navigation active state + scroll restoration contract.
 *
 * The rendered contract under test:
 *   - a current primary nav link is programmatically current (aria-current="page"),
 *     in the mobile variant as well as the desktop one, and exactly once per variant;
 *   - every primary nav link carries a stable, item-derived scroll-restoration key
 *     (data-scroll-key) that is identical for the desktop and mobile rendering of
 *     the same item;
 *   - the authenticated layout emits a scroll-restoration region marker
 *     (data-scroll-region) identifying the page being rendered;
 *   - existing filtering / badge / href / test-id behaviour is unchanged.
 */
class MobileNavScrollStateTest extends FeatureTestCase
{
    /**
     * @return array<int, array<string, mixed>>
     */
    private function navItems(): array
    {
        return [
            [
                'key' => 'tenant-dashboard',
                'label' => 'Dashboard',
                'route' => 'user.dashboard',
                'data_testid' => 'nav-dashboard',
                'active' => true,
            ],
            [
                'key' => 'tenant-events',
                'label' => 'Events',
                'route' => 'events.index',
                'data_testid' => 'nav-events',
                'active' => false,
                'badge' => 7,
            ],
            [
                'key' => 'tenant-billing',
                'label' => 'Billing',
                'route' => 'billing.index',
                'data_testid' => 'nav-billing',
                'active' => false,
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<int, string>  $except
     */
    private function renderNav(string $variant, array $items, array $except = []): string
    {
        return View::make('components.topbar-navigation', [
            'items' => $items,
            'variant' => $variant,
            'except' => $except,
        ])->render();
    }

    /**
     * Parse the rendered anchors into testid => attribute map so assertions read
     * the contract, not the markup ordering or class strings.
     *
     * @return array<string, array<string, string|null>>
     */
    private function links(string $html): array
    {
        preg_match_all('/<a\b[^>]*>/s', $html, $matches);

        $links = [];

        foreach ($matches[0] as $tag) {
            $attribute = static function (string $name) use ($tag): ?string {
                return preg_match('/\b' . preg_quote($name, '/') . '="([^"]*)"/', $tag, $found)
                    ? $found[1]
                    : null;
            };

            $testid = $attribute('data-testid');

            if ($testid === null) {
                continue;
            }

            $links[$testid] = [
                'href' => $attribute('href'),
                'aria-current' => $attribute('aria-current'),
                'data-scroll-key' => $attribute('data-scroll-key'),
            ];
        }

        return $links;
    }

    #[Test]
    public function current_item_is_programmatically_current_in_both_variants(): void
    {
        $items = $this->navItems();

        $desktop = $this->links($this->renderNav('desktop', $items));
        $mobile = $this->links($this->renderNav('mobile', $items));

        $this->assertCount(3, $desktop);
        $this->assertCount(3, $mobile);

        // AC1 — current-ness is exposed programmatically, in both variants.
        $this->assertSame('page', $desktop['nav-dashboard']['aria-current']);
        $this->assertSame('page', $mobile['nav-dashboard-mobile']['aria-current']);

        // AC2 — exactly one current item per variant, and it is the same item.
        $currentDesktop = array_keys(array_filter(
            $desktop,
            static fn (array $link): bool => $link['aria-current'] === 'page',
        ));
        $currentMobile = array_keys(array_filter(
            $mobile,
            static fn (array $link): bool => $link['aria-current'] === 'page',
        ));

        $this->assertSame(['nav-dashboard'], $currentDesktop);
        $this->assertSame(['nav-dashboard-mobile'], $currentMobile);
    }

    #[Test]
    public function every_link_carries_a_stable_item_derived_scroll_key_shared_by_both_variants(): void
    {
        $items = $this->navItems();

        $desktop = $this->links($this->renderNav('desktop', $items));
        $mobile = $this->links($this->renderNav('mobile', $items));
        $desktopAgain = $this->links($this->renderNav('desktop', $items));

        $keys = [];

        foreach ($items as $item) {
            $testid = $item['data_testid'];
            $desktopKey = $desktop[$testid]['data-scroll-key'] ?? null;
            $mobileKey = $mobile[$testid . '-mobile']['data-scroll-key'] ?? null;

            $this->assertNotNull($desktopKey, "Desktop link {$testid} must expose a scroll-restoration key.");
            $this->assertNotSame('', $desktopKey, "Desktop link {$testid} scroll key must not be empty.");

            // AC4 — same item ⇒ same key across variants.
            $this->assertSame($desktopKey, $mobileKey, "Scroll key for {$testid} must match across variants.");

            // AC4 — stable across requests (re-render yields the same key).
            $this->assertSame($desktopKey, $desktopAgain[$testid]['data-scroll-key'] ?? null);

            $keys[] = $desktopKey;
        }

        // AC4 — derived from the navigation item, so distinct items get distinct keys.
        $this->assertSame($keys, array_values(array_unique($keys)));
    }

    #[Test]
    public function existing_filtering_badge_href_and_testid_behaviour_is_preserved(): void
    {
        $items = $this->navItems();

        $desktopHtml = $this->renderNav('desktop', $items);
        $mobileHtml = $this->renderNav('mobile', $items, ['tenant-billing']);

        $desktop = $this->links($desktopHtml);
        $mobile = $this->links($mobileHtml);

        // AC6 — hrefs unchanged.
        $this->assertSame(route('user.dashboard'), $desktop['nav-dashboard']['href']);
        $this->assertSame(route('events.index'), $desktop['nav-events']['href']);

        // AC6 — badge still rendered.
        $this->assertStringContainsString('7', $desktopHtml);
        $this->assertMatchesRegularExpression('/<span[^>]*>\s*7\s*<\/span>/', $desktopHtml);

        // AC6 — exclusion list still filters, AC3 — mobile keeps its distinct test ids.
        $this->assertArrayNotHasKey('nav-billing-mobile', $mobile);
        $this->assertSame(
            ['nav-dashboard-mobile', 'nav-events-mobile'],
            array_keys($mobile),
        );
        $this->assertSame(
            [],
            array_intersect(array_keys($desktop), array_keys($mobile)),
        );
    }

    #[Test]
    public function authenticated_layout_emits_a_scroll_restoration_region_marker_for_the_page(): void
    {
        $user = $this->verifiedUser();
        $team = Team::factory()->create(['user_id' => $user->id, 'personal_team' => false]);
        $team->users()->syncWithoutDetaching([
            $user->getKey() => ['role' => UserRole::ADMIN->value],
        ]);
        $user->switchTeam($team);

        $marker = function (User $user, string $routeName): string {
            $response = $this->actingAs($user)->get(route($routeName));
            $response->assertOk();

            $matched = preg_match(
                '/data-scroll-region="([^"]+)"/',
                $response->getContent(),
                $found,
            );

            $this->assertSame(
                1,
                $matched,
                "The authenticated layout must emit a scroll-restoration region marker on {$routeName}.",
            );

            return $found[1];
        };

        $personal = $marker($user, 'account.personal');
        $personalAgain = $marker($user, 'account.personal');
        $security = $marker($user, 'account.security');

        // AC5 — stable for the same page so Back/Forward can restore its offset…
        $this->assertSame($personal, $personalAgain);

        // …and it identifies the page being rendered, so a different page differs.
        $this->assertNotSame($personal, $security);
    }
}
