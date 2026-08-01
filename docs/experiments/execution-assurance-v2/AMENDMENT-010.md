# Amendment 010 — Candidate harness intervention invalidation

Date: 2026-08-02

The first `P0-candidate-r2` attempt is preserved but excluded from scored candidate analysis. During an active
collaboration wait, the external monitor inferred from the compact Codex JSON event that no worker had been spawned
because `receiver_thread_ids` was empty. The worker was in fact still active. A harness-correction message was injected
into the conductor thread and instructed it to spawn the same ATDD actor, waking the wait before the original worker had
finished and creating a duplicate dispatch/concurrent shared-worktree mutation path.

The runner correctly failed the resulting attempt after 2,617.1 active seconds and preserved its transcript, checkpoint,
result row, and patch. That failure demonstrates fail-closed detection and circuit breaking, but it cannot distinguish the
candidate treatment from the external intervention and is therefore not a scored treatment result.

The rerun uses the same pinned task, candidate commit, model, client binary, oracle, time cap, and thresholds in a fresh
ordinal-2 clone. No external steering or wake message is permitted. A compact wait event with no displayed receivers is
not actionable while the supervised actor process remains alive; the durable receipt/final answer remains authoritative.
