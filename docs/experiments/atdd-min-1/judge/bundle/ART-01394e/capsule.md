# Capsule — Shared event page shell adopted by a new and an existing page

## Story
Event settings pages each re-implement their own header: a title, the settings tab strip, and a row of action buttons. Extract that into one shared shell component for the Events module, then prove it is genuinely shared by adopting it on a brand-new read-only 'Event Overview' page and by retrofitting the existing Landing Preview page onto the same shell.

## Acceptance criteria
1. A single shared shell component exists in the Events module and renders: a page title, the existing settings tab strip for the event, and an actions region.
2. A new authenticated page is reachable at a named route `events.overview` (GET /events/{event:uuid}/overview) and renders through the shared shell.
3. The existing Landing Preview page renders through the same shared shell component rather than its own duplicated header markup.
4. Both pages pass the event's action availability into the shell so action visibility stays driven by the existing shared action model, not by per-page conditionals.
5. The Event Overview page is read-only: it exposes no form submission and no state-changing control.
6. Access to the Event Overview page requires the same view authorization already used by other event settings surfaces; an actor who cannot view the event is refused.