<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\LandingPage;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T5 ATDD — Shareable landing-preview link for unauthenticated reviewers.
 *
 * Covers:
 *  - AC1 organiser with the event-update capability mints a link via POST events.landing.share
 *  - AC2 GET events.public.landing-share serves an unauthenticated read-only preview, DRAFT included
 *  - AC3 tamper-evident and time-limited: altered parameters and expired links are refused
 *  - AC4 a link minted for one event does not grant access to another event
 *  - AC5 an actor without the event-update capability cannot mint a link
 *  - AC6 the shared view carries no registration submission and no authoring control, and
 *        visiting it neither authenticates the visitor nor opens the authenticated editor
 *
 * Contract this test pins for the implementer:
 *  - POST events.landing.share responds successfully with JSON {"url": "<absolute share link>"}
 *  - the minted link is event-scoped (the event uuid appears in it) and signed by the
 *    framework's signed-URL mechanism, so refusals surface as HTTP 403
 *  - the shared surface renders with data-testid="landing-share-preview"
 *
 * ALL tests intentionally FAIL on HEAD: neither route exists, so no share link can be
 * minted and no unauthenticated read-only preview can be served.
 */
#[Group('events')]
#[Group('p1')]
class LandingPreviewShareLinkTest extends FeatureTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    /**
     * @return array{0: User, 1: Team, 2: Event}
     */
    private function organiserWithDraftEvent(string $title = 'Draft Product Ops Briefing'): array
    {
        $organiser = User::factory()->create();
        $team = Team::factory()->create(['user_id' => $organiser->id]);
        $organiser->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $organiser->forceFill(['current_team_id' => $team->id])->save();

        $event = Event::factory()
            ->inState(EventState::DRAFT)
            ->for($team)
            ->create([
                'created_by' => $organiser->id,
                'title' => $title,
            ]);

        LandingPage::factory()->for($event)->create([
            'team_id' => $event->team_id,
            'template' => 'modern',
            'primary_color' => '#112233',
        ]);

        return [$organiser->fresh(), $team->fresh(), $event->fresh()];
    }

    private function mintShareLink(User $organiser, Event $event): string
    {
        $response = $this->actingAs($organiser)
            ->postJson(route('events.landing.share', $event));

        $response->assertSuccessful();

        $url = $response->json('url');

        $this->assertIsString($url, 'Minting a share link must return the share url.');
        $this->assertNotSame('', $url);

        return $url;
    }

    private function becomeGuest(): void
    {
        $this->app->make('auth')->forgetGuards();
        $this->flushSession();
    }

    #[Test]
    public function organiser_mints_link_that_serves_unauthenticated_read_only_preview_of_draft_event(): void
    {
        [$organiser, , $event] = $this->organiserWithDraftEvent();

        $url = $this->mintShareLink($organiser, $event);
        $this->assertStringContainsString($event->uuid, $url, 'The share link must be scoped to one event.');

        $this->becomeGuest();

        $response = $this->get($url);

        $response->assertOk();
        $response->assertSee('data-testid="landing-share-preview"', false);
        $response->assertSeeText($event->title);
        $this->assertSame(EventState::DRAFT, $event->fresh()->state);
    }

    #[Test]
    public function shared_view_exposes_no_registration_or_authoring_surface_and_does_not_authenticate_the_visitor(): void
    {
        [$organiser, , $event] = $this->organiserWithDraftEvent();

        $url = $this->mintShareLink($organiser, $event);

        $this->becomeGuest();

        $response = $this->get($url);

        $response->assertOk();
        $response->assertDontSee('data-testid="public-landing-register-form"', false);
        $response->assertDontSee("/webinars/{$event->uuid}/register", false);
        $response->assertDontSee('name="_token"', false);

        $this->assertGuest();
        $this->get(route('events.landing.edit', $event))->assertRedirect();
    }

    #[Test]
    public function tampered_share_link_is_refused(): void
    {
        [$organiser, , $event] = $this->organiserWithDraftEvent();

        $url = $this->mintShareLink($organiser, $event);

        $this->becomeGuest();

        $tampered = $url.(str_contains($url, '?') ? '&' : '?').'reviewer=elevated';

        $this->get($tampered)->assertForbidden();
    }

    #[Test]
    public function expired_share_link_is_refused(): void
    {
        [$organiser, , $event] = $this->organiserWithDraftEvent();

        $url = $this->mintShareLink($organiser, $event);

        $this->becomeGuest();
        $this->travel(1)->years();

        $this->get($url)->assertForbidden();
    }

    #[Test]
    public function share_link_for_one_event_does_not_grant_access_to_another_event(): void
    {
        [$organiser, $team, $event] = $this->organiserWithDraftEvent();

        $otherEvent = Event::factory()
            ->inState(EventState::DRAFT)
            ->for($team)
            ->create([
                'created_by' => $organiser->id,
                'title' => 'Unshared Internal Roadmap Session',
            ]);
        LandingPage::factory()->for($otherEvent)->create(['team_id' => $otherEvent->team_id]);

        $url = $this->mintShareLink($organiser, $event);

        $this->becomeGuest();

        $crossEventUrl = str_replace($event->uuid, $otherEvent->uuid, $url);
        $this->assertNotSame($url, $crossEventUrl);

        $this->get($crossEventUrl)->assertForbidden();
        $this->get($url)->assertOk()->assertDontSeeText($otherEvent->title);
    }

    #[Test]
    public function actor_without_event_update_capability_cannot_mint_share_link(): void
    {
        [, $team, $event] = $this->organiserWithDraftEvent();

        $billingAdmin = User::factory()->create();
        $billingAdmin->teams()->attach($team, ['role' => UserRole::BILLING_ADMIN->value]);
        $billingAdmin->forceFill(['current_team_id' => $team->id])->save();

        $this->actingAs($billingAdmin->fresh())
            ->postJson(route('events.landing.share', $event))
            ->assertForbidden();
    }
}
