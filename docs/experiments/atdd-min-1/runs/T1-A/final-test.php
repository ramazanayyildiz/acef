<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\PlanTier;
use App\Enums\UserRole;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use App\Modules\Events\Support\EventActionAvailability;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Billing\Support\BillingTestFixtures;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T1 ATDD — Duplicate an event.
 *
 * Critical path only:
 *   - AC1 named POST route on the Events module
 *   - AC2/AC3 shared action model exposes `duplicate` gated on the create capability
 *   - AC4 endpoint refuses independently of what the UI rendered, with no row written
 *   - AC5/AC6 a successful duplicate is a fresh DRAFT copy in the acting team,
 *     carrying no lifecycle, cancellation or registration state from the source
 */
#[Group('events')]
class EventDuplicateActionTest extends FeatureTestCase
{
    use BillingTestFixtures;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    // =========================================================================
    // AC1 — route contract
    // =========================================================================

    #[Test]
    public function duplicate_route_is_registered_by_name_on_the_events_module(): void
    {
        $route = Route::getRoutes()->getByName('events.duplicate');

        $this->assertNotNull($route, 'Named route [events.duplicate] is not registered.');
        $this->assertSame('events/{event:uuid}/duplicate', $route->uri());
        $this->assertContains('POST', $route->methods());
        $this->assertStringStartsWith(
            'App\Modules\Events\\',
            $route->getActionName(),
            'events.duplicate must be handled by the Events module.',
        );
    }

    // =========================================================================
    // AC2 + AC3 — shared action model
    // =========================================================================

    #[Test]
    public function action_model_exposes_duplicate_for_an_actor_with_the_create_capability(): void
    {
        [$admin] = $this->adminWithPlan(PlanTier::GROWTH);
        $event = $this->eventFor($admin, EventState::DRAFT);

        $availability = app(EventActionAvailability::class)->for($admin->fresh(), $event);

        $this->assertArrayHasKey('duplicate', $availability);
        $this->assertSame(
            array_keys($availability['edit']),
            array_keys($availability['duplicate']),
            'duplicate entry must share the shape of the existing action entries.',
        );
        $this->assertTrue($availability['duplicate']['visible']);
        $this->assertTrue($availability['duplicate']['enabled']);
    }

    #[Test]
    public function action_model_hides_duplicate_from_an_actor_without_the_create_capability(): void
    {
        // billing-admin holds no events.* team capability.
        [$admin, $team] = $this->adminWithPlan(PlanTier::GROWTH);
        $event = $this->eventFor($admin, EventState::DRAFT);

        $billingAdmin = User::factory()->create(['email_verified_at' => now()]);
        $billingAdmin->teams()->attach($team, ['role' => UserRole::BILLING_ADMIN->value]);
        $billingAdmin->forceFill(['current_team_id' => $team->id])->save();

        $availability = app(EventActionAvailability::class)->for($billingAdmin->fresh(), $event);

        $this->assertArrayHasKey('duplicate', $availability);
        $this->assertFalse($availability['duplicate']['visible']);
        $this->assertFalse($availability['duplicate']['enabled']);
    }

    // =========================================================================
    // AC5 + AC6 — successful duplicate
    // =========================================================================

    #[Test]
    public function duplicating_an_event_creates_one_fresh_draft_copy_in_the_acting_team(): void
    {
        [$admin] = $this->adminWithPlan(PlanTier::GROWTH);

        $source = $this->eventFor($admin, EventState::PUBLISHED);
        $source->forceFill([
            'cancelled_at' => now(),
            'cancelled_by' => $admin->id,
            'cancel_reason' => 'Speaker dropped out',
        ])->save();
        $this->registrationFor($source);

        $response = $this->actingAs($admin)
            ->from(route('events.show', $source))
            ->post('/events/'.$source->uuid.'/duplicate');

        $response->assertSessionHasNoErrors();
        $this->assertContains(
            $response->status(),
            [200, 201, 302],
            'Duplicate should be accepted; got HTTP '.$response->status().'.',
        );

        $this->assertSame(2, Event::withoutGlobalScopes()->count(), 'Exactly one new event should exist.');

        $copy = Event::withoutGlobalScopes()
            ->whereKeyNot($source->getKey())
            ->sole();

        $this->assertNotSame($source->uuid, $copy->uuid);
        $this->assertSame(EventState::DRAFT, $copy->state);
        $this->assertSame($admin->fresh()->currentTeam->id, $copy->team_id);

        // AC6 — no lifecycle / cancellation / registration carry-over.
        $this->assertNull($copy->cancelled_at);
        $this->assertNull($copy->cancelled_by);
        $this->assertNull($copy->cancel_reason);
        $this->assertSame(0, $copy->registrations()->withoutGlobalScopes()->count());
        $this->assertSame(1, Registration::withoutGlobalScopes()->count());
    }

    // =========================================================================
    // AC4 — endpoint stands on its own authorization
    // =========================================================================

    #[Test]
    public function endpoint_refuses_an_actor_without_the_create_capability_and_writes_no_event(): void
    {
        [$admin, $team] = $this->adminWithPlan(PlanTier::GROWTH);
        $source = $this->eventFor($admin, EventState::DRAFT);

        $billingAdmin = User::factory()->create(['email_verified_at' => now()]);
        $billingAdmin->teams()->attach($team, ['role' => UserRole::BILLING_ADMIN->value]);
        $billingAdmin->forceFill(['current_team_id' => $team->id])->save();

        $response = $this->actingAs($billingAdmin->fresh())
            ->postJson('/events/'.$source->uuid.'/duplicate');

        $response->assertStatus(403);
        $this->assertSame(1, Event::withoutGlobalScopes()->count());
    }

    #[Test]
    public function endpoint_refuses_an_actor_who_cannot_view_the_source_event_and_writes_no_event(): void
    {
        [$owner] = $this->adminWithPlan(PlanTier::GROWTH);
        $source = $this->eventFor($owner, EventState::DRAFT);

        // Admin of an unrelated workspace: holds events.create.team there,
        // but has no visibility of this source event.
        [$outsider] = $this->adminWithPlan(PlanTier::GROWTH);

        $response = $this->actingAs($outsider->fresh())
            ->postJson('/events/'.$source->uuid.'/duplicate');

        $this->assertContains(
            $response->status(),
            [403, 404],
            'Cross-workspace duplicate must be refused; got HTTP '.$response->status().'.',
        );
        $this->assertSame(1, Event::withoutGlobalScopes()->count());
    }

    // =========================================================================
    // Fixtures
    // =========================================================================

    private function eventFor(User $admin, EventState $state): Event
    {
        return Event::factory()
            ->inState($state)
            ->for($admin->currentTeam)
            ->create(['created_by' => $admin->id]);
    }

    private function registrationFor(Event $event): Registration
    {
        $email = 'registrant-'.$event->id.'@example.test';

        $registration = new Registration;
        $registration->forceFill([
            'uuid' => sprintf('00000000-0000-4000-8000-%012x', $event->id),
            'team_id' => $event->team_id,
            'event_id' => $event->id,
            'email' => $email,
            'email_hash' => Hash::make($email),
            'full_name' => 'Registered Attendee',
        ]);
        $registration->save();

        return $registration;
    }
}
