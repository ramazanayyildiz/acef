# Cockpit Tool Decodes — Watchfire, Archon, Chorus (2026-07-07)

Three tools from the `method/ACEF_COCKPIT.md` borrow table were decoded by parallel research agents to verify they
exist, are alive, and to extract enforcement-relevant mechanics for the agent-drift problem. All three verdicts:
**BORROW, none USE.** This validates the reassessed cockpit direction: buy/borrow the shell layer, keep authority in
ACEF.

## Scoreboard

| | Watchfire | Archon (coleam00) | Chorus (chorus-ai.dev) |
|---|---|---|---|
| Identity | github.com/watchfire-io/watchfire (Go) | github.com/coleam00/Archon (TS, v2 rewrite) | Chorus-AIDLC/Chorus — **not chorus.sh** (that is Melty Labs' multi-LLM chat app; naming coincidence) |
| Aliveness | Weekly releases, pushed 2026-06-30 | 22.7k stars, 41 contributors, pushed 2026-07-04 | 1k stars, ~solo, v0.13.1 shipped 2026-07-07 |
| Claimed strength, verified | Sandbox genuinely kernel-level (macOS Seatbelt / Linux Landlock) | Approval gates genuinely runtime-owned (DB `paused` state + out-of-band human resume) | Audit trail thinner than advertised: coarse task events only, no per-tool-call provenance, no diffs, no export API |
| Honest gaps | Silent unsandboxed fallback on bare Linux/Windows; zero network egress control on every platform | Non-interactive loops trust the AI's own `ALL_TASKS_COMPLETE` signal — prompt-level, bypassable | Activity stream is P1 project-level UI chrome over an immature event log |
| Verdict | BORROW | BORROW | BORROW |

## Steals, organized by drift type

### Scope drift (writes outside allowed paths)

- **Watchfire**: sandbox profile generated per-task at runtime from a structured task file — the OS-level upgrade of
  `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` + hook enforcement. Default-deny for `~/.ssh`, `.env`, cloud creds,
  `.git/hooks` (not opt-in). Do not assume its network is contained — it is not, anywhere.
- **Chorus**: permission bits (5 resources x read/write/admin) decide which MCP tools even get **registered** for the
  session — prevention by construction, not detection. Session identity via one `checkin` call returning
  persona + permission set.

### Process drift (skipping gates, wrong order)

- **Archon**: gate = persisted DB run status (`paused`), checked at the orchestrator layer between DAG nodes; resumable
  only by an out-of-band human command (`/workflow approve <id>`) from a different channel. The agent cannot talk
  itself past the gate. This is the mechanical target shape for ACEF's pending P0 validator wirings.
- **Archon**: fail-closed condition evaluator — unparseable predicate evaluates `false`, never silently proceeds.
- **Archon**: no-silent-drop output refs — referencing a field outside the producer's declared output schema throws,
  preventing an agent from faking gate-passing data.

### Self-certification (dominant O2 failure class)

- **Chorus**: the "Done" transition is structurally human-only (agents can move cards to "To Verify"; only Admin/human
  closes) — the mechanical twin of the dev-done-vs-product-done rule.
- **Negative finding that matters**: even 22.7k-star Archon trusts model self-report on its autonomous loop path.
  Nobody in the market has solved self-certification mechanically. ACEF's persona-walk / adversarial-lens answer
  remains ahead of the market; the cockpit `product_done.self_certified_only` field stays load-bearing.

### Evidence economics

- **Watchfire**: per-task duration/token/cost ledger as a cheap mandatory evidence artifact.
- **Watchfire's own caveat matches O2**: transcripts are conversational logs, not verified behavior evidence — do not
  admit them as compliance evidence.

## Meta-signal

Watchfire and Chorus are both largely written by Claude Code (commits co-authored by the model). The shell layer is
now cheap to build; it is not where value lives. The governance/evidence model is.

## Provenance

Decoded 2026-07-07 by three parallel research agents (web + `gh` API, no clones). Compact reports merged here;
original agent reports were session-scoped and are not separately archived.
