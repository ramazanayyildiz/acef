<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T5 ATDD — shareable landing-preview link for unauthenticated reviewers.
 *
 * Covers:
 *  - AC1 organiser with the event-update capability mints a share link
 *  - AC2 unauthenticated visitor gets a read-only landing preview, DRAFT included
 *  - AC3 tampered parameters and expired links are refused
 *  - AC4 a link minted for one event does not open another event
 *  - AC5 an actor without the event-update capability cannot mint
 *  - AC6 shared view is read-only, non-authenticating, and no gateway to the editor
 */
#[Group('events')]
final class LandingPreviewShareLinkTest extends FeatureTestCase
{
    private User $organiser;

    private Team $team;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        $this->organiser = User::factory()->create();
        $this->team = Team::factory()->create(['user_id' => $this->organiser->id]);
        $this->organiser->teams()->attach($this->team, ['role' => UserRole::ADMIN->value]);
        $this->organiser->forceFill(['current_team_id' => $this->team->id])->save();
        $this->organiser = $this->organiser->fresh();
    }

    private function draftEvent(?Team $team = null): Event
    {
        $team ??= $this->team;

        return Event::factory()
            ->inState(EventState::DRAFT)
            ->for($team)
            ->create([
                'created_by' => $this->organiser->id,
                'title' => 'Quarterly Product Ops Review '.uniqid(),
            ]);
    }

    private function mintShareUrl(Event $event): string
    {
        $response = $this->actingAs($this->organiser)
            ->postJson(route('events.landing.share', $event->uuid));

        $response->assertOk();
        $response->assertJsonStructure(['url']);

        $url = $response->json('url');
        $this->assertIsString($url);
        $this->assertNotSame('', trim($url));

        return $url;
    }

    #[Test]
    public function organiser_mints_share_link_and_guest_sees_read_only_draft_landing_preview(): void
    {
        $event = $this->draftEvent();

        $url = $this->mintShareUrl($event);

        // AC2 — unauthenticated reviewer reaches a read-only preview of a DRAFT event.
        $this->app['auth']->forgetGuards();
        $shared = $this->get($url);

        $shared->assertOk();
        $shared->assertSee('data-testid="landing-share-page"', false);
        $shared->assertSee($event->title, false);

        // AC6 — no registration submission surface and no authoring/edit control.
        $shared->assertDontSee(
            route('events.public.registration.store', ['eventUuid' => $event->uuid]),
            false,
        );
        $shared->assertDontSee(route('events.landing.edit', $event->uuid), false);

        // AC6 — visiting the share link neither logs the reviewer in ...
        $this->assertGuest();

        // ... nor opens the authenticated landing editor for them.
        $this->get(route('events.landing.edit', $event->uuid))->assertRedirect();
        $this->assertGuest();
    }

    #[Test]
    public function tampered_share_link_is_refused(): void
    {
        $event = $this->draftEvent();

        $url = $this->mintShareUrl($event);
        $tampered = $url.(str_contains($url, '?') ? '&' : '?').'reviewer=admin';

        $this->app['auth']->forgetGuards();

        $this->get($tampered)->assertForbidden();
    }

    #[Test]
    public function expired_share_link_is_refused(): void
    {
        $event = $this->draftEvent();

        $url = $this->mintShareUrl($event);

        $this->app['auth']->forgetGuards();
        $this->travel(8)->days();

        $this->get($url)->assertForbidden();
    }

    #[Test]
    public function share_link_for_one_event_does_not_open_another_event(): void
    {
        $shared = $this->draftEvent();
        $other = $this->draftEvent();

        $url = $this->mintShareUrl($shared);
        $swapped = str_replace($shared->uuid, $other->uuid, $url);

        $this->assertNotSame($url, $swapped, 'Share URL must be bound to a specific event.');

        $this->app['auth']->forgetGuards();

        $response = $this->get($swapped);

        $this->assertNotSame(200, $response->getStatusCode());
        $response->assertDontSee($other->title, false);
    }

    #[Test]
    public function actor_without_event_update_capability_cannot_mint_share_link(): void
    {
        $event = $this->draftEvent();

        $billingAdmin = User::factory()->create();
        $billingAdmin->teams()->attach($this->team, ['role' => UserRole::BILLING_ADMIN->value]);
        $billingAdmin->forceFill(['current_team_id' => $this->team->id])->save();

        $response = $this->actingAs($billingAdmin->fresh())
            ->postJson(route('events.landing.share', $event->uuid));

        $response->assertForbidden();
        $this->assertNull($response->json('url'));
    }
}
