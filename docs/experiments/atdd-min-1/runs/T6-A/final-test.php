<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\PlanTier;
use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use App\Modules\Events\Support\EventAuditEvents;
use App\Scopes\TeamScope;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Activitylog\Models\Activity;
use Tests\Feature\Billing\Support\BillingTestFixtures;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T6 — platform-admin revert of a PUBLISHED event back to DRAFT.
 *
 * ATDD: every test here is intentionally RED until the revert action exists.
 */
#[Group('events')]
class AdminRevertToDraftTest extends FeatureTestCase
{
    use BillingTestFixtures;

    #[Test]
    public function platform_admin_reverts_a_published_event_without_registrations_to_draft(): void
    {
        [$organiser] = $this->adminWithPlan(PlanTier::GROWTH);
        $superAdmin = $this->platformSuperAdminFor($organiser->currentTeam);
        $event = $this->eventFor($organiser, EventState::PUBLISHED);

        $this->actingAs($superAdmin)
            ->post(route('admin.events.revert-to-draft', $event->uuid), ['reason' => 'Published by mistake'])
            ->assertRedirect();

        $this->assertSame(EventState::DRAFT, $this->persisted($event)->state);

        // AC2 — the move must land through the guarded transition path, which is
        // observable as its audit record for the published -> draft edge.
        $transition = Activity::query()
            ->where('log_name', EventAuditEvents::EVENT_TRANSITIONED)
            ->where('subject_id', $event->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($transition, 'Expected a guarded transition audit record for the revert.');
        $this->assertSame($superAdmin->id, (int) $transition->causer_id);
        $this->assertSame(EventState::PUBLISHED->value, data_get($transition->properties, 'from'));
        $this->assertSame(EventState::DRAFT->value, data_get($transition->properties, 'to'));
    }

    #[Test]
    public function workspace_admin_without_the_platform_capability_is_refused(): void
    {
        [$organiser] = $this->adminWithPlan(PlanTier::GROWTH);
        $event = $this->eventFor($organiser, EventState::PUBLISHED);

        $this->actingAs($organiser)
            ->post(route('admin.events.revert-to-draft', $event->uuid), ['reason' => 'Let me undo this'])
            ->assertForbidden();

        $this->assertNotReverted($event, EventState::PUBLISHED);
    }

    #[Test]
    public function revert_is_refused_when_the_event_is_not_published(): void
    {
        [$organiser] = $this->adminWithPlan(PlanTier::GROWTH);
        $superAdmin = $this->platformSuperAdminFor($organiser->currentTeam);
        $event = $this->eventFor($organiser, EventState::PREPARING);

        $this->actingAs($superAdmin)
            ->post(route('admin.events.revert-to-draft', $event->uuid), ['reason' => 'Support request']);

        $this->assertNotReverted($event, EventState::PREPARING);
    }

    #[Test]
    public function revert_is_refused_when_the_event_already_has_registrations(): void
    {
        [$organiser] = $this->adminWithPlan(PlanTier::GROWTH);
        $superAdmin = $this->platformSuperAdminFor($organiser->currentTeam);
        $event = $this->eventFor($organiser, EventState::PUBLISHED);
        $this->registerAttendee($event);

        $this->actingAs($superAdmin)
            ->post(route('admin.events.revert-to-draft', $event->uuid), ['reason' => 'Support request']);

        $this->assertNotReverted($event, EventState::PUBLISHED);
    }

    #[Test]
    public function cancelled_event_cannot_be_reverted(): void
    {
        [$organiser] = $this->adminWithPlan(PlanTier::GROWTH);
        $superAdmin = $this->platformSuperAdminFor($organiser->currentTeam);
        $event = $this->eventFor($organiser, EventState::PUBLISHED);
        $event->forceFill([
            'cancelled_at' => now(),
            'cancelled_by' => $organiser->id,
            'cancel_reason' => 'Speaker emergency',
        ])->save();

        $this->actingAs($superAdmin)
            ->post(route('admin.events.revert-to-draft', $event->uuid), ['reason' => 'Support request']);

        $fresh = $this->persisted($event);
        $this->assertSame(EventState::PUBLISHED, $fresh->state);
        $this->assertNotNull($fresh->cancelled_at);
        $this->assertNotReverted($event, EventState::PUBLISHED);
    }

    #[Test]
    public function only_the_published_to_draft_edge_is_added_to_the_canonical_table(): void
    {
        $expectedEdges = [
            EventState::DRAFT->value => ['published', 'suspended', 'failed'],
            EventState::PUBLISHED->value => ['preparing', 'suspended', 'failed', 'draft'],
            EventState::PREPARING->value => ['ready', 'failed', 'suspended'],
            EventState::READY->value => ['live', 'failed', 'suspended'],
            EventState::LIVE->value => ['ended', 'failed', 'suspended', 'ready'],
            EventState::ENDED->value => ['failed', 'suspended'],
            EventState::FAILED->value => ['preparing', 'suspended'],
            EventState::SUSPENDED->value => [],
        ];

        foreach (EventState::cases() as $state) {
            $actual = array_map(static fn (EventState $s) => $s->value, $state->transitionsTo());
            sort($actual);
            $expected = $expectedEdges[$state->value];
            sort($expected);

            $this->assertSame($expected, $actual, "Legal edges changed for {$state->value}.");
        }

        // State-derived rules other code reads from the table keep their answers.
        foreach (EventState::cases() as $state) {
            $this->assertSame(
                $state !== EventState::DRAFT,
                $state->isMetadataLocked(),
                "Metadata lock changed for {$state->value}.",
            );
            $this->assertSame(
                in_array($state, [EventState::DRAFT, EventState::ENDED, EventState::FAILED, EventState::SUSPENDED], true),
                $state->blocksRegistration(),
                "Registration blocking changed for {$state->value}.",
            );
            $this->assertSame(
                ! in_array($state, [EventState::DRAFT, EventState::FAILED, EventState::SUSPENDED], true),
                $state->isPubliclyIndexable(cancelled: false),
                "Public indexability changed for {$state->value}.",
            );
            $this->assertSame(
                $state !== EventState::SUSPENDED,
                $state->canBeSuspendedFrom(),
                "Suspend reachability changed for {$state->value}.",
            );
        }
    }

    private function assertNotReverted(Event $event, EventState $expected): void
    {
        $this->assertSame($expected, $this->persisted($event)->state);

        $this->assertFalse(
            Activity::query()
                ->where('log_name', EventAuditEvents::EVENT_TRANSITIONED)
                ->where('subject_id', $event->id)
                ->where('properties->to', EventState::DRAFT->value)
                ->exists(),
            'A refused revert must not record a transition to draft.',
        );
    }

    private function persisted(Event $event): Event
    {
        return Event::query()
            ->withoutGlobalScope(TeamScope::class)
            ->findOrFail($event->id);
    }

    private function eventFor(User $organiser, EventState $state): Event
    {
        return Event::factory()
            ->inState($state)
            ->for($organiser->currentTeam)
            ->create(['created_by' => $organiser->id]);
    }

    private function registerAttendee(Event $event): void
    {
        $email = 'registrant-'.$event->id.'@example.test';

        (new Registration)->forceFill([
            'team_id' => $event->team_id,
            'event_id' => $event->id,
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'full_name' => 'Early Registrant',
            'consent_accepted_at' => now(),
            'consent_ip' => '203.0.113.10',
        ])->save();
    }

    private function platformSuperAdminFor(Team $workspace): User
    {
        /** @var User $user */
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'current_team_id' => $workspace->id,
        ]);

        $workspace->users()->attach($user, ['role' => UserRole::SYSTEM_ADMIN->value]);

        /** @var User $fresh */
        $fresh = $user->fresh(['currentTeam']);

        return $fresh;
    }
}
