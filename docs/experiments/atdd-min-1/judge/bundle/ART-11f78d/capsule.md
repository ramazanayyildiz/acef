# Capsule — Platform-admin export of an event's registration list

## Story
Platform support staff need to pull the registration list for a single event when investigating a delivery complaint. Add a platform-admin export endpoint that streams that event's registrations as CSV. Registration rows carry attendee personal data, so the endpoint's authorization must be explicit and narrow rather than inheriting whatever the admin area happens to allow.

## Acceptance criteria
1. A named GET route `admin.events.registrations.export` exists under the platform-admin routes and returns a CSV response for a single event.
2. The route is capability-gated through the existing route-permission configuration, using a global-scope capability that already governs platform-wide event visibility.
3. An authenticated user who reaches the admin area but lacks that global capability is refused and receives no CSV body.
4. The exported CSV contains only registrations belonging to the requested event; registrations of any other event must not appear.
5. The response is delivered as a CSV download with a filename that identifies the event.
6. The export must not widen access for any pre-existing admin route: the permission entries for routes other than the new one are unchanged.