# ACEF Trust Model

ACEF is a local-first delivery policy layer for AI coding agents. It reduces accidental process drift; it is not an OS
sandbox or malicious-code security boundary.

## What ACEF Is Designed To Catch

| Threat | ACEF stance |
|---|---|
| Agent loses context and skips a gate | prevent or detect with active run, ledger, guard, and process validator |
| Worker edits outside story scope | prevent or detect with worker scope and guard checks |
| Reviewer approves own work | prevent with actor records and Process Judge checks |
| Story closes without runtime evidence | prevent with evidence manifests and runtime smoke gates |
| Epic starts from vague "go on" | prevent with explicit approval receipts |
| Retrieval returns stale story context | detect with story/role-scoped current context and query tests |

## What ACEF Does Not Guarantee

| Threat | ACEF stance |
|---|---|
| User disables hooks or local plugins | no guarantee; CLI validators remain a backstop |
| Malicious process bypasses tool hooks | no OS-level guarantee |
| Agent forges editable prose | typed sidecars reduce but do not cryptographically eliminate risk |
| Agent fabricates a human approval receipt | no cryptographic guarantee; preserve the exact quote and source channel, and reconcile it to the client transcript at guarded/epic gates |
| Runtime environment lies about command output | require raw evidence hashes and reproducible command records |

## Evidence Standard

An ACEF evidence record should bind the result to:

- repository commit or tree;
- dirty-worktree digest, or the literal `clean` state;
- exact command;
- exit code;
- relevant runtime/tool versions when available;
- raw output artifact path and hash when output is large;
- ACs or gates it satisfies.

`UNKNOWN`, `STALE`, and `PARTIAL` are not hard-gate PASS states.
