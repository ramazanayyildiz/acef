# Capsule — Shareable landing-preview link for unauthenticated reviewers

## Story
Organisers want to send a colleague or client a link to a DRAFT event's landing page for review before publishing. A DRAFT landing page is private today. Add a share link that lets an unauthenticated reviewer see a read-only rendering of the landing preview, without opening the private authenticated surfaces and without becoming a permanent public URL.

## Acceptance criteria
1. A named POST route `events.landing.share` lets an organiser holding the event-update capability mint a share link for that event's landing preview.
2. A named GET route `events.public.landing-share` serves that link to unauthenticated visitors and renders a read-only landing preview of the event, including for an event still in DRAFT.
3. The link is time-limited and tamper-evident: a link whose parameters have been altered, and a link past its expiry, are both refused rather than served.
4. A share link issued for one event must not grant access to any other event.
5. An actor who lacks the event-update capability cannot mint a share link.
6. The shared read-only view exposes no registration submission and no authoring or edit control, and reaching the shared view must not authenticate the visitor or grant access to the authenticated landing editor.