<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use App\Modules\Events\Support\EventActionAvailability;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route as RouteFacade;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T1 ATDD — Duplicate an event.
 *
 * The duplicate action must live in the shared event action model AND stand on
 * its own authorization: hiding the button is never the control that stops a
 * request.
 */
#[Group('events')]
#[Group('p0')]
class EventDuplicateActionTest extends FeatureTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // PermissionCacheService keys by user id; RefreshDatabase recycles ids
        // across tests, so a stale entry can grant a capability the current
        // fixture never had.
        Cache::flush();
    }

    /** @return array{0: User, 1: Team} */
    private function adminWithTeam(): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $team = Team::factory()->create(['user_id' => $user->id]);
        $user->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $user->forceFill(['current_team_id' => $team->id])->save();

        return [$user->fresh(), $team->fresh()];
    }

    /**
     * A member who may view the team's events but holds no create capability.
     */
    private function viewOnlyMemberOf(Team $team, string $roleKey): User
    {
        $role = Role::query()->create([
            'name' => 'Event View Only',
            'key' => $roleKey,
            'description' => 'Test-only role: event read access, no create capability.',
            'is_system_role' => false,
            'is_system_admin' => false,
        ]);
        $role->assignPermission('events.view.team');

        $viewer = User::factory()->create(['email_verified_at' => now()]);
        $viewer->teams()->attach($team, ['role' => $role->key]);
        $viewer->forceFill(['current_team_id' => $team->id])->save();

        return $viewer->fresh();
    }

    private function sourceEvent(Team $team, User $creator): Event
    {
        return Event::factory()
            ->inState(EventState::PUBLISHED)
            ->for($team)
            ->create(['created_by' => $creator->id]);
    }

    private function addRegistration(Event $event, string $email): void
    {
        (new Registration)->forceFill([
            'team_id' => $event->team_id,
            'event_id' => $event->id,
            'email' => $email,
            'email_hash' => hash('sha256', strtolower($email)),
            'full_name' => 'Prior Registrant',
        ])->save();
    }

    private function eventRowCount(): int
    {
        return Event::query()->withoutGlobalScopes()->count();
    }

    // -------------------------------------------------------------------------
    // AC1 — named POST route on the event-scoped path, served by the module
    // -------------------------------------------------------------------------

    #[Test]
    public function duplicate_route_is_a_named_post_route_on_the_event_uuid_path(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->sourceEvent($team, $admin);

        $this->assertSame(
            url("/events/{$event->uuid}/duplicate"),
            route('events.duplicate', $event),
        );

        $route = RouteFacade::getRoutes()->getByName('events.duplicate');
        $this->assertNotNull($route);
        $this->assertContains('POST', $route->methods());
        $this->assertStringStartsWith('App\\Modules\\Events\\', $route->getActionName());
    }

    // -------------------------------------------------------------------------
    // AC2 + AC3 — action model entry, shaped like its neighbours
    // -------------------------------------------------------------------------

    #[Test]
    public function action_model_exposes_an_enabled_duplicate_entry_for_a_capable_actor(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->sourceEvent($team, $admin);

        $actions = app(EventActionAvailability::class)->for($admin, $event);

        $this->assertArrayHasKey('duplicate', $actions);
        $this->assertSame(
            array_keys($actions['edit']),
            array_keys($actions['duplicate']),
            'duplicate entry must match the shape of the existing action entries',
        );
        $this->assertTrue($actions['duplicate']['visible']);
        $this->assertTrue($actions['duplicate']['enabled']);
    }

    // -------------------------------------------------------------------------
    // AC3 + AC4 — no create capability: hidden in the model AND refused at the
    // endpoint, with no event row written
    // -------------------------------------------------------------------------

    #[Test]
    public function actor_without_create_capability_gets_no_duplicate_action_and_is_refused(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->sourceEvent($team, $admin);
        $viewer = $this->viewOnlyMemberOf($team, 'event-view-only-duplicate-test');

        $actions = app(EventActionAvailability::class)->for($viewer, $event);

        $this->assertArrayHasKey('duplicate', $actions);
        $this->assertFalse($actions['duplicate']['visible']);
        $this->assertFalse($actions['duplicate']['enabled']);

        $before = $this->eventRowCount();

        $this->actingAs($viewer)
            ->postJson(route('events.duplicate', $event))
            ->assertForbidden();

        $this->assertSame($before, $this->eventRowCount());
    }

    // -------------------------------------------------------------------------
    // AC4 — holds create capability elsewhere, but cannot view this source event
    // -------------------------------------------------------------------------

    #[Test]
    public function actor_who_cannot_view_the_source_event_is_refused_and_creates_nothing(): void
    {
        [$owner, $ownerTeam] = $this->adminWithTeam();
        $event = $this->sourceEvent($ownerTeam, $owner);

        // Full create capability — but in a different workspace.
        [$outsider] = $this->adminWithTeam();

        $before = $this->eventRowCount();

        $response = $this->actingAs($outsider)
            ->postJson(route('events.duplicate', $event));

        $this->assertContains(
            $response->getStatusCode(),
            [403, 404],
            'a cross-team duplicate attempt must be refused',
        );
        $this->assertSame($before, $this->eventRowCount());
    }

    // -------------------------------------------------------------------------
    // AC5 + AC6 — one fresh DRAFT copy, none of the source's lifecycle baggage
    // -------------------------------------------------------------------------

    #[Test]
    public function successful_duplicate_creates_one_fresh_draft_copy_owned_by_the_actors_team(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $source = $this->sourceEvent($team, $admin);
        $source->forceFill([
            'cancelled_at' => now(),
            'cancelled_by' => $admin->id,
            'cancel_reason' => 'Venue lost',
        ])->save();
        $this->addRegistration($source, 'prior@example.test');

        $before = $this->eventRowCount();

        $this->actingAs($admin)
            ->postJson(route('events.duplicate', $source))
            ->assertSuccessful();

        $this->assertSame($before + 1, $this->eventRowCount());

        $copy = Event::query()
            ->withoutGlobalScopes()
            ->whereKeyNot($source->getKey())
            ->sole();

        $this->assertNotSame($source->uuid, $copy->uuid);
        $this->assertSame(EventState::DRAFT, $copy->state);
        $this->assertSame($team->id, $copy->team_id);
        $this->assertNull($copy->cancelled_at);
        $this->assertNull($copy->cancelled_by);
        $this->assertNull($copy->cancel_reason);
        $this->assertSame(
            0,
            Registration::query()->withoutGlobalScopes()->where('event_id', $copy->getKey())->count(),
            'registrations must not be carried over to the duplicate',
        );

        // The source must survive untouched.
        $source->refresh();
        $this->assertSame(EventState::PUBLISHED, $source->state);
        $this->assertNotNull($source->cancelled_at);
    }
}
