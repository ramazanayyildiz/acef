<?php

declare(strict_types=1);

namespace Tests\Feature\AtddOracle;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Tests\Feature\FeatureTestCase;
use Tests\Feature\SuperAdmin\Support\InteractsWithSuperAdmin;

/**
 * Behavioural checks for the platform-admin registration export endpoint.
 *
 * Only public seams are used: the named route, the route-permission map,
 * persisted registrations, HTTP status codes and the delivered payload.
 */
class OracleTest extends FeatureTestCase
{
    use InteractsWithSuperAdmin;

    private const EXPORT_ROUTE = 'admin.events.registrations.export';

    /**
     * The global capability that already governs platform-wide event visibility.
     */
    private const GLOBAL_EVENT_VISIBILITY = 'events.view.global';

    // -------------------------------------------------------------------------
    // Scope of the exported data
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('The export lists the requested event registrations and nothing from another event')]
    public function export_contains_only_the_requested_events_registrations(): void
    {
        $workspace = $this->createWorkspace(['name' => 'Northwind Workspace']);
        $subject = $this->eventFor($workspace, 'Northwind Delivery Review');
        $neighbour = $this->eventFor($workspace, 'Northwind Product Roadmap');

        $wanted = [
            $this->registerAttendee($subject, 'Nadia Osterlund', 'nadia.osterlund@example.test'),
            $this->registerAttendee($subject, 'Priya Vasquez', 'priya.vasquez@example.test'),
        ];
        $unwanted = $this->registerAttendee($neighbour, 'Tomas Lindqvist', 'tomas.lindqvist@example.test');

        $response = $this->actingAs($this->createPlatformSuperAdmin($workspace))
            ->get($this->exportUrl($subject));

        $response->assertOk();

        $csv = $this->payloadOf($response);

        foreach ($wanted as $attendee) {
            $this->assertAttendeeListed($csv, $attendee);
        }

        $this->assertAttendeeAbsent(
            $csv,
            $unwanted,
            'The export must not contain registrations that belong to a different event.',
        );
    }

    #[Test]
    #[TestDox('The export returns the registrations of an event that lives in another workspace')]
    public function export_returns_registrations_for_an_event_in_another_workspace(): void
    {
        $homeWorkspace = $this->createWorkspace(['name' => 'Platform Support Desk']);
        $reportedWorkspace = $this->createWorkspace(['name' => 'Customer Workspace']);

        $reportedEvent = $this->eventFor($reportedWorkspace, 'Customer Quarterly Briefing');
        $attendee = $this->registerAttendee($reportedEvent, 'Ilse Brandhorst', 'ilse.brandhorst@example.test');

        $response = $this->actingAs($this->createPlatformSuperAdmin($homeWorkspace))
            ->get($this->exportUrl($reportedEvent));

        $response->assertOk();

        $this->assertAttendeeListed(
            $this->payloadOf($response),
            $attendee,
            'A platform-wide export must return the registrations of the requested event even when '
            .'the event belongs to a workspace other than the exporting admin current workspace.',
        );
    }

    // -------------------------------------------------------------------------
    // Authorization
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('An admin-area user without the global event-visibility capability is refused')]
    public function admin_area_user_without_global_event_capability_cannot_export(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, 'Restricted Delivery Review');
        $attendee = $this->registerAttendee($event, 'Marika Sunndal', 'marika.sunndal@example.test');

        $actor = $this->adminAreaUserWithoutEventVisibility($workspace);

        // Premise: this user does reach the platform-admin area…
        $this->actingAs($actor)->get(route('admin.dashboard'))->assertOk();

        // …but holds no global event-visibility capability.
        $this->assertFalse(
            Gate::forUser($actor)->allows(self::GLOBAL_EVENT_VISIBILITY),
            'Test premise broken: the actor must not hold '.self::GLOBAL_EVENT_VISIBILITY.'.',
        );

        $response = $this->actingAs($actor)->get($this->exportUrl($event));

        $response->assertForbidden();
        $this->assertNoRegistrationDataDelivered(
            $response,
            [$attendee],
            'Reaching the admin area must not be enough to download attendee personal data.',
        );
    }

    #[Test]
    #[TestDox('A workspace administrator of the owning workspace cannot use the platform export')]
    public function workspace_administrator_cannot_use_the_platform_export(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, 'Workspace Owned Webinar');
        $attendee = $this->registerAttendee($event, 'Corin Ashgrove', 'corin.ashgrove@example.test');

        $member = $this->createWorkspaceMember($workspace, UserRole::ADMIN);

        $response = $this->actingAs($member)->get($this->exportUrl($event));

        $response->assertForbidden();
        $this->assertNoRegistrationDataDelivered(
            $response,
            [$attendee],
            'The platform export requires a global capability; workspace-scoped roles must be refused.',
        );
    }

    #[Test]
    #[TestDox('The export route is capability-mapped and closed to anonymous visitors')]
    public function export_route_is_capability_gated_and_never_public(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, 'Anonymous Probe Webinar');
        $attendee = $this->registerAttendee($event, 'Halvard Ekstrom', 'halvard.ekstrom@example.test');

        $mappings = $this->routePermissionMap();

        $this->assertArrayHasKey(
            self::EXPORT_ROUTE,
            $mappings,
            'The export route must be gated through the route-permission configuration.',
        );
        $this->assertNotNull(
            $mappings[self::EXPORT_ROUTE],
            'The export route must require a capability, not merely authentication.',
        );
        $this->assertNotSame(
            '__public__',
            $mappings[self::EXPORT_ROUTE],
            'The export route must never be public.',
        );

        $response = $this->get($this->exportUrl($event));

        $this->assertContains(
            $response->getStatusCode(),
            [302, 401, 403],
            'An anonymous visitor must be refused the registration export.',
        );
        $this->assertNoRegistrationDataDelivered(
            $response,
            [$attendee],
            'An anonymous visitor must never receive attendee personal data.',
        );
    }

    #[Test]
    #[TestDox('Pre-existing admin routes keep the access they had before the export was added')]
    public function pre_existing_admin_routes_are_not_widened(): void
    {
        $this->assertArrayHasKey(
            self::EXPORT_ROUTE,
            $this->routePermissionMap(),
            'Anchor: the export route must be mapped before its blast radius can be judged.',
        );

        foreach ($this->routePermissionMap() as $routeName => $requirement) {
            if (! str_starts_with((string) $routeName, 'admin.') || $routeName === self::EXPORT_ROUTE) {
                continue;
            }

            $this->assertNotNull(
                $requirement,
                "Route [{$routeName}] lost its capability requirement.",
            );
            $this->assertNotSame(
                '__public__',
                $requirement,
                "Route [{$routeName}] was opened to anonymous visitors.",
            );
        }

        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, 'Untouched Neighbour Webinar');
        $actor = $this->adminAreaUserWithoutEventVisibility($workspace);

        $this->actingAs($actor)
            ->get(route('admin.events.index'))
            ->assertForbidden();

        $this->actingAs($actor)
            ->get(route('admin.events.show', $event))
            ->assertForbidden();
    }

    // -------------------------------------------------------------------------
    // Delivery format
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('The export is delivered as a CSV download whose filename identifies the event')]
    public function export_is_delivered_as_a_csv_download_named_after_the_event(): void
    {
        $workspace = $this->createWorkspace();
        $event = $this->eventFor($workspace, 'Helsinki Autumn Broadcast');
        $this->registerAttendee($event, 'Sanna Kuusela', 'sanna.kuusela@example.test');

        $response = $this->actingAs($this->createPlatformSuperAdmin($workspace))
            ->get($this->exportUrl($event));

        $response->assertOk();

        $disposition = (string) $response->headers->get('content-disposition');
        $contentType = (string) $response->headers->get('content-type');

        $this->assertStringContainsStringIgnoringCase(
            'attachment',
            $disposition,
            'The export must be delivered as a file download.',
        );

        $this->assertTrue(
            str_contains(strtolower($contentType), 'csv') || str_contains(strtolower($disposition), '.csv'),
            "The export must be delivered as CSV. Content-Type [{$contentType}], Content-Disposition [{$disposition}].",
        );

        $identifiers = array_values(array_filter([
            (string) $event->uuid,
            Str::slug((string) $event->title),
            strtolower((string) $event->title),
            'event-'.$event->id,
            'event_'.$event->id,
            'event'.$event->id,
        ], static fn (string $candidate): bool => $candidate !== ''));

        $matched = false;
        foreach ($identifiers as $identifier) {
            if (str_contains(strtolower($disposition), $identifier)) {
                $matched = true;
                break;
            }
        }

        $this->assertTrue(
            $matched,
            "The download filename must identify the exported event. Content-Disposition was [{$disposition}].",
        );

        $this->assertNotSame('', trim($this->payloadOf($response)), 'The download must not be empty.');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * @return array<string, mixed>
     */
    private function routePermissionMap(): array
    {
        $mappings = config('route_permissions.routes');

        $this->assertIsArray($mappings, 'The route-permission configuration must expose a route map.');

        return $mappings;
    }

    private function exportUrl(Event $event): string
    {
        return route(self::EXPORT_ROUTE, $event);
    }

    private function eventFor(Team $workspace, string $title): Event
    {
        return Event::factory()->for($workspace)->create(['title' => $title]);
    }

    /**
     * @return array{name: string, email: string}
     */
    private function registerAttendee(Event $event, string $fullName, string $email): array
    {
        Registration::unguarded(function () use ($event, $fullName, $email): void {
            Registration::query()->create([
                'team_id' => $event->team_id,
                'event_id' => $event->id,
                'email' => $email,
                'email_hash' => hash('sha256', $email),
                'source' => 'direct',
                'full_name' => $fullName,
                'consent_accepted_at' => now(),
            ]);
        });

        return ['name' => $fullName, 'email' => $email];
    }

    /**
     * A user who passes the platform-admin area check (bypasses team scope)
     * but holds no global event-visibility capability.
     */
    private function adminAreaUserWithoutEventVisibility(Team $workspace): User
    {
        $role = Role::query()->firstOrCreate(
            ['key' => 'platform_support_desk'],
            ['name' => 'Platform Support Desk', 'is_system_admin' => true],
        );
        $role->assignPermission('users.viewany.global');

        /** @var User $user */
        $user = User::factory()->create([
            'email_verified_at' => now(),
            'current_team_id' => $workspace->id,
        ]);
        $workspace->users()->attach($user, ['role' => $role->key]);

        /** @var User $fresh */
        $fresh = $user->fresh(['currentTeam']);

        return $fresh;
    }

    /**
     * @param  array{name: string, email: string}  $attendee
     */
    private function assertAttendeeListed(string $payload, array $attendee, string $message = ''): void
    {
        $this->assertTrue(
            str_contains($payload, $attendee['name']) || str_contains($payload, $attendee['email']),
            $message !== ''
                ? $message
                : "The export must list the registration for [{$attendee['name']}].",
        );
    }

    /**
     * @param  array{name: string, email: string}  $attendee
     */
    private function assertAttendeeAbsent(string $payload, array $attendee, string $message): void
    {
        $this->assertStringNotContainsString($attendee['name'], $payload, $message);
        $this->assertStringNotContainsString($attendee['email'], $payload, $message);
    }

    /**
     * @param  list<array{name: string, email: string}>  $attendees
     */
    private function assertNoRegistrationDataDelivered(TestResponse $response, array $attendees, string $message): void
    {
        $payload = $this->payloadOf($response);

        foreach ($attendees as $attendee) {
            $this->assertAttendeeAbsent($payload, $attendee, $message);
        }

        $this->assertStringNotContainsStringIgnoringCase(
            'attachment',
            (string) $response->headers->get('content-disposition'),
            $message,
        );
    }

    private function payloadOf(TestResponse $response): string
    {
        $base = $response->baseResponse;

        if ($base instanceof StreamedResponse) {
            ob_start();
            $base->sendContent();

            return (string) ob_get_clean();
        }

        if ($base instanceof BinaryFileResponse) {
            $path = $base->getFile()->getPathname();

            return is_readable($path) ? (string) file_get_contents($path) : '';
        }

        return (string) $base->getContent();
    }
}
