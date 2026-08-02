# Execution Assurance v3.9 canonical Developer session binding

Status: **implementation and focused verification complete; rehearsal must be frozen separately.**

V3.8 remains a consumed, non-replayable interrupted rehearsal. Its live conductor proved that pinned Codex CLI 0.146.0
returns only canonical `{"task_name":"/root/<task>"}` identity from `spawn_agent`; the harness-internal receiver UUID
is recorded in session events but is not exposed to the conductor. Requiring the conductor to persist that UUID was
therefore impossible and would have guaranteed a late oracle failure.

V3.9 uses the observable canonical agent path as the durable Developer session identity:

- the Developer actor record stores exact `/root/<task_name>` returned by `spawn_agent`;
- the repair follow-up targets that same canonical identity;
- the Developer repair receipt stores the same canonical identity;
- the harness independently proves that the child session's `agent_path` equals the canonical identity and that its
  internal UUID equals the receiver UUID observed for the spawn event; and
- actor/receipt continuity remains hash-, run-, story-, cycle-, commit-, tree-, and transcript-bound.

Bare task names and arbitrary/internal UUID strings are rejected as conductor-authored session state. This changes only
the observable identity representation; it does not weaken actor separation or receiver provenance.

## Verification and rehearsal rule

Focused execution-assurance, state, and process-validator tests must pass, followed by the complete 30-entrypoint
repository suite and capability-change validation. A rehearsal manifest must then be committed separately and bind the
exact clean implementation commit. It may authorize only one non-scored, non-promotable `REHEARSAL-v39` attempt over
the unchanged four-story contract. No blind Judge, promotion, maturity change, installation, or rollout is allowed.
