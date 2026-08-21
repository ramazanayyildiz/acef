<?php

declare(strict_types=1);

namespace Tests\Feature\SuperAdmin;

use App\Models\Role;
use App\Models\User;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Tests\Feature\FeatureTestCase;
use Tests\Feature\SuperAdmin\Support\InteractsWithSuperAdmin;

/**
 * Capsule T4 — platform-admin export of a single event's registration list.
 *
 * The rows carry attendee personal data, so the endpoint must be gated by the
 * same global capability that already governs platform-wide event visibility
 * (events.view.global) rather than by generic admin-area membership.
 */
class AdminEventRegistrationExportTest extends FeatureTestCase
{
    use InteractsWithSuperAdmin;

    private const EXPORT_ROUTE = 'admin.events.registrations.export';

    // -------------------------------------------------------------------------
    // AC1 / AC4 / AC5 — CSV download scoped to the requested event
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('T4-EXPORT-01 [P0] Given a platform admin when they export an event then only that event\'s registrations are streamed as a CSV download')]
    public function platform_admin_exports_only_the_requested_events_registrations(): void
    {
        $workspace = $this->createWorkspace();
        $otherWorkspace = $this->createWorkspace();

        $event = Event::factory()->for($workspace)->create(['title' => 'Delivery Complaint Event']);
        $otherEvent = Event::factory()->for($otherWorkspace)->create(['title' => 'Unrelated Event']);

        $this->registerAttendee($event, 'first.attendee@example.test');
        $this->registerAttendee($event, 'second.attendee@example.test');
        $this->registerAttendee($otherEvent, 'other.event.attendee@example.test');

        $admin = $this->createPlatformSuperAdmin($workspace);

        $response = $this->actingAs($admin)->get($this->exportUrl($event));

        $response->assertOk();

        // AC5 — delivered as a CSV download naming the event it belongs to.
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('Content-Type'));
        $disposition = (string) $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('attachment', $disposition);
        $this->assertStringContainsString($event->uuid, $disposition);

        // AC4 — the requested event's registrations, and nothing from another event.
        $body = $this->bodyOf($response);
        $this->assertStringContainsString('first.attendee@example.test', $body);
        $this->assertStringContainsString('second.attendee@example.test', $body);
        $this->assertStringNotContainsString('other.event.attendee@example.test', $body);
    }

    // -------------------------------------------------------------------------
    // AC3 — admin-area access alone does not unlock attendee personal data
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('T4-EXPORT-02 [P0] Given an admin-area user without global event visibility when they request the export then they are refused and receive no registration data')]
    public function admin_area_user_without_global_event_visibility_is_refused(): void
    {
        $workspace = $this->createWorkspace();
        $event = Event::factory()->for($workspace)->create(['title' => 'Delivery Complaint Event']);
        $this->registerAttendee($event, 'protected.attendee@example.test');

        // Reaches the admin area (system-admin flagged role) but was never
        // granted the global event-visibility capability.
        $role = Role::query()->create([
            'name' => 'Support Desk Without Event Visibility',
            'key' => 't4-support-desk-no-event-visibility',
            'description' => 'Test-only system role that reaches the admin area but cannot view events platform-wide.',
            'is_system_role' => false,
            'is_system_admin' => true,
        ]);

        $supportUser = User::factory()->create([
            'email_verified_at' => now(),
            'current_team_id' => $workspace->id,
        ]);
        $workspace->users()->attach($supportUser, ['role' => $role->key]);
        $supportUser = $supportUser->fresh(['currentTeam']);

        // Precondition: this actor genuinely reaches the platform-admin area.
        $this->actingAs($supportUser)->get(route('admin.dashboard'))->assertOk();

        $response = $this->actingAs($supportUser)->get($this->exportUrl($event));

        $response->assertForbidden();
        $this->assertStringNotContainsString('protected.attendee@example.test', $this->bodyOf($response));
    }

    // -------------------------------------------------------------------------
    // AC2 / AC6 — config gating agrees with the endpoint, neighbours untouched
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('T4-EXPORT-03 [P0] Given the route-permission config when the export route is added then it requires global event visibility and pre-existing admin event entries are unchanged')]
    public function export_route_is_capability_gated_without_widening_existing_admin_routes(): void
    {
        /** @var array<string, string|null> $permissions */
        $permissions = config('route_permissions.routes');

        $this->assertSame(
            'events.view.global',
            $permissions[self::EXPORT_ROUTE] ?? null,
            'The export route must be gated by the global event-visibility capability it enforces.',
        );

        // AC6 — the neighbouring admin event entries keep their original gates.
        $this->assertSame('events.view.global', $permissions['admin.events.index'] ?? null);
        $this->assertSame('events.view.global', $permissions['admin.events.show'] ?? null);
        $this->assertSame('events.update.global', $permissions['admin.events.edit'] ?? null);
        $this->assertSame('system_admin_access', $permissions['admin.dashboard'] ?? null);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function exportUrl(Event $event): string
    {
        $this->assertTrue(
            Route::has(self::EXPORT_ROUTE),
            'Named route ['.self::EXPORT_ROUTE.'] does not exist.',
        );

        return route(self::EXPORT_ROUTE, $event->uuid);
    }

    private function registerAttendee(Event $event, string $email): Registration
    {
        return Registration::unguarded(fn (): Registration => Registration::query()->create([
            'team_id' => $event->team_id,
            'event_id' => $event->id,
            'email' => $email,
            'email_hash' => hash('sha256', $email),
            'source' => 'direct',
            'full_name' => 'Attendee '.substr(md5($email), 0, 6),
            'consent_accepted_at' => now(),
        ]));
    }

    private function bodyOf(TestResponse $response): string
    {
        $base = $response->baseResponse;

        if ($base instanceof StreamedResponse || $base instanceof BinaryFileResponse) {
            return $response->streamedContent();
        }

        return (string) $base->getContent();
    }
}
