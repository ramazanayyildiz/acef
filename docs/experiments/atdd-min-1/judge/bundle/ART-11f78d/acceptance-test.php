<?php

declare(strict_types=1);

namespace Tests\Feature\SuperAdmin;

use App\Enums\UserRole;
use App\Models\Role;
use App\Models\RolePermission;
use App\Models\Team;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Enums\RegistrationSource;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\Registration;
use Illuminate\Support\Facades\Route as RouteFacade;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;
use Tests\Feature\FeatureTestCase;
use Tests\Feature\SuperAdmin\Support\InteractsWithSuperAdmin;

/**
 * Capsule T4 — platform-admin export of a single event's registration list.
 *
 * Registration rows carry attendee personal data, so the endpoint must be gated
 * on the explicit global event-visibility capability rather than on generic
 * admin-area access.
 */
class AdminEventRegistrationExportTest extends FeatureTestCase
{
    use InteractsWithSuperAdmin;

    private const ROUTE = 'admin.events.registrations.export';

    // -------------------------------------------------------------------------
    // AC1 / AC4 / AC5 — CSV download scoped to the requested event
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('T4-EXPORT-01 [P0] Given a platform admin when they export an event then a CSV download contains only that event\'s registrations')]
    public function platform_admin_exports_only_the_requested_events_registrations(): void
    {
        $workspace = $this->createWorkspace();
        $admin = $this->createPlatformSuperAdmin($workspace);

        $target = $this->eventFor($workspace, 'Delivery Complaint Webinar');
        $other = $this->eventFor($workspace, 'Unrelated Webinar');

        $this->registration($target, 'target@example.test', 'Target Registrant');
        $this->registration($other, 'other@example.test', 'Other Registrant');

        $route = RouteFacade::getRoutes()->getByName(self::ROUTE);
        $this->assertNotNull($route, 'The registration export route must be registered.');
        $this->assertContains('GET', $route->methods(), 'The registration export must be a GET route.');
        $this->assertStringStartsWith('admin/', $route->uri(), 'The export must live under the platform-admin routes.');

        $response = $this->actingAs($admin)->get(route(self::ROUTE, $target->uuid));

        $response->assertOk();
        $this->assertStringContainsString(
            'text/csv',
            (string) $response->headers->get('Content-Type'),
            'The export must be delivered as CSV.',
        );

        $disposition = (string) $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('attachment', $disposition, 'The export must be delivered as a download.');
        $this->assertStringContainsString('.csv', $disposition);
        $this->assertTrue(
            str_contains($disposition, $target->uuid)
                || str_contains(strtolower($disposition), 'delivery-complaint-webinar'),
            "The download filename must identify the exported event. Got: {$disposition}",
        );

        $csv = $this->streamedContent($response);
        $this->assertStringContainsString('Target Registrant', $csv);
        $this->assertStringContainsString('target@example.test', $csv);
        $this->assertStringNotContainsString('Other Registrant', $csv, 'Another event\'s registrations must not leak.');
        $this->assertStringNotContainsString('other@example.test', $csv, 'Another event\'s registrations must not leak.');
    }

    // -------------------------------------------------------------------------
    // AC3 — admin-area access alone does not unlock the export
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('T4-EXPORT-02 [P0] Given an admin-area user without global event visibility when they request the export then they are refused and receive no CSV')]
    public function admin_area_user_without_global_event_visibility_is_refused(): void
    {
        $workspace = $this->createWorkspace();
        $admin = $this->createPlatformSuperAdmin($workspace);

        $event = $this->eventFor($workspace, 'Delivery Complaint Webinar');
        $this->registration($event, 'target@example.test', 'Target Registrant');

        $this->revokeGlobalEventVisibility();

        // The actor still reaches the admin area — only the event-visibility
        // capability is missing.
        $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk();

        $response = $this->actingAs($admin)->get(route(self::ROUTE, $event->uuid));

        $response->assertForbidden();
        $this->assertStringNotContainsString(
            'text/csv',
            (string) $response->headers->get('Content-Type'),
            'A refused request must not return a CSV payload.',
        );

        $body = (string) $response->getContent();
        $this->assertStringNotContainsString('Target Registrant', $body);
        $this->assertStringNotContainsString('target@example.test', $body);
    }

    // -------------------------------------------------------------------------
    // AC2 / AC6 — capability mapping is explicit and pre-existing routes are untouched
    // -------------------------------------------------------------------------

    #[Test]
    #[TestDox('T4-EXPORT-03 [P0] Given the route-permission config when the export route is added then it maps to global event visibility and no other admin route changes')]
    public function export_route_is_capability_gated_without_widening_existing_admin_routes(): void
    {
        /** @var array<string, string|null> $routes */
        $routes = config('route_permissions.routes');

        $this->assertSame(
            'events.view.global',
            $routes[self::ROUTE] ?? null,
            'The export must be gated on the global capability governing platform-wide event visibility.',
        );

        foreach ($this->preExistingAdminRoutePermissions() as $name => $capability) {
            $this->assertArrayHasKey($name, $routes, "Pre-existing admin route {$name} lost its permission entry.");
            $this->assertSame($capability, $routes[$name], "Pre-existing admin route {$name} changed its permission entry.");
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function eventFor(Team $team, string $title): Event
    {
        /** @var Event $event */
        $event = Event::factory()->create([
            'team_id' => $team->id,
            'created_by' => $team->user_id,
            'state' => EventState::ENDED->value,
            'title' => $title,
            'starts_at' => now()->subHours(3),
            'ends_at' => now()->subHours(2),
        ]);

        return $event;
    }

    private function registration(Event $event, string $email, string $name): Registration
    {
        return Registration::forceCreate([
            'team_id' => $event->team_id,
            'event_id' => $event->id,
            'email' => $email,
            'email_hash' => hash('sha256', strtolower($email)),
            'full_name' => $name,
            'company' => 'Support Co',
            'country' => 'TR',
            'source' => RegistrationSource::DIRECT->value,
            'consent_accepted_at' => now()->subHours(2),
            'preferred_locale' => 'en',
        ]);
    }

    private function revokeGlobalEventVisibility(): void
    {
        $role = Role::where('key', UserRole::SYSTEM_ADMIN->value)->firstOrFail();

        RolePermission::where('role_id', $role->id)
            ->where('resource', 'events')
            ->where('action', 'view')
            ->forceDelete();
    }

    private function streamedContent(mixed $response): string
    {
        ob_start();
        $response->baseResponse->sendContent();

        return (string) ob_get_clean();
    }

    /**
     * Permission entries that existed before this capsule. None may change.
     *
     * @return array<string, string|null>
     */
    private function preExistingAdminRoutePermissions(): array
    {
        return [
            'admin.dashboard' => 'system_admin_access',
            'admin.events.index' => 'events.view.global',
            'admin.operations.kill-switches' => 'system_admin_access',
            'admin.privacy.erasure' => 'system_admin_access',
            'admin.events.show' => 'events.view.global',
            'admin.events.edit' => 'events.update.global',
            'admin.events.update' => 'events.update.global',
            'admin.events.landing.edit' => 'events.update.global',
            'admin.events.landing.preview' => 'events.update.global',
            'admin.events.form-config.edit' => 'events.update.global',
            'admin.events.automations.show' => 'automations.manage.global',
            'admin.events.automations.detail' => 'automations.manage.global',
            'admin.events.automations.toggle' => 'automations.manage.global',
            'admin.events.automations.update' => 'automations.manage.global',
            'admin.events.prepare' => 'events.update.global',
            'admin.events.publish' => 'events.publish.global',
            'admin.events.cancel' => 'events.cancel.global',
            'admin.events.suspend' => 'events.suspend.global',
            'admin.events.reactivate' => 'events.suspend.global',
            'admin.events.force-end' => 'events.force_end.global',
            'admin.events.lock-publishing' => 'events.suspend.global',
            'admin.events.unlock-publishing' => 'events.suspend.global',
            'admin.events.lock-go-live' => 'events.force_end.global',
            'admin.events.unlock-go-live' => 'events.force_end.global',
            'admin.events.streaming-assets.retry-replay' => 'events.force_end.global',
            'admin.events.streaming-assets.retry-stage' => 'events.force_end.global',
            'admin.users.index' => 'users.viewany.global',
            'admin.users.show' => 'users.view.global',
            'admin.users.show-by-email' => 'users.view.global',
            'admin.users.create' => 'users.create.global',
            'admin.users.store' => 'users.create.global',
            'admin.users.edit' => 'users.update.global',
            'admin.users.update' => 'users.update.global',
            'admin.users.grant-system-admin' => 'users.manage_system_admin.global',
            'admin.users.revoke-system-admin' => 'users.manage_system_admin.global',
            'admin.users.disable' => 'users.disable.global',
            'admin.users.enable' => 'users.disable.global',
            'admin.teams.index' => 'teams.viewany.global',
            'admin.teams.show' => 'teams.view.global',
            'admin.teams.section' => 'teams.view.global',
            'admin.teams.suspend' => 'teams.suspend.global',
            'admin.teams.reactivate' => 'teams.suspend.global',
            'admin.teams.transfer-ownership' => 'teams.transfer_ownership.global',
            'admin.teams.subscription.credit' => 'billing.credit.global',
            'admin.teams.subscription.refund' => 'billing.refund.global',
            'admin.teams.subscription.external-refund' => 'billing.refund.global',
            'admin.teams.subscription.adjustment.void' => 'billing.void_adjustment.global',
            'admin.audit-logs.index' => 'activity_logs.viewany.global',
            'admin.support-tickets.index' => 'system_admin_access',
            'admin.support-tickets.show' => 'system_admin_access',
            'admin.ai-audit.index' => 'system_admin_access',
            'admin.ai-audit.show' => 'system_admin_access',
            'admin.roles.index' => 'roles.viewany.global',
            'admin.roles.show' => 'roles.view.global',
            'admin.roles.update-permissions' => 'roles.update.global',
            'admin.impersonate.start' => 'users.impersonate.global',
            'admin.impersonate.status' => 'users.impersonate.global',
        ];
    }
}
