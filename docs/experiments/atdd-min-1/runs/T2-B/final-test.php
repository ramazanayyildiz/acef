<?php

declare(strict_types=1);

namespace Tests\Feature\Events;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Facades\Cache;
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Capsule T2 ATDD — shared event page shell adopted by a new page (Event
 * Overview) and an existing one (Landing Preview).
 *
 * Assertions are on the rendered contract (which regions exist and where they
 * are nested), the HTTP outcome, and refusals — never on which Blade file
 * produced the markup.
 */
#[Group('events')]
class EventPageShellAdoptionTest extends FeatureTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // PermissionCacheService keys on user_id + team_id and RefreshDatabase
        // recycles ids across tests.
        Cache::flush();
    }

    /**
     * @return array{0: User, 1: Team, 2: Event}
     */
    private function adminWithEvent(bool $cancelled = false): array
    {
        $admin = User::factory()->create();
        $team = Team::factory()->create(['user_id' => $admin->id]);
        $admin->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $admin->forceFill(['current_team_id' => $team->id])->save();

        $factory = Event::factory()->inState(EventState::DRAFT)->for($team);

        if ($cancelled) {
            $factory = $factory->cancelled();
        }

        $event = $factory->create(['created_by' => $admin->id]);

        return [$admin->fresh(), $team->fresh(), $event->fresh()];
    }

    private function xpath(string $html): DOMXPath
    {
        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML('<?xml encoding="utf-8" ?>'.$html);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return new DOMXPath($document);
    }

    private function element(DOMXPath $xpath, string $testId): ?DOMElement
    {
        $found = $xpath->query(sprintf('//*[@data-testid="%s"]', $testId));

        return $found !== false && $found->length > 0 && $found->item(0) instanceof DOMElement
            ? $found->item(0)
            : null;
    }

    /**
     * The shared shell contract: one root region that itself renders the page
     * title, the event settings tab strip, and an actions region.
     */
    private function assertRendersThroughSharedShell(string $html, string $context): void
    {
        $xpath = $this->xpath($html);
        $shell = $this->element($xpath, 'event-page-shell');

        $this->assertNotNull($shell, $context.': shared event page shell is missing');

        foreach (['event-page-shell-title', 'event-settings-tabs', 'event-page-shell-actions'] as $region) {
            $nested = $xpath->query(sprintf('.//*[@data-testid="%s"]', $region), $shell);

            $this->assertTrue(
                $nested !== false && $nested->length > 0,
                $context.': shared shell does not render the "'.$region.'" region',
            );
        }
    }

    #[Test]
    public function event_overview_page_is_reachable_and_renders_through_the_shared_shell(): void
    {
        [$admin, , $event] = $this->adminWithEvent();

        $this->assertSame(
            '/events/'.$event->uuid.'/overview',
            parse_url(route('events.overview', $event), PHP_URL_PATH),
        );

        $response = $this->actingAs($admin)->get(route('events.overview', $event));

        $response->assertOk();
        $response->assertSee('data-testid="event-overview-page"', false);

        $this->assertRendersThroughSharedShell($response->getContent(), 'events.overview');
    }

    #[Test]
    public function landing_preview_renders_through_the_same_shell_without_losing_its_behaviour(): void
    {
        [$admin, , $event] = $this->adminWithEvent();

        $response = $this->actingAs($admin)->get(route('events.landing.preview', $event));

        $response->assertOk();

        $this->assertRendersThroughSharedShell($response->getContent(), 'events.landing.preview');

        // Behaviour other pages/tests already depend on must survive the retrofit.
        $response->assertSee('data-testid="landing-preview-page"', false);
        $response->assertSee('data-testid="landing-preview-page-menu"', false);
        $response->assertSee('data-testid="landing-preview-edit-action"', false);
        $response->assertSee('data-testid="landing-preview-publish-action"', false);
    }

    #[Test]
    public function shell_action_visibility_follows_the_shared_event_action_model(): void
    {
        // A cancelled event drives manageLanding.visible => false in
        // EventActionAvailability, so every surface fed by that model must drop
        // the landing action without any page-local conditional.
        [$admin, , $cancelledEvent] = $this->adminWithEvent(cancelled: true);

        $overview = $this->actingAs($admin)->get(route('events.overview', $cancelledEvent));
        $overview->assertOk();
        $overview->assertDontSee('data-testid="event-overview-landing-action"', false);

        $preview = $this->actingAs($admin)->get(route('events.landing.preview', $cancelledEvent));
        $preview->assertOk();
        $preview->assertDontSee('data-testid="landing-preview-edit-action"', false);

        // Same shell, same actor, an event whose action model allows the action.
        [$otherAdmin, , $liveEvent] = $this->adminWithEvent();
        Cache::flush();

        $this->actingAs($otherAdmin)
            ->get(route('events.overview', $liveEvent))
            ->assertOk()
            ->assertSee('data-testid="event-overview-landing-action"', false);
    }

    #[Test]
    public function event_overview_page_exposes_no_state_changing_control(): void
    {
        [$admin, , $event] = $this->adminWithEvent();

        $response = $this->actingAs($admin)->get(route('events.overview', $event));
        $response->assertOk();

        $xpath = $this->xpath($response->getContent());
        $page = $this->element($xpath, 'event-overview-page');

        $this->assertNotNull($page, 'event overview page region is missing');

        $mutators = $xpath->query(
            './/form | .//button[not(@type) or @type="submit"] | .//input[@type="submit"]',
            $page,
        );

        $this->assertSame(
            0,
            $mutators === false ? 0 : $mutators->length,
            'event overview page must be read-only (no form submission, no state-changing control)',
        );
    }

    #[Test]
    public function actor_without_event_view_capability_is_refused(): void
    {
        [, $team, $event] = $this->adminWithEvent();

        $billingAdmin = User::factory()->create();
        $billingAdmin->teams()->attach($team, ['role' => UserRole::BILLING_ADMIN->value]);
        $billingAdmin->forceFill(['current_team_id' => $team->id])->save();

        Cache::flush();

        $this->actingAs($billingAdmin->fresh())
            ->get(route('events.overview', $event))
            ->assertForbidden();
    }
}
