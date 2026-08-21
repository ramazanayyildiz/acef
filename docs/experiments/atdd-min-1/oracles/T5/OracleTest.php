<?php

declare(strict_types=1);

namespace Tests\Feature\AtddOracle;

use App\Enums\UserRole;
use App\Models\Team;
use App\Models\User;
use App\Modules\Events\Enums\EventState;
use App\Modules\Events\Models\Event;
use App\Modules\Events\Models\LandingPage;
use Illuminate\Http\Request;
use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\FeatureTestCase;

/**
 * Behavioural checks for the shareable landing-preview link.
 *
 * Everything here binds to the named routes, the persisted event state and the
 * HTTP surface only — never to class names, view paths, copy or markup.
 */
class OracleTest extends FeatureTestCase
{
    private const MINT_ROUTE = 'events.landing.share';

    private const SHARE_ROUTE = 'events.public.landing-share';

    private const EDITOR_ROUTE = 'events.landing.edit';

    private const AUTHED_PREVIEW_ROUTE = 'events.landing.preview';

    private const PUBLIC_LANDING_ROUTE = 'events.public.show';

    private const REGISTRATION_STORE_ROUTE = 'events.public.registration.store';

    private const PUBLISH_ROUTE = 'events.publish';

    // ─────────────────────────────────────────────────────────────
    // Assertions
    // ─────────────────────────────────────────────────────────────

    #[Test]
    public function organiser_mints_a_link_that_lets_an_unauthenticated_visitor_read_a_draft_landing_preview(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Alpha Draft Briefing');

        $link = $this->mintShareLink($organiser, $event);

        $this->assertIsString(
            $link,
            'The organiser holding the event-update capability could not mint a landing-preview share link '
            .'via the ['.self::MINT_ROUTE.'] route.'
        );

        $this->actingAsGuest();
        $response = $this->get($link);

        $response->assertOk();
        $this->assertGuest();
        $this->assertStringContainsString(
            $event->title,
            (string) $response->getContent(),
            'The shared link did not render the landing preview of the DRAFT event.'
        );

        $this->assertSame(
            EventState::DRAFT->value,
            (string) $this->reloadEvent($event)->state->value,
            'Minting or opening a share link must not change the event state.'
        );
    }

    #[Test]
    public function share_link_with_altered_or_missing_signature_is_refused(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Tamper Draft Briefing');

        $link = $this->mintShareLink($organiser, $event);
        $this->assertIsString($link, 'Could not mint a landing-preview share link to tamper with.');

        $this->actingAsGuest();
        $this->get($link)->assertOk();

        $probes = ['stripped parameters' => $this->stripQuery($link)];

        $query = $this->queryOf($link);
        $this->assertNotSame([], $query, 'The share link carries no parameters, so it cannot be time-limited.');

        $probes['injected parameter'] = $this->withQuery($link, $query + ['oracle_injected' => 'yes']);

        foreach ($query as $name => $value) {
            $probes['altered "'.$name.'" parameter'] = $this->withQuery(
                $link,
                [$name => $this->mutate((string) $value)] + $query,
            );
        }

        foreach ($probes as $description => $probe) {
            $this->assertShareRequestRefused($probe, $event, 'Share link with '.$description);
        }
    }

    #[Test]
    public function share_link_is_refused_once_its_lifetime_has_passed(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Expiry Draft Briefing');

        $link = $this->mintShareLink($organiser, $event);
        $this->assertIsString($link, 'Could not mint a landing-preview share link to age out.');

        $this->actingAsGuest();
        $this->get($link)->assertOk();

        $this->travel(400)->days();

        $this->assertShareRequestRefused(
            $link,
            $event,
            'A share link opened 400 days after it was minted'
        );
    }

    #[Test]
    public function share_link_minted_for_one_event_does_not_expose_another_event(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $shared = $this->draftEvent($team, $organiser, 'Oracle Shared Draft Briefing');
        $private = $this->draftEvent($team, $organiser, 'Oracle Withheld Draft Briefing');

        $sharedLink = $this->mintShareLink($organiser, $shared);
        $privateLink = $this->mintShareLink($organiser, $private);
        $this->assertIsString($sharedLink, 'Could not mint a share link for the first event.');
        $this->assertIsString($privateLink, 'Could not mint a share link for the second event.');

        $this->actingAsGuest();
        $response = $this->get($sharedLink);
        $response->assertOk();
        $this->assertStringNotContainsString(
            $private->title,
            (string) $response->getContent(),
            'A share link for one event rendered content belonging to another event.'
        );

        $probed = false;

        $swapped = $this->repointToEvent($sharedLink, $shared, $private);
        if ($swapped !== null) {
            $probed = true;
            $this->assertShareRequestRefused(
                $swapped,
                $private,
                'A share link repointed at a different event'
            );
        }

        $grafted = $this->graftCredentials($privateLink, $sharedLink);
        if ($grafted !== null) {
            $probed = true;
            $this->assertShareRequestRefused(
                $grafted,
                $private,
                'A share link for another event carrying the credentials of the shared event'
            );
        }

        $this->assertTrue(
            $probed,
            'The share link exposes no parameters that identify or authorise the event, so per-event scoping '
            .'could not be exercised.'
        );
    }

    #[Test]
    public function actors_without_the_event_update_capability_cannot_mint_a_share_link(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Capability Draft Briefing');

        $viewer = $this->viewOnlyMember($team);
        $this->assertTrue(
            Gate::forUser($viewer)->allows('events.view.team'),
            'Fixture guard: the view-only member should hold the event-view capability.'
        );
        $this->assertFalse(
            Gate::forUser($viewer)->allows('events.update.team'),
            'Fixture guard: the view-only member must not hold the event-update capability.'
        );
        $this->assertFalse(
            Gate::forUser($viewer)->allows('events.update.global'),
            'Fixture guard: the view-only member must not hold the global event-update capability.'
        );

        $this->assertNull(
            $this->mintShareLink($viewer, $event),
            'A team member without the event-update capability was able to mint a landing-preview share link.'
        );

        [$outsider] = $this->organiserWithTeam();
        $this->assertNull(
            $this->mintShareLink($outsider, $event),
            'An organiser from another workspace was able to mint a share link for this event.'
        );

        $this->actingAsGuest();
        session()->flush();
        $this->assertNull(
            $this->extractShareLink($this->post($this->routeUrl(self::MINT_ROUTE, $event))),
            'An unauthenticated visitor was able to mint a landing-preview share link.'
        );
    }

    #[Test]
    public function shared_view_offers_no_registration_submission_and_no_authoring_control(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Read Only Draft Briefing');

        $link = $this->mintShareLink($organiser, $event);
        $this->assertIsString($link, 'Could not mint a landing-preview share link to inspect.');

        $this->actingAsGuest();
        $html = (string) $this->get($link)->assertOk()->getContent();

        foreach ($this->formsIn($html) as $form) {
            if (! in_array($form['method'], ['post', 'put', 'patch', 'delete'], true)) {
                continue;
            }

            $this->assertFalse(
                $this->matchesRoute($form['action'], self::REGISTRATION_STORE_ROUTE),
                'The shared read-only view submits registrations: a "'.$form['method'].'" form targets "'
                .$form['action'].'".'
            );
        }

        $forbidden = [
            self::EDITOR_ROUTE => 'a target in the authenticated landing editor',
            self::AUTHED_PREVIEW_ROUTE => 'a target in the authenticated landing preview',
            self::PUBLISH_ROUTE => 'a publish control',
        ];

        foreach ($forbidden as $routeName => $label) {
            $hit = $this->firstTargetMatching($html, $routeName);
            $this->assertNull(
                $hit,
                'The shared read-only view exposes '.$label.' ("'.$hit.'").'
            );
        }
    }

    #[Test]
    public function opening_the_share_link_neither_authenticates_the_visitor_nor_unlocks_the_authenticated_surfaces(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Session Draft Briefing');

        $link = $this->mintShareLink($organiser, $event);
        $this->assertIsString($link, 'Could not mint a landing-preview share link to follow.');

        $this->actingAsGuest();
        $this->get($link)->assertOk();

        $this->assertGuest('web');

        foreach ([self::EDITOR_ROUTE, self::AUTHED_PREVIEW_ROUTE] as $routeName) {
            $response = $this->get($this->routeUrl($routeName, $event));

            $this->assertFalse(
                $this->isSuccessful($response),
                'After opening a share link, the visitor reached the authenticated ['.$routeName.'] surface '
                .'(HTTP '.$response->baseResponse->getStatusCode().').'
            );
            $this->assertStringNotContainsString(
                $event->title,
                (string) $response->getContent(),
                'After opening a share link, the authenticated ['.$routeName.'] surface rendered event content '
                .'for an unauthenticated visitor.'
            );
        }

        $this->assertGuest('web');
    }

    #[Test]
    public function sharing_does_not_make_the_draft_event_readable_on_the_permanent_public_landing_route(): void
    {
        [$organiser, $team] = $this->organiserWithTeam();
        $event = $this->draftEvent($team, $organiser, 'Oracle Invariant Draft Briefing');

        $link = $this->mintShareLink($organiser, $event);
        $this->assertIsString($link, 'Could not mint a landing-preview share link.');

        $this->actingAsGuest();
        $this->get($link)->assertOk();

        $publicUrl = $this->routeUrl(self::PUBLIC_LANDING_ROUTE, $event);
        $response = $this->get($publicUrl);

        $this->assertFalse(
            $this->isSuccessful($response),
            'The DRAFT event became readable on the permanent public landing route (HTTP '
            .$response->baseResponse->getStatusCode().').'
        );
        $this->assertStringNotContainsString(
            $event->title,
            (string) $response->getContent(),
            'The DRAFT event landing content is served on the permanent public landing route.'
        );
    }

    // ─────────────────────────────────────────────────────────────
    // Fixtures
    // ─────────────────────────────────────────────────────────────

    /** @return array{0: User, 1: Team} */
    private function organiserWithTeam(): array
    {
        $organiser = User::factory()->create();
        $team = Team::factory()->create(['user_id' => $organiser->id]);
        $organiser->teams()->attach($team, ['role' => UserRole::ADMIN->value]);
        $organiser->forceFill(['current_team_id' => $team->id])->save();

        return [$organiser->fresh(), $team->fresh()];
    }

    private function viewOnlyMember(Team $team): User
    {
        return $this->createUserWithRoleAndPermissions(
            'oracle-event-viewer',
            ['events.view.team'],
            $team,
        )->fresh();
    }

    private function draftEvent(Team $team, User $organiser, string $title): Event
    {
        $event = Event::factory()
            ->inState(EventState::DRAFT)
            ->for($team)
            ->create([
                'created_by' => $organiser->id,
                'title' => $title,
                'description' => $title.' — agenda summary',
            ]);

        LandingPage::factory()
            ->for($event)
            ->state([
                'team_id' => $team->id,
                'template' => 'classic',
            ])
            ->create();

        return $event;
    }

    private function reloadEvent(Event $event): Event
    {
        /** @var Event $fresh */
        $fresh = Event::query()
            ->withoutGlobalScope(\App\Scopes\TeamScope::class)
            ->findOrFail($event->getKey());

        return $fresh;
    }

    // ─────────────────────────────────────────────────────────────
    // Share-link plumbing
    // ─────────────────────────────────────────────────────────────

    private function mintShareLink(User $actor, Event $event): ?string
    {
        // Drop anything an earlier mint flashed, so a link can only be reported
        // when THIS request produced it.
        session()->flush();

        $response = $this->actingAs($actor)->post($this->routeUrl(self::MINT_ROUTE, $event));

        return $this->extractShareLink($response);
    }

    /**
     * Locate a link to the share route anywhere the mint endpoint may hand it
     * back: JSON payload, redirect target, flashed session data, rendered body,
     * or the page the organiser is redirected to.
     */
    private function extractShareLink(TestResponse $response): ?string
    {
        $found = $this->firstShareLinkIn($this->candidatesFrom($response));

        if ($found !== null) {
            return $found;
        }

        $location = $response->baseResponse->headers->get('Location');

        if (is_string($location) && $location !== '' && ! $this->matchesRoute($location, self::SHARE_ROUTE)) {
            return $this->firstShareLinkIn($this->candidatesFrom($this->get($location)));
        }

        return null;
    }

    /** @return list<string> */
    private function candidatesFrom(TestResponse $response): array
    {
        $candidates = [];

        $location = $response->baseResponse->headers->get('Location');
        if (is_string($location) && $location !== '') {
            $candidates[] = $location;
        }

        $content = (string) $response->getContent();
        if ($content !== '') {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $this->collectStrings($decoded, $candidates);
            }

            preg_match_all('#(?:https?://|/)[^\s"\'<>\\\\]+#i', $content, $matches);
            foreach ($matches[0] as $match) {
                $candidates[] = $match;
            }
        }

        $this->collectStrings(session()->all(), $candidates);

        return $candidates;
    }

    /** @param list<string> $candidates */
    private function firstShareLinkIn(array $candidates): ?string
    {
        foreach ($candidates as $candidate) {
            $url = html_entity_decode($candidate, ENT_QUOTES | ENT_HTML5);

            if ($this->matchesRoute($url, self::SHARE_ROUTE)) {
                return $url;
            }
        }

        return null;
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @param  list<string>  $into
     */
    private function collectStrings(array $values, array &$into): void
    {
        foreach ($values as $value) {
            if (is_string($value)) {
                $into[] = $value;

                continue;
            }

            if (is_array($value)) {
                $this->collectStrings($value, $into);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Routing helpers — bound to route NAMES only
    // ─────────────────────────────────────────────────────────────

    private function namedRoute(string $name): RouteDefinition
    {
        $route = Route::getRoutes()->getByName($name);

        $this->assertNotNull($route, 'Named route ['.$name.'] is not registered.');

        return $route;
    }

    private function routeUrl(string $name, Event $event): string
    {
        $route = $this->namedRoute($name);

        $parameters = [];
        foreach ($route->parameterNames() as $parameterName) {
            $parameters[$parameterName] = $this->parameterValue($route, $parameterName, $event);
        }

        return url()->route($name, $parameters);
    }

    private function parameterValue(RouteDefinition $route, string $parameterName, Event $event): string
    {
        $bindingField = $route->bindingFieldFor($parameterName);

        if (is_string($bindingField) && $bindingField !== '') {
            return (string) $event->getAttribute($bindingField);
        }

        $candidates = [];
        if (str_contains(strtolower($parameterName), 'uuid')) {
            $candidates[] = (string) $event->uuid;
        }
        $candidates[] = (string) $event->getRouteKey();
        $candidates[] = (string) $event->uuid;
        $candidates[] = (string) $event->getKey();

        $pattern = $route->wheres[$parameterName] ?? null;

        foreach ($candidates as $candidate) {
            if (! is_string($pattern) || preg_match('#^(?:'.$pattern.')$#u', $candidate) === 1) {
                return $candidate;
            }
        }

        return $candidates[0];
    }

    private function matchesRoute(string $url, string $routeName): bool
    {
        $route = Route::getRoutes()->getByName($routeName);

        if ($route === null) {
            return false;
        }

        $url = trim($url);

        if ($url === '' || ! preg_match('#^(?:https?://|/)#i', $url)) {
            return false;
        }

        try {
            return $route->matches(Request::create($url, 'GET'), false);
        } catch (\Throwable) {
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // URL manipulation
    // ─────────────────────────────────────────────────────────────

    /** @return array<string, string> */
    private function queryOf(string $url): array
    {
        $query = (string) (parse_url($url, PHP_URL_QUERY) ?: '');

        if ($query === '') {
            return [];
        }

        parse_str($query, $parsed);

        $flat = [];
        foreach ($parsed as $key => $value) {
            if (is_string($value)) {
                $flat[(string) $key] = $value;
            }
        }

        return $flat;
    }

    private function stripQuery(string $url): string
    {
        return explode('?', $url, 2)[0];
    }

    /** @param array<string, string> $query */
    private function withQuery(string $url, array $query): string
    {
        return $this->stripQuery($url).($query === [] ? '' : '?'.http_build_query($query));
    }

    private function mutate(string $value): string
    {
        if ($value === '') {
            return 'x';
        }

        $last = substr($value, -1);

        return substr($value, 0, -1).($last === 'a' ? 'b' : 'a');
    }

    /**
     * Re-point a share link at a different event by swapping whichever event
     * identifier the link carries. Returns null when the link carries none.
     */
    private function repointToEvent(string $url, Event $from, Event $to): ?string
    {
        foreach ([[$from->uuid, $to->uuid], [(string) $from->getKey(), (string) $to->getKey()]] as [$needle, $replacement]) {
            if ($needle !== '' && str_contains($url, $needle)) {
                return str_replace($needle, $replacement, $url);
            }
        }

        return null;
    }

    /**
     * Copy the non-identifying parameters (signature, expiry, tokens…) of one
     * share link onto another. Returns null when the two links carry the same
     * parameter values, i.e. nothing event specific was grafted.
     */
    private function graftCredentials(string $target, string $source): ?string
    {
        $targetQuery = $this->queryOf($target);
        $sourceQuery = $this->queryOf($source);

        if ($sourceQuery === [] || $targetQuery === $sourceQuery) {
            return null;
        }

        return $this->withQuery($target, $sourceQuery + $targetQuery);
    }

    // ─────────────────────────────────────────────────────────────
    // HTML inspection
    // ─────────────────────────────────────────────────────────────

    /** @return list<array{method: string, action: string}> */
    private function formsIn(string $html): array
    {
        preg_match_all('#<form\b[^>]*>#i', $html, $matches);

        $forms = [];
        foreach ($matches[0] as $tag) {
            $method = 'get';
            if (preg_match('#\bmethod\s*=\s*["\']?([a-z]+)#i', $tag, $found) === 1) {
                $method = strtolower($found[1]);
            }

            $action = '';
            if (preg_match('#\baction\s*=\s*["\']([^"\']*)["\']#i', $tag, $found) === 1) {
                $action = html_entity_decode($found[1], ENT_QUOTES | ENT_HTML5);
            }

            $forms[] = ['method' => $method, 'action' => $action];
        }

        return $forms;
    }

    private function firstTargetMatching(string $html, string $routeName): ?string
    {
        preg_match_all('#\b(?:href|action|src|data-url)\s*=\s*["\']([^"\']*)["\']#i', $html, $matches);

        foreach ($matches[1] as $target) {
            $url = html_entity_decode($target, ENT_QUOTES | ENT_HTML5);

            if ($this->matchesRoute($url, $routeName)) {
                return $url;
            }
        }

        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // Shared assertions
    // ─────────────────────────────────────────────────────────────

    private function assertShareRequestRefused(string $url, Event $event, string $context): void
    {
        $this->actingAsGuest();
        $response = $this->get($url);

        $served = $this->isSuccessful($response)
            && str_contains((string) $response->getContent(), $event->title);

        $this->assertFalse(
            $served,
            $context.' was served (HTTP '.$response->baseResponse->getStatusCode().') instead of being refused.'
        );

        $location = $response->baseResponse->headers->get('Location');
        if (is_string($location) && $location !== '') {
            $this->assertFalse(
                $this->matchesRoute($location, self::SHARE_ROUTE),
                $context.' was forwarded to a working shared view instead of being refused.'
            );
        }
    }

    private function isSuccessful(TestResponse $response): bool
    {
        $status = $response->baseResponse->getStatusCode();

        return $status >= 200 && $status < 300;
    }
}
