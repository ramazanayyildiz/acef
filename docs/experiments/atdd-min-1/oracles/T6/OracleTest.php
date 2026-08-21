<?php

declare(strict_types=1);

namespace Tests\Feature\AtddOracle;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Support\EventAuditEvents;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Independent behavioural checks for the platform-admin "revert a published
 * event back to draft" capability.
 *
 * Everything here binds only to seams that already exist in the application:
 * the named platform-admin route, the persisted `events.state` column, the
 * `activity_log` audit table written by the guarded transition path, the
 * `EventState` enum's public API, and the route-permission configuration.
 */
class OracleTest extends FeatureTestCase
{
    private const ROUTE_NAME = 'admin.events.revert-to-draft';

    // ------------------------------------------------------------------
    // AC2 — reverting a PUBLISHED event with no registrations
    // ------------------------------------------------------------------

    #[Test]
    public function platform_admin_reverts_a_published_event_without_registrations_to_draft(): void
    {
        $organiser = $this->workspace();
        $event = $this->publishedEvent($organiser);
        $admin = $this->platformAdmin();

        $this->revertAs($admin, $event);

        $this->assertSame(
            EventState::DRAFT->value,
            $this->persistedState($event),
            'A PUBLISHED event with no registrations must be back in DRAFT after a platform-admin revert.',
        );
    }

    #[Test]
    public function revert_records_the_lifecycle_transition_through_the_audited_path(): void
    {
        $organiser = $this->workspace();
        $event = $this->publishedEvent($organiser);
        $admin = $this->platformAdmin();

        $this->revertAs($admin, $event);

        $this->assertSame(
            EventState::DRAFT->value,
            $this->persistedState($event),
            'Precondition: the revert must have moved the event to DRAFT.',
        );

        $row = DB::table('activity_log')
            ->where('log_name', EventAuditEvents::EVENT_TRANSITIONED)
            ->where('subject_type', Event::class)
            ->where('subject_id', $event->getKey())
            ->orderByDesc('id')
            ->first();

        $this->assertNotNull(
            $row,
            'The revert must be recorded through the guarded transition path, which writes a lifecycle transition audit row.',
        );

        $this->assertSame(
            (string) $admin->getKey(),
            (string) $row->causer_id,
            'The audit row must attribute the revert to the acting platform admin.',
        );

        $properties = json_decode((string) $row->properties, true);
        $this->assertIsArray($properties, 'The transition audit row must carry its properties payload.');

        $this->assertSame(
            EventState::PUBLISHED->value,
            $properties['from'] ?? null,
            'The transition audit row must record PUBLISHED as the state it moved away from.',
        );
        $this->assertSame(
            EventState::DRAFT->value,
            $properties['to'] ?? null,
            'The transition audit row must record DRAFT as the state it moved into.',
        );
    }

    // ------------------------------------------------------------------
    // AC1 — the route itself
    // ------------------------------------------------------------------

    #[Test]
    public function revert_route_is_a_post_route_gated_by_the_route_permission_configuration(): void
    {
        $route = Route::getRoutes()->getByName(self::ROUTE_NAME);

        $this->assertNotNull($route, 'A named route "'.self::ROUTE_NAME.'" must be registered.');

        $methods = $route->methods();

        $this->assertContains('POST', $methods, 'The revert route must accept POST.');
        $this->assertNotContains(
            'GET',
            $methods,
            'A state-changing revert must not be reachable with a safe GET request.',
        );

        $mappings = (array) config('route_permissions.routes', []);

        $this->assertArrayHasKey(
            self::ROUTE_NAME,
            $mappings,
            'The revert route must be declared in the route-permission configuration.',
        );

        $requirement = $mappings[self::ROUTE_NAME];

        $this->assertIsString(
            $requirement,
            'The revert route must require a capability, not merely authentication.',
        );
        $this->assertNotSame(
            '__public__',
            $requirement,
            'The revert route must not be publicly reachable.',
        );
        $this->assertNotSame(
            '',
            trim($requirement),
            'The revert route must map to a non-empty capability requirement.',
        );
    }

    #[Test]
    public function revert_is_refused_for_a_workspace_admin_of_the_owning_workspace(): void
    {
        $organiser = $this->workspace();
        $event = $this->publishedEvent($organiser);
        $workspaceAdmin = $this->member($organiser, UserRole::ADMIN);

        $response = $this->revertAs($workspaceAdmin, $event);

        $this->assertSame(
            EventState::PUBLISHED->value,
            $this->persistedState($event),
            'A workspace-level admin must not be able to drive the platform-admin revert action.',
        );

        $response->assertForbidden();
    }

    #[Test]
    public function revert_is_refused_for_an_unauthenticated_visitor(): void
    {
        $organiser = $this->workspace();
        $event = $this->publishedEvent($organiser);

        $response = $this->post($this->revertUrl($event), ['reason' => 'Published by mistake']);

        $this->assertTrue(
            $response->getStatusCode() >= 300,
            'An unauthenticated revert attempt must not succeed (got HTTP '.$response->getStatusCode().').',
        );

        $this->assertSame(
            EventState::PUBLISHED->value,
            $this->persistedState($event),
            'An unauthenticated revert attempt must leave the event PUBLISHED.',
        );
    }

    // ------------------------------------------------------------------
    // AC3 / AC4 / AC5 — refusals
    // ------------------------------------------------------------------

    #[Test]
    public function revert_is_refused_for_events_that_are_not_published(): void
    {
        $admin = $this->platformAdmin();

        foreach (EventState::cases() as $state) {
            if ($state === EventState::PUBLISHED) {
                continue;
            }

            $organiser = $this->workspace();
            $event = Event::factory()->for($organiser)->inState($state)->create();

            $this->revertAs($admin, $event);

            $this->assertSame(
                $state->value,
                $this->persistedState($event),
                "An event in state {$state->value} must not be moved by the revert action.",
            );
        }
    }

    #[Test]
    public function revert_is_refused_when_the_event_already_has_registrations(): void
    {
        $organiser = $this->workspace();
        $event = $this->publishedEvent($organiser);
        $this->registerAttendee($event);
        $admin = $this->platformAdmin();

        $this->revertAs($admin, $event);

        $this->assertSame(
            EventState::PUBLISHED->value,
            $this->persistedState($event),
            'An event that already has registrations must stay PUBLISHED.',
        );

        $this->assertDatabaseMissing('activity_log', [
            'log_name' => EventAuditEvents::EVENT_TRANSITIONED,
            'subject_type' => Event::class,
            'subject_id' => $event->getKey(),
        ]);
    }

    #[Test]
    public function cancelled_published_event_cannot_be_reverted(): void
    {
        $organiser = $this->workspace();
        $event = Event::factory()
            ->for($organiser)
            ->inState(EventState::PUBLISHED)
            ->cancelled()
            ->create();
        $admin = $this->platformAdmin();

        $this->revertAs($admin, $event);

        $this->assertSame(
            EventState::PUBLISHED->value,
            $this->persistedState($event),
            'Cancellation must keep winning over lifecycle moves: a cancelled event must not be reverted.',
        );

        $this->assertNotNull(
            DB::table('events')->where('id', $event->getKey())->value('cancelled_at'),
            'The revert attempt must not clear the cancellation flag.',
        );

        $this->assertDatabaseMissing('activity_log', [
            'log_name' => EventAuditEvents::EVENT_TRANSITIONED,
            'subject_type' => Event::class,
            'subject_id' => $event->getKey(),
        ]);
    }

    // ------------------------------------------------------------------
    // AC6 — the rest of the state machine is untouched
    // ------------------------------------------------------------------

    #[Test]
    public function legal_transition_table_gains_only_the_published_to_draft_edge(): void
    {
        $expected = [
            'draft' => ['published', 'suspended', 'failed'],
            'published' => ['preparing', 'suspended', 'failed', 'draft'],
            'preparing' => ['ready', 'failed', 'suspended'],
            'ready' => ['live', 'failed', 'suspended'],
            'live' => ['ended', 'failed', 'suspended', 'ready'],
            'ended' => ['failed', 'suspended'],
            'failed' => ['preparing', 'suspended'],
            'suspended' => [],
        ];

        foreach (EventState::cases() as $from) {
            foreach (EventState::cases() as $to) {
                $legal = in_array($to->value, $expected[$from->value], true);

                $this->assertSame(
                    $legal,
                    $from->canTransitionTo($to),
                    "Edge {$from->value} -> {$to->value} must be ".($legal ? 'legal' : 'illegal').'.',
                );
            }
        }
    }

    #[Test]
    public function state_derived_rules_keep_their_existing_answers(): void
    {
        // [metadata locked, blocks registration, live operable, ended,
        //  publicly hidden, indexable when live, registrant viewer mode,
        //  public shell when live, suspendable from]
        $expected = [
            'draft' => [false, true, false, false, true, false, null, 'landing', true],
            'published' => [true, false, false, false, false, true, 'registered', 'landing', true],
            'preparing' => [true, false, false, false, false, true, 'registered', 'landing', true],
            'ready' => [true, false, true, false, false, true, 'registered', 'landing', true],
            'live' => [true, false, true, false, false, true, 'live', 'landing', true],
            'ended' => [true, true, false, true, false, true, 'ended', 'landing', true],
            'failed' => [true, true, false, false, true, false, null, 'landing', true],
            'suspended' => [true, true, false, false, false, false, null, 'suspended', false],
        ];

        foreach (EventState::cases() as $state) {
            [
                $metadataLocked,
                $blocksRegistration,
                $liveOperable,
                $ended,
                $publiclyHidden,
                $indexable,
                $viewerMode,
                $shell,
                $suspendable,
            ] = $expected[$state->value];

            $this->assertSame($metadataLocked, $state->isMetadataLocked(), "{$state->value}: metadata lock changed.");
            $this->assertSame($blocksRegistration, $state->blocksRegistration(), "{$state->value}: registration blocking changed.");
            $this->assertSame($liveOperable, $state->isLiveOperable(), "{$state->value}: live-operability changed.");
            $this->assertSame($ended, $state->isEnded(), "{$state->value}: terminal-ended answer changed.");
            $this->assertSame($publiclyHidden, $state->isPubliclyHidden(), "{$state->value}: public hiding changed.");
            $this->assertSame($indexable, $state->isPubliclyIndexable(false), "{$state->value}: public indexability changed.");
            $this->assertSame($viewerMode, $state->registrantViewerMode(), "{$state->value}: registrant viewer mode changed.");
            $this->assertSame($shell, $state->publicShell(false), "{$state->value}: public shell changed.");
            $this->assertSame($suspendable, $state->canBeSuspendedFrom(), "{$state->value}: suspendability changed.");

            $this->assertFalse(
                $state->isPubliclyIndexable(true),
                "{$state->value}: a cancelled event must never be publicly indexable.",
            );
            $this->assertSame(
                'cancelled',
                $state->publicShell(true),
                "{$state->value}: a cancelled event must render the cancelled shell.",
            );
        }
    }

    // ------------------------------------------------------------------
    // Fixtures
    // ------------------------------------------------------------------

    private function workspace(): Team
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);

        /** @var Team $team */
        $team = Team::factory()->create(['user_id' => $owner->getKey()]);
        $team->users()->attach($owner, ['role' => UserRole::ADMIN->value]);
        $owner->forceFill(['current_team_id' => $team->getKey()])->save();

        return $team->fresh();
    }

    /**
     * A platform administrator whose own workspace is deliberately NOT the
     * workspace that owns the event under test — that is the real support
     * scenario this capability exists for.
     */
    private function platformAdmin(): User
    {
        $home = $this->workspace();

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'current_team_id' => $home->getKey(),
        ]);
        $home->users()->attach($user, ['role' => UserRole::SYSTEM_ADMIN->value]);

        return $user->fresh(['currentTeam']);
    }

    private function member(Team $team, UserRole $role): User
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'current_team_id' => $team->getKey(),
        ]);
        $team->users()->attach($user, ['role' => $role->value]);

        return $user->fresh(['currentTeam']);
    }

    private function publishedEvent(Team $team): Event
    {
        return Event::factory()
            ->for($team)
            ->inState(EventState::PUBLISHED)
            ->withLanding()
            ->create();
    }

    private function registerAttendee(Event $event): void
    {
        $email = 'registrant-'.Str::uuid()->toString().'@example.com';

        DB::table('registrations')->insert([
            'uuid' => (string) Str::uuid(),
            'team_id' => $event->team_id,
            'event_id' => $event->getKey(),
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'full_name' => 'Registered Attendee',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function revertUrl(Event $event): string
    {
        return route(self::ROUTE_NAME, $event->uuid);
    }

    private function revertAs(User $actor, Event $event): TestResponse
    {
        return $this->actingAs($actor)->post($this->revertUrl($event), [
            'reason' => 'Published by mistake',
        ]);
    }

    private function persistedState(Event $event): string
    {
        return (string) DB::table('events')->where('id', $event->getKey())->value('state');
    }
}
