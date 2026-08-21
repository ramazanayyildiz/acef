# Capsule — Platform-admin revert of a published event back to draft

## Story
Support gets occasional requests to pull a webinar back to draft when an organiser published it by mistake and nobody has registered yet. Add a platform-admin action that reverts a PUBLISHED event to DRAFT. The event lifecycle is a canonical state machine with a documented legal-transition table and a guarded transition path that takes a row lock, re-checks cancellation, and writes an audit record; this change must extend that machine rather than route around it.

## Acceptance criteria
1. A named POST route `admin.events.revert-to-draft` exists under the platform-admin event routes and is capability-gated through the existing route-permission configuration.
2. Reverting a PUBLISHED event with no registrations moves it to DRAFT and records the change through the same guarded transition path the other lifecycle actions use, including its audit record.
3. A revert attempt on an event that is not PUBLISHED is refused and leaves the event's state unchanged.
4. A revert attempt on an event that already has registrations is refused and leaves the event's state unchanged.
5. A cancelled event cannot be reverted: cancellation continues to win over forward and backward lifecycle moves.
6. No previously illegal lifecycle edge becomes legal as a side effect. Apart from the single PUBLISHED-to-DRAFT edge this story introduces, the canonical legal-transition table for every state is unchanged, and the state-derived rules that other code reads from it keep their existing answers.