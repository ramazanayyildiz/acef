<?php

declare(strict_types=1);

namespace Tests\Feature\AtddOracle;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Enums\RegistrationSource;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use App\Modules\Events\Support\EventActionAvailability;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Platform\Authz\Core\RequestCacheService;
use Tests\Feature\FeatureTestCase;

/**
 * Behavioural checks for the event duplication surface.
 *
 * Binds only to seams that already exist in the application: the named route
 * `events.duplicate`, the shared action model `EventActionAvailability::for()`,
 * the `events.*` capability vocabulary, and persisted event / registration
 * state. No assertions on copy, markup, class names or file layout.
 */
class OracleTest extends FeatureTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->flushPermissionCaches();
    }

    // ------------------------------------------------------------------
    // Endpoint authorization (independent of what the UI rendered)
    // ------------------------------------------------------------------

    #[Test]
    public function endpoint_refuses_actor_without_the_event_create_capability(): void
    {
        [$owner, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $owner);

        $actor = $this->memberOf($team, UserRole::CO_HOST);
        $this->revokeCapability(UserRole::CO_HOST, 'events.create.team');

        $actor = $actor->fresh();
        $this->assertTrue(
            $actor->hasTeamPermission($team, 'events.view.team'),
            'Fixture precondition: the actor must still be able to view events in the workspace.'
        );
        $this->assertFalse(
            $actor->hasTeamPermission($team, 'events.create.team'),
            'Fixture precondition: the actor must NOT hold the event-create capability.'
        );

        $before = $this->eventCount();
        $response = $this->actingAs($actor)->post($this->duplicateUrl($source));

        $this->assertSame(
            $before,
            $this->eventCount(),
            'An actor without the event-create capability must not be able to create an event through duplication.'
        );
        $this->assertRefused($response);
    }

    #[Test]
    public function endpoint_refuses_actor_who_cannot_view_the_source_event(): void
    {
        [$owner, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $owner);

        $actor = $this->memberOf($team, UserRole::CO_HOST);
        $this->revokeCapability(UserRole::CO_HOST, 'events.view.team');

        $actor = $actor->fresh();
        $this->assertTrue(
            $actor->hasTeamPermission($team, 'events.create.team'),
            'Fixture precondition: the actor must still hold the event-create capability.'
        );
        $this->assertForbidden(
            $this->actingAs($actor)->get(route('events.show', $source->uuid)),
        );

        $before = $this->eventCount();
        $response = $this->actingAs($actor)->post($this->duplicateUrl($source));

        $this->assertSame(
            $before,
            $this->eventCount(),
            'An actor who cannot view the source event must not be able to duplicate it.'
        );
        $this->assertRefused($response);
    }

    #[Test]
    public function endpoint_refuses_actor_from_another_workspace(): void
    {
        [$owner, $sourceTeam] = $this->workspaceWithAdmin();
        $source = $this->eventFor($sourceTeam, $owner);

        [$outsider, $outsiderTeam] = $this->workspaceWithAdmin();

        $this->assertTrue(
            $outsider->hasTeamPermission($outsiderTeam, 'events.create.team'),
            'Fixture precondition: the outsider holds event-create in their own workspace only.'
        );

        $before = $this->eventCount();
        $response = $this->actingAs($outsider)->post($this->duplicateUrl($source));

        $this->assertSame(
            $before,
            $this->eventCount(),
            'An actor outside the source workspace must not be able to duplicate its events.'
        );
        $this->assertSame(
            0,
            Event::withoutGlobalScopes()->where('team_id', $outsiderTeam->getKey())->count(),
            'No copy of a foreign workspace event may land in the outsider workspace.'
        );
        $this->assertRefused($response);
    }

    // ------------------------------------------------------------------
    // Shared action model
    // ------------------------------------------------------------------

    #[Test]
    public function action_model_exposes_a_duplicate_entry_for_a_capable_actor(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $admin);

        $actions = app(EventActionAvailability::class)->for($admin, $source);

        $this->assertArrayHasKey(
            'duplicate',
            $actions,
            'The shared event action model must expose a duplicate entry.'
        );
        $this->assertIsArray($actions['duplicate']);
        $this->assertArrayHasKey('visible', $actions['duplicate']);
        $this->assertArrayHasKey('enabled', $actions['duplicate']);
        $this->assertIsBool($actions['duplicate']['visible'], 'duplicate.visible must be a boolean.');
        $this->assertIsBool($actions['duplicate']['enabled'], 'duplicate.enabled must be a boolean.');
        $this->assertTrue(
            $actions['duplicate']['visible'],
            'A workspace admin holding the event-create capability must see the duplicate action.'
        );
        $this->assertTrue(
            $actions['duplicate']['enabled'],
            'A workspace admin holding the event-create capability must be able to use the duplicate action.'
        );
    }

    #[Test]
    public function action_model_hides_duplicate_from_actor_without_the_event_create_capability(): void
    {
        [$owner, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $owner);

        $actor = $this->memberOf($team, UserRole::CO_HOST);
        $this->revokeCapability(UserRole::CO_HOST, 'events.create.team');

        $actor = $actor->fresh();
        $this->assertTrue(
            $actor->hasTeamPermission($team, 'events.view.team'),
            'Fixture precondition: the actor must still be able to view events in the workspace.'
        );

        $actions = app(EventActionAvailability::class)->for($actor, $source);

        $this->assertArrayHasKey('duplicate', $actions);
        $this->assertFalse(
            $actions['duplicate']['visible'],
            'The duplicate action must not be offered to an actor without the event-create capability.'
        );
        $this->assertFalse(
            $actions['duplicate']['enabled'],
            'The duplicate action must not be enabled for an actor without the event-create capability.'
        );
    }

    #[Test]
    public function action_model_hides_duplicate_from_actor_outside_the_events_workspace(): void
    {
        [$owner, $sourceTeam] = $this->workspaceWithAdmin();
        $source = $this->eventFor($sourceTeam, $owner);

        [$outsider] = $this->workspaceWithAdmin();

        $actions = app(EventActionAvailability::class)->for($outsider, $source);

        $this->assertArrayHasKey('duplicate', $actions);
        $this->assertFalse(
            $actions['duplicate']['visible'],
            'The duplicate action must not be offered for an event the actor cannot view.'
        );
        $this->assertFalse(
            $actions['duplicate']['enabled'],
            'The duplicate action must not be enabled for an event the actor cannot view.'
        );
    }

    // ------------------------------------------------------------------
    // What a successful duplication produces
    // ------------------------------------------------------------------

    #[Test]
    public function duplicate_creates_exactly_one_draft_event_in_the_actors_current_workspace(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $admin, EventState::PUBLISHED);

        $response = $this->actingAs($admin)->post($this->duplicateUrl($source));

        $this->assertAccepted($response);
        $this->assertSame(
            2,
            $this->eventCount(),
            'Duplication must create exactly one new event.'
        );

        $copy = $this->copyOf($source);
        $this->assertNotSame($source->uuid, $copy->uuid, 'The copy must carry its own uuid.');
        $this->assertSame(EventState::DRAFT, $copy->state, 'The copy must be created as a DRAFT.');
        $this->assertSame(
            $team->getKey(),
            $copy->team_id,
            "The copy must belong to the acting user's current workspace."
        );

        $freshSource = Event::withoutGlobalScopes()->findOrFail($source->getKey());
        $this->assertSame(EventState::PUBLISHED, $freshSource->state, 'The source event must be left untouched.');
        $this->assertSame($source->title, $freshSource->title, 'The source event must be left untouched.');
    }

    #[Test]
    public function duplicate_of_a_finished_event_does_not_inherit_its_lifecycle_state(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $admin, EventState::ENDED);

        $response = $this->actingAs($admin)->post($this->duplicateUrl($source));

        $this->assertAccepted($response);

        $copy = $this->copyOf($source);
        $this->assertSame(
            EventState::DRAFT,
            $copy->state,
            'A duplicate must start in DRAFT and never inherit the lifecycle state of its source.'
        );
    }

    #[Test]
    public function duplicate_of_a_cancelled_event_does_not_inherit_the_cancellation(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $admin, EventState::PUBLISHED, [
            'cancelled_at' => now()->subDay(),
            'cancelled_by' => $admin->getKey(),
            'cancel_reason' => 'Speaker emergency',
        ]);

        $response = $this->actingAs($admin)->post($this->duplicateUrl($source));

        $this->assertAccepted($response);

        $copy = $this->copyOf($source);
        $this->assertNull($copy->cancelled_at, 'A duplicate must not inherit the cancellation of its source.');
        $this->assertNull($copy->cancelled_by, 'A duplicate must not inherit the cancellation of its source.');
        $this->assertNull($copy->cancel_reason, 'A duplicate must not inherit the cancellation of its source.');
    }

    #[Test]
    public function duplicate_does_not_copy_registrations_from_the_source_event(): void
    {
        [$admin, $team] = $this->workspaceWithAdmin();
        $source = $this->eventFor($team, $admin, EventState::ENDED);
        $this->registerAttendee($source, 'first.attendee@example.com');
        $this->registerAttendee($source, 'second.attendee@example.com');

        $response = $this->actingAs($admin)->post($this->duplicateUrl($source));

        $this->assertAccepted($response);

        $copy = $this->copyOf($source);
        $this->assertSame(
            0,
            Registration::withoutGlobalScopes()->where('event_id', $copy->getKey())->count(),
            'A duplicate must start with no registrations of its own.'
        );
        $this->assertSame(
            2,
            Registration::withoutGlobalScopes()->count(),
            'Duplication must not clone the registrant records of the source event.'
        );
    }

    // ------------------------------------------------------------------
    // Fixtures / helpers
    // ------------------------------------------------------------------

    /**
     * @return array{0: User, 1: Team}
     */
    private function workspaceWithAdmin(): array
    {
        $admin = User::factory()->create(['email_verified_at' => now()]);
        $team = Team::factory()->create(['user_id' => $admin->getKey()]);
        $admin->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $admin->forceFill(['current_team_id' => $team->getKey()])->save();

        return [$admin->fresh(), $team->fresh()];
    }

    private function memberOf(Team $team, UserRole $role): User
    {
        $member = User::factory()->create(['email_verified_at' => now()]);
        $member->teams()->attach($team, ['role' => $role->value]);
        $member->forceFill(['current_team_id' => $team->getKey()])->save();

        return $member->fresh();
    }

    /**
     * Remove a seeded capability from a role so an actor can be built that
     * holds one half of the events.* vocabulary but not the other.
     */
    private function revokeCapability(UserRole $role, string $capability): void
    {
        [$resource, $action, $scope] = explode('.', $capability);

        $roleId = Role::query()->where('key', $role->value)->value('id');
        $this->assertNotNull($roleId, "Fixture precondition: role {$role->value} must exist.");

        $removed = RolePermission::query()
            ->where('role_id', $roleId)
            ->where('resource', $resource)
            ->where('action', $action)
            ->where('scope', $scope)
            ->forceDelete();

        $this->assertGreaterThan(
            0,
            $removed,
            "Fixture precondition: role {$role->value} must be seeded with {$capability}."
        );

        $this->flushPermissionCaches();
    }

    private function flushPermissionCaches(): void
    {
        Cache::flush();
        RequestCacheService::flush();
    }

    /** @param array<string, mixed> $attributes */
    private function eventFor(Team $team, User $creator, EventState $state = EventState::DRAFT, array $attributes = []): Event
    {
        return Event::factory()
            ->inState($state)
            ->for($team)
            ->create(array_merge(['created_by' => $creator->getKey()], $attributes));
    }

    private function registerAttendee(Event $event, string $email): void
    {
        Registration::query()->forceCreate([
            'uuid' => (string) Str::uuid(),
            'team_id' => $event->team_id,
            'event_id' => $event->getKey(),
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'source' => RegistrationSource::DIRECT->value,
            'full_name' => 'Registered Attendee',
            'consent_accepted_at' => now()->subDay(),
            'consent_ip' => '127.0.0.1',
            'consent_version' => 'oracle',
        ]);
    }

    private function duplicateUrl(Event $event): string
    {
        return route('events.duplicate', $event->uuid);
    }

    private function eventCount(): int
    {
        return Event::withoutGlobalScopes()->count();
    }

    private function copyOf(Event $source): Event
    {
        $copies = Event::withoutGlobalScopes()
            ->whereKeyNot($source->getKey())
            ->get();

        $this->assertCount(1, $copies, 'Duplication must create exactly one new event.');

        return $copies->first();
    }

    private function assertRefused(TestResponse $response): void
    {
        $status = $response->getStatusCode();

        $this->assertTrue(
            $status < 200 || $status >= 300,
            "Duplication was expected to be refused, but the endpoint answered with HTTP {$status}."
        );
    }

    private function assertForbidden(TestResponse $response): void
    {
        $this->assertSame(
            403,
            $response->getStatusCode(),
            'Fixture precondition: the actor must be unable to view the source event.'
        );
    }

    private function assertAccepted(TestResponse $response): void
    {
        $status = $response->getStatusCode();

        $this->assertTrue(
            $status < 400,
            "Duplication was expected to succeed, but the endpoint answered with HTTP {$status}."
        );
    }
}
