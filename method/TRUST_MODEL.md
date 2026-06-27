# ACEF Trust Model

ACEF is a local-first delivery policy layer for AI coding agents. It reduces accidental process drift; it is not an OS
sandbox or malicious-code security boundary.

## What ACEF Is Designed To Catch

| Threat | ACEF stance |
|---|---|
| Agent loses context and skips a gate | prevent or detect with active run, ledger, guard, and process validator |
| Worker edits outside story scope | prevent or detect with worker scope and guard checks |
| Reviewer approves own work | prevent with actor records and Process Judge checks |
| Story closes without runtime evidence (e.g. an in-memory store passes a same-process test) | prevent with evidence manifests, surface-derived runtime gates, and a **separate-process / fresh-connection read** for persistence surfaces (`acef-closeout-verify`) |
| Epic starts from vague "go on" | prevent with explicit approval receipts |
| Retrieval returns stale story context | detect with story/role-scoped current context and query tests |

## What ACEF Does Not Guarantee

| Threat | ACEF stance |
|---|---|
| User disables hooks or local plugins | no guarantee; CLI validators remain a backstop |
| Malicious process bypasses tool hooks | no OS-level guarantee |
| Agent forges editable prose | typed sidecars reduce but do not cryptographically eliminate risk |
| Agent fabricates a human approval receipt | no cryptographic guarantee; preserve the exact quote and source channel, and reconcile it to the client transcript at guarded/epic gates |
| Runtime environment lies about command output | require raw evidence hashes, runner headers, runner proofs, and reproducible command records |
| Agent forges self-consistent evidence inputs (fresh-read scripts, reachability graphs, runner proof) | no guarantee; inputs are trusted as authored; the keyless self-hash and agent-supplied specs/graphs pass a self-consistent forgery; these mechanisms defend against honest evidence gaps, not a forging author |
| Harness does not propagate worker identity into hook env (e.g. Claude Code subagents) | no per-actor proof; the hard wall degrades from per-actor to scope-level enforcement — a guarded write is gated on the conductor-written active worker scope (implementation phase + allowedPaths) rather than on a proven actor identity. The scope file remains the trust anchor (workers cannot forge it); set `ACEF_WORKER_ID` to restore the strict per-actor check |

## Evidence Standard

An ACEF evidence record should bind the result to:

- repository commit or tree;
- dirty-worktree digest, or the literal `clean` state;
- exact command;
- exit code;
- runner proof generated from command, exit code, actor/story, repository state, and raw artifact hash;
- relevant runtime/tool versions when available;
- raw output artifact path and hash when output is large;
- ACs or gates it satisfies;
- the **surface(s)** the work touches, each with surface-appropriate proof:
  - *persistence surface* — a read produced by a **separate process / fresh connection** from the writer; a same-process read does not evidence durability;
  - *user-facing surface* — a reachability proof from a real entrypoint (an isolated render that nothing links to is `PARTIAL`).

`UNKNOWN`, `STALE`, and `PARTIAL` are not hard-gate PASS states.
