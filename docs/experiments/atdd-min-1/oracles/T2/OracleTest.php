<?php

declare(strict_types=1);

namespace Tests\Feature\AtddOracle;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\LandingPage;
use App\Modules\Events\Support\EventActionAvailability;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Independent behavioural checks for the shared event page shell and the two
 * surfaces that adopt it (the new Event Overview page and the retrofitted
 * Landing Preview page).
 *
 * Every assertion is bound to a published seam: the named route, HTTP status,
 * the URLs of the existing event settings surfaces, and the existing shared
 * action model (EventActionAvailability). No assertion depends on class names,
 * file layout, CSS, or copy.
 */
class OracleTest extends FeatureTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    /**
     * @return array{0: User, 1: Team}
     */
    private function workspaceWithAdmin(): array
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $team = Team::factory()->create(['user_id' => $admin->id]);
        $admin->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $admin->forceFill(['current_team_id' => $team->id])->save();

        return [$admin->fresh(), $team->fresh()];
    }

    private function memberWithRole(Team $team, UserRole $role): User
    {
        $member = User::factory()->create(['email_verified_at' => now()]);
        $member->teams()->attach($team, ['role' => $role->value]);
        $member->forceFill(['current_team_id' => $team->id])->save();

        return $member->fresh();
    }

    private function eventFor(Team $team, User $creator, EventState $state, string $title): Event
    {
        return Event::factory()
            ->inState($state)
            ->for($team)
            ->create([
                'created_by' => $creator->id,
                'title' => $title,
            ])
            ->fresh();
    }

    /**
     * Resolve the overview URL through the named route when it exists, and fall
     * back to the specified path so that a missing route name fails in exactly
     * one test rather than erroring in all of them.
     */
    private function overviewUrl(Event $event): string
    {
        if (Route::has('events.overview')) {
            return route('events.overview', $event->uuid);
        }

        return '/events/'.$event->uuid.'/overview';
    }

    private function previewUrl(Event $event): string
    {
        return '/events/'.$event->uuid.'/landing/preview';
    }

    /**
     * @return list<string>
     */
    private function formTags(string $html): array
    {
        preg_match_all('/<form\b[^>]*>/i', $html, $matches);

        return $matches[0];
    }

    /**
     * The event-scoped settings surfaces linked by a rendered page, restricted
     * to the surfaces the existing settings navigation already offers.
     *
     * @return list<string>
     */
    private function settingsSurfaceLinks(string $html, Event $event): array
    {
        $canonical = [
            '/events/'.$event->uuid,
            '/events/'.$event->uuid.'/edit',
            '/events/'.$event->uuid.'/landing',
            '/events/'.$event->uuid.'/landing/preview',
            '/events/'.$event->uuid.'/form-config',
            '/events/'.$event->uuid.'/custom-domain',
            '/events/'.$event->uuid.'/automations',
            '/events/'.$event->uuid.'/audience-boost',
            '/events/'.$event->uuid.'/overview',
        ];

        preg_match_all('/href\s*=\s*"([^"]*)"/i', $html, $matches);

        $paths = [];
        foreach ($matches[1] as $href) {
            $path = parse_url(html_entity_decode($href), PHP_URL_PATH);
            if (is_string($path) && in_array($path, $canonical, true)) {
                $paths[$path] = true;
            }
        }

        $found = array_keys($paths);
        sort($found);

        return $found;
    }

    // ------------------------------------------------------------------
    // AC2 — the new page exists on the named route and serves organizers
    // ------------------------------------------------------------------

    #[Test]
    public function event_overview_is_reachable_through_the_named_route_for_an_authorized_organizer(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $event = $this->eventFor($team, $admin, EventState::DRAFT, 'Quarterly Product Launch Briefing');

        $this->assertTrue(
            Route::has('events.overview'),
            'A named route "events.overview" must be registered for the event overview page.'
        );

        $route = Route::getRoutes()->getByName('events.overview');
        $this->assertNotNull($route);
        $this->assertContains(
            'GET',
            $route->methods(),
            'events.overview must answer GET requests.'
        );
        $this->assertSame(
            '/events/'.$event->uuid.'/overview',
            parse_url(route('events.overview', $event->uuid), PHP_URL_PATH),
            'events.overview must resolve to /events/{event:uuid}/overview.'
        );

        $this->actingAs($admin)
            ->get($this->overviewUrl($event))
            ->assertOk()
            ->assertSee($event->title, false);
    }

    // ------------------------------------------------------------------
    // AC1/AC2 — the page renders through the shell, including the tab strip
    // ------------------------------------------------------------------

    #[Test]
    public function event_overview_renders_the_event_settings_tab_strip_for_this_event(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $event = $this->eventFor($team, $admin, EventState::DRAFT, 'Settings Navigation Probe Event');

        $response = $this->actingAs($admin)->get($this->overviewUrl($event));
        $response->assertOk();

        foreach ([
            '/events/'.$event->uuid.'/landing/preview',
            '/events/'.$event->uuid.'/form-config',
            '/events/'.$event->uuid.'/custom-domain',
            '/events/'.$event->uuid.'/automations',
        ] as $siblingSurface) {
            $response->assertSee($siblingSurface, false);
        }
    }

    // ------------------------------------------------------------------
    // AC4 — action visibility on the new page follows the shared action model
    // ------------------------------------------------------------------

    #[Test]
    public function event_overview_action_visibility_follows_the_shared_event_action_model(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $draft = $this->eventFor($team, $admin, EventState::DRAFT, 'Draft Availability Probe');
        $published = $this->eventFor($team, $admin, EventState::PUBLISHED, 'Published Availability Probe');

        $availability = app(EventActionAvailability::class);
        $draftActions = $availability->for($admin, $draft);
        $publishedActions = $availability->for($admin, $published);

        // Fixture precondition, read from the shared model rather than hardcoded.
        $this->assertTrue(
            $draftActions['edit']['visible'] && $draftActions['edit']['enabled'],
            'Fixture precondition: the metadata edit action is available on a DRAFT event for an admin.'
        );
        $this->assertFalse(
            $publishedActions['edit']['visible'] && $publishedActions['edit']['enabled'],
            'Fixture precondition: the metadata edit action is unavailable on a PUBLISHED event.'
        );

        $this->actingAs($admin)
            ->get($this->overviewUrl($draft))
            ->assertOk()
            ->assertSee('/events/'.$draft->uuid.'/edit', false);

        $this->actingAs($admin)
            ->get($this->overviewUrl($published))
            ->assertOk()
            ->assertDontSee('/events/'.$published->uuid.'/edit', false);
    }

    // ------------------------------------------------------------------
    // AC5 — the new page is read-only
    // ------------------------------------------------------------------

    #[Test]
    public function event_overview_exposes_no_state_changing_control_for_the_event(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $event = $this->eventFor($team, $admin, EventState::DRAFT, 'Read Only Surface Probe');

        $response = $this->actingAs($admin)->get($this->overviewUrl($event));
        $response->assertOk();

        $html = (string) $response->getContent();

        foreach ($this->formTags($html) as $formTag) {
            $this->assertStringNotContainsString(
                $event->uuid,
                $formTag,
                'A read-only overview page must not submit any form for this event: '.$formTag
            );

            if (preg_match('/method\s*=\s*["\']?(post|put|patch|delete)/i', $formTag) === 1) {
                $this->assertStringNotContainsString(
                    '/events/',
                    $formTag,
                    'A read-only overview page must not expose a mutating form for the events module: '.$formTag
                );
            }
        }

        $this->assertStringNotContainsString(
            'wire:submit',
            $html,
            'A read-only overview page must not expose a component form submission.'
        );

        foreach (['publish', 'cancel', 'suspend', 'reactivate', 'force-end'] as $stateChangingVerb) {
            $this->assertStringNotContainsString(
                '/events/'.$event->uuid.'/'.$stateChangingVerb,
                $html,
                'A read-only overview page must not expose the '.$stateChangingVerb.' control.'
            );
        }
    }

    // ------------------------------------------------------------------
    // AC6 — view authorization is enforced, not just reflected in the UI
    // ------------------------------------------------------------------

    #[Test]
    public function event_overview_refuses_a_workspace_member_without_event_view_authorization(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $event = $this->eventFor($team, $admin, EventState::DRAFT, 'Capability Boundary Probe Event');

        // Positive control: the page really is served to an entitled organizer,
        // so the refusal below cannot pass merely because the page is missing.
        $this->actingAs($admin)
            ->get($this->overviewUrl($event))
            ->assertOk();

        // Billing admins hold no events.* capability, so they may not view events.
        $billingAdmin = $this->memberWithRole($team, UserRole::BILLING_ADMIN);

        $response = $this->actingAs($billingAdmin)->get($this->overviewUrl($event));

        $this->assertContains(
            $response->status(),
            [403, 404],
            'An actor without event view authorization must be refused the overview page, got HTTP '.$response->status().'.'
        );
        $this->assertStringNotContainsString(
            $event->title,
            (string) $response->getContent(),
            'A refused actor must not receive the event content.'
        );
    }

    #[Test]
    public function event_overview_refuses_an_actor_from_another_workspace(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $event = $this->eventFor($team, $admin, EventState::DRAFT, 'Cross Workspace Isolation Probe');

        // Positive control: the page really is served inside the owning workspace.
        $this->actingAs($admin)
            ->get($this->overviewUrl($event))
            ->assertOk();

        [$outsider] = $this->workspaceWithAdmin();

        $response = $this->actingAs($outsider)->get($this->overviewUrl($event));

        $this->assertContains(
            $response->status(),
            [403, 404],
            'An actor outside the event workspace must be refused the overview page, got HTTP '.$response->status().'.'
        );
        $this->assertStringNotContainsString(
            $event->title,
            (string) $response->getContent(),
            'A refused actor must not receive the event content.'
        );
    }

    #[Test]
    public function event_overview_requires_an_authenticated_session(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $event = $this->eventFor($team, $admin, EventState::DRAFT, 'Guest Access Probe Event');

        $response = $this->get($this->overviewUrl($event));

        $this->assertNotSame(
            200,
            $response->status(),
            'The overview page must not be served to unauthenticated visitors.'
        );
        $response->assertRedirect(route('login'));
    }

    // ------------------------------------------------------------------
    // AC3 — the retrofitted Landing Preview keeps its behaviour
    // ------------------------------------------------------------------

    #[Test]
    public function landing_preview_keeps_action_driven_header_and_preview_body_after_shell_adoption(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $draft = $this->eventFor($team, $admin, EventState::DRAFT, 'Preview Retrofit Draft Probe');
        $published = $this->eventFor($team, $admin, EventState::PUBLISHED, 'Preview Retrofit Published Probe');

        foreach ([$draft, $published] as $event) {
            LandingPage::factory()
                ->for($event)
                ->state([
                    'team_id' => $event->team_id,
                    'template' => 'classic',
                ])
                ->create();
        }

        $availability = app(EventActionAvailability::class);
        $this->assertTrue(
            $availability->for($admin, $draft)['edit']['enabled'],
            'Fixture precondition: metadata edit is available on the DRAFT event.'
        );
        $this->assertFalse(
            $availability->for($admin, $published)['edit']['enabled'],
            'Fixture precondition: metadata edit is unavailable on the PUBLISHED event.'
        );

        $draftResponse = $this->actingAs($admin)->get($this->previewUrl($draft));
        $draftResponse->assertOk();
        // Preview body must survive the retrofit.
        $draftResponse->assertSee('landing-preview-page', false);
        $draftResponse->assertSee($draft->title, false);
        // Action-model driven header must survive the retrofit.
        $draftResponse->assertSee('/events/'.$draft->uuid.'/edit', false);

        $publishedResponse = $this->actingAs($admin)->get($this->previewUrl($published));
        $publishedResponse->assertOk();
        $publishedResponse->assertSee('landing-preview-page', false);
        $publishedResponse->assertDontSee('/events/'.$published->uuid.'/edit', false);

        // Both surfaces must present the same shell navigation for the same
        // event and actor: whatever settings surfaces the overview page offers,
        // the preview page offers too.
        $overviewResponse = $this->actingAs($admin)->get($this->overviewUrl($draft));
        $overviewResponse->assertOk();

        $overviewLinks = $this->settingsSurfaceLinks((string) $overviewResponse->getContent(), $draft);
        $previewLinks = $this->settingsSurfaceLinks((string) $draftResponse->getContent(), $draft);

        $this->assertGreaterThanOrEqual(
            4,
            count($overviewLinks),
            'The shared shell must render the event settings navigation on the overview page.'
        );
        $this->assertSame(
            [],
            array_values(array_diff($overviewLinks, $previewLinks)),
            'Both pages must render the same shell navigation; the preview page is missing surfaces the overview page offers.'
        );
    }
}
