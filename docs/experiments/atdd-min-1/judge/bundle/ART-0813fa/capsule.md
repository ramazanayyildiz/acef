# Capsule — Duplicate an event

## Story
Workspace organisers repeatedly rebuild near-identical webinars by hand. Add a 'Duplicate' action to the event surface that creates a new DRAFT copy of an existing event in the acting user's current team. The action must appear in the shared event action model alongside edit/publish/cancel, and the duplicate endpoint must stand on its own authorization rather than relying on the button being hidden.

## Acceptance criteria
1. A named POST route `events.duplicate` exists at /events/{event:uuid}/duplicate and is handled by the Events module.
2. EventActionAvailability::for() returns a `duplicate` entry with `visible` and `enabled` booleans, consistent with the existing entries' shape.
3. The duplicate action is visible/enabled only for an actor holding the event-create capability (team or global scope) who can also view the source event.
4. The endpoint itself refuses an actor who lacks the create capability, and refuses an actor who cannot view the source event, independently of what the UI rendered. A refusal must not create any event row.
5. A successful duplicate creates exactly one new event, in DRAFT state, owned by the acting user's current team, with a distinct uuid from the source.
6. The duplicate must not copy lifecycle state, publication timestamps, cancellation, or registrations from the source event.