<?php

declare(strict_types=1);

namespace Tests\Feature\AtddOracle;

use App\Enums\PlanTier;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Models\Subscription;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\Blade;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Behavioural contract for the primary navigation current-state and the
 * scroll-restoration markers rendered by the authenticated layout.
 *
 * Everything here is asserted through the rendered HTML of real routes, and
 * only against seams the application already publishes: the `nav-*` /
 * `nav-*-mobile` test ids, the `href` targets of the named routes, and the
 * standard ARIA current-item mechanism. No CSS class, copy string, attribute
 * name or class name invented by the implementation is hard-coded — the
 * per-item scroll key and the page region marker are discovered by their
 * behaviour (identical across variants / unique per item / stable per page).
 */
class OracleTest extends FeatureTestCase
{
    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private function memberOf(UserRole $role): User
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);
        $team = Team::factory()->create(['user_id' => $owner->id]);
        $owner->forceFill(['current_team_id' => $team->id])->save();
        $team->users()->attach($owner, ['role' => UserRole::SYSTEM_ADMIN->value]);

        Subscription::create([
            'team_id' => $team->id,
            'plan_tier' => PlanTier::GROWTH,
            'status' => SubscriptionStatus::ACTIVE->value,
        ]);

        $user = User::factory()->create([
            'current_team_id' => $team->id,
            'email_verified_at' => now(),
        ]);
        $team->users()->attach($user, ['role' => $role->value]);

        return $user->fresh(['currentTeam.activeSubscription']);
    }

    private function fetch(User $user, string $url): string
    {
        $response = $this->actingAs($user)->get($url);
        $response->assertOk();

        return (string) $response->getContent();
    }

    // ------------------------------------------------------------------
    // HTML helpers — deliberately structure-agnostic
    // ------------------------------------------------------------------

    private const TAG_PATTERN = '/<([a-zA-Z][a-zA-Z0-9:_-]*)((?:\s+[^\s=<>\/"\']+(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s"\'<>`]+))?)*)\s*\/?>/s';

    private const ATTR_PATTERN = '/([^\s=<>\/"\']+)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s"\'<>`]+)))?/s';

    /**
     * @return list<array{tag: string, attrs: array<string, string>}>
     */
    private function elements(string $html): array
    {
        $elements = [];

        preg_match_all(self::TAG_PATTERN, $html, $tags, PREG_SET_ORDER);

        foreach ($tags as $tag) {
            $attrs = [];

            if (($tag[2] ?? '') !== '') {
                preg_match_all(self::ATTR_PATTERN, $tag[2], $found, PREG_SET_ORDER);

                foreach ($found as $attr) {
                    $name = strtolower($attr[1]);
                    $value = $attr[2] ?? '';

                    if (($attr[3] ?? '') !== '') {
                        $value = $attr[3];
                    } elseif (($attr[4] ?? '') !== '') {
                        $value = $attr[4];
                    }

                    $attrs[$name] = $value;
                }
            }

            $elements[] = ['tag' => strtolower($tag[1]), 'attrs' => $attrs];
        }

        return $elements;
    }

    /**
     * All anchors with their attributes and inner markup.
     *
     * @return list<array{attrs: array<string, string>, inner: string}>
     */
    private function anchors(string $html): array
    {
        $anchors = [];

        preg_match_all('/<a\b([^>]*)>(.*?)<\/a>/s', $html, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $attrs = [];
            preg_match_all(self::ATTR_PATTERN, $match[1], $found, PREG_SET_ORDER);

            foreach ($found as $attr) {
                $name = strtolower($attr[1]);
                $value = $attr[2] ?? '';

                if (($attr[3] ?? '') !== '') {
                    $value = $attr[3];
                } elseif (($attr[4] ?? '') !== '') {
                    $value = $attr[4];
                }

                $attrs[$name] = $value;
            }

            $anchors[] = ['attrs' => $attrs, 'inner' => $match[2]];
        }

        return $anchors;
    }

    /**
     * Primary navigation anchors, split by variant and keyed by the item's
     * canonical (desktop) test id.
     *
     * @return array{desktop: array<string, array<string, string>>, mobile: array<string, array<string, string>>}
     */
    private function navAnchors(string $html): array
    {
        $result = ['desktop' => [], 'mobile' => []];

        foreach ($this->anchors($html) as $anchor) {
            $testid = $anchor['attrs']['data-testid'] ?? '';

            if (! str_starts_with($testid, 'nav-')) {
                continue;
            }

            $variant = str_ends_with($testid, '-mobile') ? 'mobile' : 'desktop';
            $id = $variant === 'mobile' ? substr($testid, 0, -strlen('-mobile')) : $testid;

            $this->assertArrayNotHasKey(
                $id,
                $result[$variant],
                "The {$variant} primary navigation rendered '{$testid}' more than once.",
            );

            $result[$variant][$id] = $anchor['attrs'];
        }

        return $result;
    }

    /**
     * @param  array<string, string>  $attrs
     */
    private function marksCurrent(array $attrs): bool
    {
        $value = strtolower(trim($attrs['aria-current'] ?? ''));

        return $value !== '' && $value !== 'false';
    }

    /**
     * Test ids of the navigation items marked as the current page.
     *
     * @param  array<string, array<string, string>>  $variantAnchors
     * @return list<string>
     */
    private function currentIds(array $variantAnchors): array
    {
        $ids = [];

        foreach ($variantAnchors as $id => $attrs) {
            if ($this->marksCurrent($attrs)) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    /**
     * Discover the attribute(s) that behave like a per-item scroll-restoration
     * key: carried by every primary navigation link in both variants, the same
     * value for the desktop and mobile rendering of one item, and a different
     * value for every other item.
     *
     * The pre-existing output (href / class / test id / current-state) is
     * excluded, because none of it can serve as the newly required key.
     *
     * @param  array{desktop: array<string, array<string, string>>, mobile: array<string, array<string, string>>}  $nav
     * @return array<string, array<string, string>> attribute name => [item id => key]
     */
    private function scrollKeyCandidates(array $nav): array
    {
        $ids = array_keys($nav['desktop']);
        $reserved = ['href', 'class', 'data-testid', 'aria-current'];
        $candidates = [];

        if ($ids === [] || array_keys($nav['mobile']) !== $ids) {
            return [];
        }

        foreach (array_keys($nav['desktop'][$ids[0]]) as $name) {
            if (in_array($name, $reserved, true)) {
                continue;
            }

            $values = [];
            $usable = true;

            foreach ($ids as $id) {
                $desktop = $nav['desktop'][$id][$name] ?? null;
                $mobile = $nav['mobile'][$id][$name] ?? null;

                if ($desktop === null || $desktop === '' || $desktop !== $mobile) {
                    $usable = false;
                    break;
                }

                $values[$id] = $desktop;
            }

            if ($usable && count(array_unique($values)) === count($ids)) {
                $candidates[$name] = $values;
            }
        }

        return $candidates;
    }

    /**
     * Discover attributes outside the primary navigation links that carry one
     * single value for the whole document — the shape a "which page is this"
     * region marker has to take.
     *
     * @return array<string, string> attribute name => value
     */
    private function regionMarkers(string $html): array
    {
        $seen = [];

        foreach ($this->elements($html) as $element) {
            $attrs = $element['attrs'];

            if ($element['tag'] === 'a' && str_starts_with($attrs['data-testid'] ?? '', 'nav-')) {
                continue;
            }

            if ($element['tag'] === 'meta' && isset($attrs['name'], $attrs['content'])) {
                $seen['meta:' . $attrs['name']][$attrs['content']] = true;

                continue;
            }

            foreach ($attrs as $name => $value) {
                $seen[$name][$value] = true;
            }
        }

        $markers = [];

        foreach ($seen as $name => $values) {
            if (count($values) !== 1) {
                continue;
            }

            $value = (string) array_key_first($values);

            if (strlen(trim($value)) < 2 || preg_match('/[a-zA-Z]/', $value) !== 1) {
                continue;
            }

            $markers[$name] = $value;
        }

        return $markers;
    }

    private function pathOf(string $url): string
    {
        return (string) (parse_url($url, PHP_URL_PATH) ?: '');
    }

    // ------------------------------------------------------------------
    // Assertions
    // ------------------------------------------------------------------

    #[Test]
    public function current_page_is_programmatically_marked_in_both_navigation_variants(): void
    {
        $admin = $this->memberOf(UserRole::ADMIN);

        foreach ([route('user.dashboard'), route('billing.index')] as $url) {
            $nav = $this->navAnchors($this->fetch($admin, $url));

            $this->assertNotEmpty($nav['desktop'], "No desktop primary navigation links were rendered on {$url}.");
            $this->assertNotEmpty($nav['mobile'], "No mobile primary navigation links were rendered on {$url}.");

            $desktopCurrent = $this->currentIds($nav['desktop']);
            $mobileCurrent = $this->currentIds($nav['mobile']);

            $this->assertCount(
                1,
                $desktopCurrent,
                "The desktop primary navigation must expose exactly one programmatically current item on {$url}; got: "
                    . json_encode($desktopCurrent),
            );
            $this->assertCount(
                1,
                $mobileCurrent,
                "The mobile primary navigation must expose exactly one programmatically current item on {$url}; got: "
                    . json_encode($mobileCurrent),
            );
            $this->assertSame(
                $desktopCurrent,
                $mobileCurrent,
                "Desktop and mobile disagree about which navigation item is current on {$url}.",
            );

            $currentHref = $nav['desktop'][$desktopCurrent[0]]['href'] ?? '';

            $this->assertSame(
                $this->pathOf($url),
                $this->pathOf($currentHref),
                "The item marked current on {$url} points at {$currentHref} instead of the page being rendered.",
            );
        }
    }

    #[Test]
    public function only_one_navigation_item_is_current_on_a_nested_section_page(): void
    {
        // /events/contacts sits under the events section, so more than one item
        // is highlighted by the legacy prefix-based active state. Exactly one of
        // them may be announced as the current page.
        $admin = $this->memberOf(UserRole::ADMIN);
        $url = route('events.contacts.index');
        $html = $this->fetch($admin, $url);
        $nav = $this->navAnchors($html);

        $this->assertGreaterThan(
            1,
            count($nav['desktop']),
            'Fixture sanity: this page must offer several navigation items for the single-current rule to mean anything.',
        );
        $this->assertArrayHasKey('nav-events', $nav['desktop'], 'Fixture sanity: the parent section link is expected here.');
        $this->assertArrayHasKey('nav-audience', $nav['desktop'], 'Fixture sanity: the nested page link is expected here.');

        $desktopCurrent = $this->currentIds($nav['desktop']);
        $mobileCurrent = $this->currentIds($nav['mobile']);

        $this->assertCount(
            1,
            $desktopCurrent,
            "Exactly one desktop navigation item may be announced as current on {$url}; got: "
                . json_encode($desktopCurrent),
        );
        $this->assertCount(
            1,
            $mobileCurrent,
            "Exactly one mobile navigation item may be announced as current on {$url}; got: "
                . json_encode($mobileCurrent),
        );
        $this->assertSame(
            $desktopCurrent,
            $mobileCurrent,
            "Desktop and mobile disagree about which navigation item is current on {$url}.",
        );
    }

    #[Test]
    public function every_navigation_link_carries_a_variant_independent_scroll_key(): void
    {
        $admin = $this->memberOf(UserRole::ADMIN);
        $nav = $this->navAnchors($this->fetch($admin, route('events.index')));

        $this->assertGreaterThan(2, count($nav['desktop']), 'Too few primary navigation links to evaluate.');
        $this->assertSame(
            array_keys($nav['desktop']),
            array_keys($nav['mobile']),
            'Desktop and mobile must render the same primary navigation items.',
        );

        $candidates = $this->scrollKeyCandidates($nav);

        $this->assertNotEmpty(
            $candidates,
            'No primary navigation link exposes a scroll-restoration key that is present on every item, '
                . 'identical for the desktop and mobile rendering of the same item, and distinct per item. '
                . 'Rendered desktop link attributes: '
                . json_encode(array_map(static fn (array $a): array => array_keys($a), $nav['desktop'])),
        );
    }

    #[Test]
    public function scroll_keys_are_stable_across_requests_and_across_pages(): void
    {
        $admin = $this->memberOf(UserRole::ADMIN);

        $first = $this->scrollKeyCandidates($this->navAnchors($this->fetch($admin, route('events.index'))));
        $second = $this->scrollKeyCandidates($this->navAnchors($this->fetch($admin, route('events.index'))));
        $other = $this->scrollKeyCandidates($this->navAnchors($this->fetch($admin, route('billing.index'))));

        $this->assertNotEmpty($first, 'The primary navigation exposes no per-item scroll-restoration key at all.');

        $stable = [];

        foreach ($first as $name => $keys) {
            if (! isset($second[$name], $other[$name])) {
                continue;
            }

            if ($second[$name] !== $keys) {
                continue;
            }

            $shared = array_intersect_key($other[$name], $keys);

            if ($shared !== array_intersect_key($keys, $other[$name])) {
                continue;
            }

            $stable[$name] = $keys;
        }

        $this->assertNotEmpty(
            $stable,
            'The per-item scroll-restoration key changes between requests or between pages, so a client could '
                . 'never correlate a stored scroll offset with the item it belongs to. Observed keys — '
                . 'request 1: ' . json_encode($first) . ' request 2: ' . json_encode($second)
                . ' other page: ' . json_encode($other),
        );
    }

    #[Test]
    public function authenticated_layout_emits_a_page_scoped_scroll_region_marker(): void
    {
        $admin = $this->memberOf(UserRole::ADMIN);

        $pageA = $this->regionMarkers($this->fetch($admin, route('user.dashboard')));
        $pageB = $this->regionMarkers($this->fetch($admin, route('billing.index')));
        $pageAAgain = $this->regionMarkers($this->fetch($admin, route('user.dashboard')));

        $identifiers = [];

        foreach ($pageA as $name => $value) {
            if (! isset($pageB[$name], $pageAAgain[$name])) {
                continue;
            }

            if ($pageAAgain[$name] !== $value || $pageB[$name] === $value) {
                continue;
            }

            $identifiers[$name] = [$value, $pageB[$name]];
        }

        $this->assertNotEmpty(
            $identifiers,
            'The authenticated layout emits no machine-readable marker that identifies the page being rendered: '
                . 'nothing outside the navigation links keeps one single value per page, stays identical when the '
                . 'same page is requested again, and changes when a different page is rendered. Without it, '
                . 'Back/Forward cannot tell which stored scroll offset belongs to the incoming page.',
        );
    }

    #[Test]
    public function existing_navigation_output_and_filtering_are_preserved(): void
    {
        $admin = $this->memberOf(UserRole::ADMIN);
        $nav = $this->navAnchors($this->fetch($admin, route('events.index')));

        $expected = [
            'nav-dashboard' => route('user.dashboard'),
            'nav-events' => route('events.index'),
            'nav-audience' => route('events.contacts.index'),
            'nav-billing' => route('billing.index'),
        ];

        foreach ($expected as $id => $href) {
            $this->assertArrayHasKey($id, $nav['desktop'], "Desktop navigation lost the '{$id}' link.");
            $this->assertArrayHasKey($id, $nav['mobile'], "Mobile navigation lost the '{$id}-mobile' link.");
            $this->assertSame($href, $nav['desktop'][$id]['href'] ?? '', "Desktop '{$id}' href changed.");
            $this->assertSame($href, $nav['mobile'][$id]['href'] ?? '', "Mobile '{$id}-mobile' href changed.");
        }

        $this->assertNotEmpty(
            $this->scrollKeyCandidates($nav),
            'The primary navigation exposes no per-item scroll-restoration key.',
        );

        // The exclusion list and badge rendering are part of the component's
        // existing contract and must survive the new markup.
        $items = [
            ['key' => 'tenant-dashboard', 'label' => 'Dashboard', 'route' => 'user.dashboard', 'data_testid' => 'nav-dashboard', 'order' => 10, 'active' => false],
            ['key' => 'tenant-events', 'label' => 'Events', 'route' => 'events.index', 'data_testid' => 'nav-events', 'order' => 20, 'active' => true],
            ['key' => 'tenant-billing', 'label' => 'Billing', 'route' => 'billing.index', 'data_testid' => 'nav-billing', 'order' => 40, 'active' => false, 'badge' => 7],
        ];

        $filtered = Blade::render(
            '<x-topbar-navigation :items="$items" variant="mobile" :except="$except" />',
            ['items' => $items, 'except' => ['tenant-events']],
        );

        $this->assertStringContainsString('data-testid="nav-dashboard-mobile"', $filtered);
        $this->assertStringContainsString('data-testid="nav-billing-mobile"', $filtered);
        $this->assertStringNotContainsString(
            'nav-events',
            $filtered,
            'An excluded navigation item still reached the rendered mobile navigation.',
        );
        $this->assertStringNotContainsString(
            'tenant-events',
            $filtered,
            'An excluded navigation item still leaked its item key into the rendered mobile navigation.',
        );
        $this->assertStringNotContainsString(
            route('events.index'),
            $filtered,
            'An excluded navigation item still leaked its destination into the rendered mobile navigation.',
        );

        $badged = null;

        foreach ($this->anchors($filtered) as $anchor) {
            if (($anchor['attrs']['data-testid'] ?? '') === 'nav-billing-mobile') {
                $badged = $anchor;
            }
        }

        $this->assertNotNull($badged, 'The mobile navigation did not render the expected link.');
        $this->assertStringContainsString('Billing', $badged['inner'], 'The navigation label is no longer rendered.');
        $this->assertStringContainsString('7', $badged['inner'], 'The navigation badge is no longer rendered.');
    }

    #[Test]
    public function navigation_markers_never_expose_destinations_the_viewer_cannot_reach(): void
    {
        // A billing-only member holds none of the events/automations
        // capabilities, so those items are filtered out of the resolved menu.
        // The new per-item keys and page marker must be derived from what the
        // viewer may actually see.
        $billingOnly = $this->memberOf(UserRole::BILLING_ADMIN);
        $html = $this->fetch($billingOnly, route('billing.index'));
        $nav = $this->navAnchors($html);

        $this->assertNotEmpty($nav['desktop'], 'No desktop primary navigation links were rendered.');
        $this->assertNotEmpty(
            $this->scrollKeyCandidates($nav),
            'The primary navigation exposes no per-item scroll-restoration key for this viewer.',
        );
        $this->assertCount(
            1,
            $this->currentIds($nav['desktop']),
            'The desktop primary navigation must expose exactly one current item for this viewer.',
        );
        $this->assertCount(
            1,
            $this->currentIds($nav['mobile']),
            'The mobile primary navigation must expose exactly one current item for this viewer.',
        );

        foreach (['nav-events', 'nav-audience', 'nav-automations', 'nav-reports'] as $forbidden) {
            $this->assertArrayNotHasKey($forbidden, $nav['desktop'], "'{$forbidden}' must not be offered to this viewer.");
            $this->assertArrayNotHasKey($forbidden, $nav['mobile'], "'{$forbidden}-mobile' must not be offered to this viewer.");
        }

        foreach (['tenant-events', 'tenant-audience', 'tenant-automations', 'tenant-reports', 'events.index', 'events.contacts.index', 'automations.index'] as $needle) {
            $this->assertStringNotContainsString(
                $needle,
                $html,
                "The page leaks the navigation destination '{$needle}' to a viewer who is not allowed to reach it.",
            );
        }

        $forbiddenUrls = [route('events.index'), route('events.contacts.index'), route('automations.index')];

        foreach ($this->elements($html) as $element) {
            foreach ($element['attrs'] as $name => $value) {
                foreach ($forbiddenUrls as $url) {
                    $this->assertStringNotContainsString(
                        $url,
                        $value,
                        "Attribute '{$name}' exposes '{$url}' to a viewer who is not allowed to reach it.",
                    );
                }
            }
        }
    }

    #[Test]
    public function scroll_restoration_markers_do_not_reflect_request_controlled_markup(): void
    {
        $admin = $this->memberOf(UserRole::ADMIN);
        $payload = '"><jkmoracle onload=alert(1)>';

        $response = $this->actingAs($admin)
            ->withHeaders(['Referer' => 'http://localhost/dashboard?back=' . $payload])
            ->get(route('events.index') . '?return=' . rawurlencode($payload) . '&scroll=' . rawurlencode($payload));

        $response->assertOk();
        $html = (string) $response->getContent();

        $this->assertNotEmpty(
            $this->scrollKeyCandidates($this->navAnchors($html)),
            'The primary navigation exposes no per-item scroll-restoration key.',
        );
        $this->assertNotEmpty(
            $this->regionMarkers($html),
            'The authenticated layout emits no machine-readable page marker.',
        );

        $this->assertFalse(
            stripos($html, '<jkmoracle') !== false,
            'Request-controlled input reached the rendered page unescaped, so the scroll-restoration markers can be '
                . 'used to inject markup into an authenticated page.',
        );
        $this->assertFalse(
            stripos($html, 'onload=alert(1)') !== false,
            'Request-controlled input reached the rendered page unescaped.',
        );
    }
}
