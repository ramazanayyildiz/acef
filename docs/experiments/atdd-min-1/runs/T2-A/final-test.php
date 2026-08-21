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
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T2 ATDD — shared event page shell adopted by a new and an existing page.
 *
 * The shell is asserted through its rendered contract (shell root, title region,
 * actions region) rather than through class/file names, so any implementation
 * that genuinely renders both pages through one shared component passes.
 *
 * Fails on HEAD: there is no shared shell contract in the rendered output and no
 * `events.overview` route.
 */
#[Group('events')]
class EventPageShellAdoptionTest extends FeatureTestCase
{
    private const SHELL = 'data-testid="event-page-shell"';

    private const SHELL_TITLE = 'data-testid="event-page-shell-title"';

    private const SHELL_ACTIONS = 'data-testid="event-page-shell-actions"';

    private const SETTINGS_TABS = 'data-testid="event-settings-tabs"';

    private const EDIT_TAB = 'data-testid="event-settings-tab-edit-details"';

    /**
     * @return array{0: User, 1: Team}
     */
    private function adminWithTeam(): array
    {
        $user = $this->verifiedUser();
        $team = Team::factory()->create(['user_id' => $user->id]);
        $user->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $user->forceFill(['current_team_id' => $team->id])->save();

        return [$user->fresh(), $team->fresh()];
    }

    private function eventForTeam(Team $team, User $creator, EventState $state = EventState::DRAFT): Event
    {
        $event = Event::factory()
            ->inState($state)
            ->for($team)
            ->create(['created_by' => $creator->id]);

        $landing = new LandingPage(['event_id' => $event->id, 'template' => 'classic']);
        $landing->forceFill(['team_id' => $team->id])->save();

        return $event->fresh();
    }

    /** Literal path so the tests fail on behaviour (404) rather than on route resolution. */
    private function overviewUrl(Event $event): string
    {
        return '/events/'.$event->uuid.'/overview';
    }

    // -------------------------------------------------------------------------
    // AC1 + AC2 — named overview route rendering through the shared shell
    // -------------------------------------------------------------------------

    #[Test]
    public function overview_page_is_reachable_at_the_named_route_and_renders_through_the_shared_shell(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->eventForTeam($team, $admin);

        $this->assertTrue(
            Route::has('events.overview'),
            'A named route events.overview must exist.',
        );
        $this->assertSame(
            $this->overviewUrl($event),
            parse_url(route('events.overview', $event->uuid), PHP_URL_PATH),
            'events.overview must resolve to GET /events/{event:uuid}/overview.',
        );

        $this->actingAs($admin)
            ->get($this->overviewUrl($event))
            ->assertOk()
            ->assertSee(self::SHELL, false)
            ->assertSee(self::SHELL_TITLE, false)
            ->assertSee(self::SHELL_ACTIONS, false)
            ->assertSee(self::SETTINGS_TABS, false);
    }

    // -------------------------------------------------------------------------
    // AC3 — Landing Preview retrofitted onto the same shell, behaviour preserved
    // -------------------------------------------------------------------------

    #[Test]
    public function landing_preview_page_renders_through_the_same_shell_without_losing_its_existing_surface(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->eventForTeam($team, $admin);

        $this->actingAs($admin)
            ->get(route('events.landing.preview', $event->uuid))
            ->assertOk()
            // Same shared shell contract as the overview page.
            ->assertSee(self::SHELL, false)
            ->assertSee(self::SHELL_TITLE, false)
            ->assertSee(self::SHELL_ACTIONS, false)
            ->assertSee(self::SETTINGS_TABS, false)
            // Pre-existing preview behaviour other pages/tests depend on.
            ->assertSee('data-testid="landing-preview-page"', false)
            ->assertSee('data-testid="landing-preview-edit-action"', false)
            ->assertSee('data-testid="landing-preview-publish-action"', false);
    }

    // -------------------------------------------------------------------------
    // AC4 — action availability flows from the shared action model into the shell
    // -------------------------------------------------------------------------

    #[Test]
    public function both_pages_drive_action_visibility_from_the_shared_event_action_model(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $draft = $this->eventForTeam($team, $admin, EventState::DRAFT);
        $published = $this->eventForTeam($team, $admin, EventState::PUBLISHED);

        // DRAFT: the edit action is available, so the shell surfaces it.
        $this->actingAs($admin)
            ->get($this->overviewUrl($draft))
            ->assertOk()
            ->assertSee(self::EDIT_TAB, false);

        // PUBLISHED: the shared action model disables editing. A page that did not
        // pass availability into the shell would fall back to showing it.
        $this->actingAs($admin)
            ->get($this->overviewUrl($published))
            ->assertOk()
            ->assertDontSee(self::EDIT_TAB, false);

        $this->actingAs($admin)
            ->get(route('events.landing.preview', $published->uuid))
            ->assertOk()
            ->assertDontSee(self::EDIT_TAB, false);
    }

    // -------------------------------------------------------------------------
    // AC5 — the overview page is read-only
    // -------------------------------------------------------------------------

    #[Test]
    public function overview_page_exposes_no_state_changing_control(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->eventForTeam($team, $admin);

        $html = $this->actingAs($admin)
            ->get($this->overviewUrl($event))
            ->assertOk()
            ->assertDontSee('wire:submit', false)
            ->getContent();

        $this->assertDoesNotMatchRegularExpression(
            '/<form\b[^>]*action="[^"]*\/events\/'.preg_quote($event->uuid, '/').'/i',
            $html,
            'The read-only overview page must not submit to any event route.',
        );
    }

    // -------------------------------------------------------------------------
    // AC6 — same view authorization as the other event settings surfaces
    // -------------------------------------------------------------------------

    #[Test]
    public function actor_without_view_access_is_refused_from_the_overview_page(): void
    {
        [$admin, $team] = $this->adminWithTeam();
        $event = $this->eventForTeam($team, $admin);

        $billingAdmin = $this->verifiedUser();
        $billingAdmin->teams()->attach($team, ['role' => UserRole::BILLING_ADMIN->value]);
        $billingAdmin->forceFill(['current_team_id' => $team->id])->save();

        [$outsider] = $this->adminWithTeam();

        Cache::flush();

        // Billing Admin lacks events.view.team — same refusal as events.show.
        $this->actingAs($billingAdmin->fresh())
            ->get($this->overviewUrl($event))
            ->assertForbidden();

        // Cross-workspace actor never resolves the event.
        $this->actingAs($outsider)
            ->get($this->overviewUrl($event))
            ->assertNotFound();
    }
}
