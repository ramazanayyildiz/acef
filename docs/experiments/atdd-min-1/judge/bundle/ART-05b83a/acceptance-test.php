<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Enums\RegistrationSource;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Activitylog\Models\Activity;
use Tests\Feature\FeatureTestCase;
use Tests\Feature\SuperAdmin\Support\InteractsWithSuperAdmin;

/**
 * Capsule T6 ATDD — platform-admin revert of a PUBLISHED event back to DRAFT.
 *
 * Asserts the observable contract only: HTTP outcome, persisted state, the
 * audit row the guarded transition path writes, and the canonical
 * legal-transition table the rest of the domain reads.
 */
#[Group('events')]
class AdminRevertToDraftTest extends FeatureTestCase
{
    use InteractsWithSuperAdmin;

    // ---------------------------------------------------------------------
    // AC1 + AC2 — the action exists, is capability-gated, and goes through
    // the guarded transition path (audit record included).
    // ---------------------------------------------------------------------

    #[Test]
    public function platform_admin_reverts_published_event_to_draft_and_records_the_transition(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, EventState::PUBLISHED);
        $platformAdmin = $this->createPlatformSuperAdmin($workspace);

        $this->actingAs($platformAdmin)
            ->postJson(route('admin.events.revert-to-draft', $event->uuid))
            ->assertOk()
            ->assertJsonPath('data.state', EventState::DRAFT->value);

        $this->assertSame(EventState::DRAFT, $event->refresh()->state);

        $activity = Activity::query()
            ->where('log_name', 'event.transitioned')
            ->where('subject_type', Event::class)
            ->where('subject_id', $event->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertSame($platformAdmin->id, (int) $activity->causer_id);
        $this->assertSame(EventState::PUBLISHED->value, data_get($activity->properties, 'from'));
        $this->assertSame(EventState::DRAFT->value, data_get($activity->properties, 'to'));
    }

    #[Test]
    public function revert_route_is_capability_gated_through_route_permission_config(): void
    {
        $this->assertArrayHasKey(
            'admin.events.revert-to-draft',
            config('route_permissions.routes'),
            'The revert route must be declared in the route-permission configuration.',
        );

        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, EventState::PUBLISHED);
        $workspaceAdmin = $this->createWorkspaceMember($workspace, UserRole::ADMIN);

        $this->actingAs($workspaceAdmin)
            ->postJson(route('admin.events.revert-to-draft', $event->uuid))
            ->assertForbidden();

        $this->assertSame(EventState::PUBLISHED, $event->refresh()->state);
    }

    // ---------------------------------------------------------------------
    // AC3 — only a PUBLISHED event may be reverted.
    // ---------------------------------------------------------------------

    /** @return iterable<string, array{0: EventState}> */
    public static function nonPublishedStateProvider(): iterable
    {
        yield 'draft' => [EventState::DRAFT];
        yield 'preparing' => [EventState::PREPARING];
    }

    #[Test]
    #[DataProvider('nonPublishedStateProvider')]
    public function revert_is_refused_when_the_event_is_not_published(EventState $state): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, $state);
        $platformAdmin = $this->createPlatformSuperAdmin($workspace);

        $response = $this->actingAs($platformAdmin)
            ->postJson(route('admin.events.revert-to-draft', $event->uuid));

        $this->assertRefused($response, $event, $state);
    }

    // ---------------------------------------------------------------------
    // AC4 — registrations block the revert.
    // ---------------------------------------------------------------------

    #[Test]
    public function revert_is_refused_when_the_event_has_registrations(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, EventState::PUBLISHED);
        $this->registerAttendee($event);
        $platformAdmin = $this->createPlatformSuperAdmin($workspace);

        $response = $this->actingAs($platformAdmin)
            ->postJson(route('admin.events.revert-to-draft', $event->uuid));

        $this->assertRefused($response, $event, EventState::PUBLISHED);
    }

    // ---------------------------------------------------------------------
    // AC5 — cancellation keeps winning over lifecycle moves.
    // ---------------------------------------------------------------------

    #[Test]
    public function revert_is_refused_for_a_cancelled_event(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, EventState::PUBLISHED, cancelled: true);
        $platformAdmin = $this->createPlatformSuperAdmin($workspace);

        $response = $this->actingAs($platformAdmin)
            ->postJson(route('admin.events.revert-to-draft', $event->uuid));

        $this->assertRefused($response, $event, EventState::PUBLISHED);
        $this->assertNotNull($event->refresh()->cancelled_at);
    }

    // ---------------------------------------------------------------------
    // AC6 — the canonical table gains exactly one edge and nothing else, and
    // the state-derived rules other code reads keep their answers.
    // ---------------------------------------------------------------------

    #[Test]
    public function canonical_transition_table_gains_only_the_published_to_draft_edge(): void
    {
        $expected = [
            'draft' => [EventState::PUBLISHED, EventState::SUSPENDED, EventState::FAILED],
            // PUBLISHED -> DRAFT is the single edge this capsule introduces.
            'published' => [EventState::PREPARING, EventState::SUSPENDED, EventState::FAILED, EventState::DRAFT],
            'preparing' => [EventState::READY, EventState::FAILED, EventState::SUSPENDED],
            'ready' => [EventState::LIVE, EventState::FAILED, EventState::SUSPENDED],
            'live' => [EventState::ENDED, EventState::FAILED, EventState::SUSPENDED, EventState::READY],
            'ended' => [EventState::FAILED, EventState::SUSPENDED],
            'failed' => [EventState::PREPARING, EventState::SUSPENDED],
            'suspended' => [],
        ];

        foreach (EventState::cases() as $from) {
            foreach (EventState::cases() as $to) {
                $legal = in_array($to, $expected[$from->value], strict: true);

                $this->assertSame(
                    $legal,
                    $from->canTransitionTo($to),
                    "Edge {$from->value} -> {$to->value} must be ".($legal ? 'legal' : 'illegal').'.',
                );
            }
        }

        foreach (EventState::cases() as $state) {
            $this->assertSame(
                $state !== EventState::DRAFT,
                $state->isMetadataLocked(),
                "isMetadataLocked() changed for {$state->value}.",
            );

            $this->assertSame(
                in_array($state, [
                    EventState::DRAFT,
                    EventState::ENDED,
                    EventState::FAILED,
                    EventState::SUSPENDED,
                ], strict: true),
                $state->blocksRegistration(),
                "blocksRegistration() changed for {$state->value}.",
            );
        }
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private function eventFor(Team $workspace, EventState $state, bool $cancelled = false): Event
    {
        /** @var User $owner */
        $owner = $workspace->owner;

        $factory = Event::factory()->inState($state)->for($workspace);

        if ($cancelled) {
            $factory = $factory->cancelled();
        }

        return $factory->create(['created_by' => $owner->id]);
    }

    private function registerAttendee(Event $event): Registration
    {
        $email = 'registrant@example.test';

        return Registration::unguarded(fn (): Registration => Registration::query()->create([
            'team_id' => $event->team_id,
            'event_id' => $event->id,
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'source' => RegistrationSource::DIRECT->value,
            'full_name' => 'Existing Registrant',
            'consent_accepted_at' => now(),
        ]));
    }

    /**
     * A refusal is observable as a client error that leaves the stored
     * lifecycle state untouched.
     */
    private function assertRefused(TestResponse $response, Event $event, EventState $expected): void
    {
        $status = $response->status();

        $this->assertTrue(
            $status >= 400 && $status < 500,
            "Expected the revert to be refused with a client error, got HTTP {$status}.",
        );

        $this->assertSame(
            $expected,
            $event->refresh()->state,
            'A refused revert must leave the event state unchanged.',
        );
    }
}
