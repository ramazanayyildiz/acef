# Preregistration Amendment 008

The final pre-P0 audit proved that lifecycle names in command or tool text were not actor-separation evidence: one generic
dispatch containing every control name could satisfy the earlier text counter. It also proved that Codex CLI 0.146.0
cannot spawn a child from an `exec --ephemeral` parent, while a fresh, non-resumed `exec` parent can spawn and complete a
child and persists the authoritative collaboration events in its session transcript. The public `--json` stream contains
the parent thread ID but omits the spawn event, so self-reported success and empty `wait` events are insufficient.

Before any scored P0 result, the runner therefore removes `--ephemeral` but still starts a new, non-resumed thread for
every arm. Pilot preflight now runs a canary with the exact pinned client, model, reasoning effort, approval/sandbox flags,
and noninteractive surface. The canary passes only when the persisted transcript bound to stdout `thread.started` contains
one real `spawn_agent` call, a nonempty child thread ID, and that child's final result. Its parent/child IDs, executable
binding, and transcript hash are recorded. A scored launch refuses a missing, failed, manifest-drifted, or client-drifted
canary.

For each of the four frozen P0 stories, the prompt and oracle now require six exact, distinct task names: ATDD, development,
code review, patch verification, test review, and Process Judge. A seventh independent Process Judge closes the epic after
the single integration verification. Every required task name must correlate across a real spawn event, a unique child
thread ID, child completion, a typed actor record with matching scope/phase/persona, and a typed PASS gate from the required
Process Judge with successful hash-bound evidence. The active run must parse under the installed typed schema and finish
with `status: complete`. Every spawn must use `fork_turns=none`; the child transcript must bind its parent ID, exact agent
path, terminal `task_complete`, and the same explicit `ACTOR_RESULT` delivered to the parent. ATDD, development, and test
review cannot be retried. Review, patch verification, and Process Judge may use one contiguous `_retry1` only after an
explicit `REVISE`, so a suffixed second lifecycle vector fails closed. Preflight also binds a digest of the exact runner,
actor, parser, policy, and measurement source bytes and is rejected if generated from a dirty worktree.
Treatment state, actor, gate, and evidence records are parsed with that arm's installed pinned parser rather than the
experiment runner's newer schema. PASS gates must carry nonempty evidence IDs whose embedded IDs, commits, actors, raw
artifact paths, and SHA-256 values all reconcile.

These are fail-closed measurement-fidelity corrections made before any scored P0 result. They do not change the frozen
product source, seeded behavioral failures, allowed production paths, withheld tests, framework commits, model, time caps,
or decision thresholds.
