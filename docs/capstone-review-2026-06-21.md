# ACEF Capstone Review — 2026-06-21

Scope: holistic review of the current validator + guard hook system after P0/P1/PARTIAL/P2 hardening.

## Verdict

The main ladder is now load-bearing:

- P0 process checks exist as validator or hook gates.
- P1 pattern/conformance checks exist as validator and pre-write hook gates.
- `PARTIAL` registry work is blocked unless the ledger declares a covered `workShape` or records human risk acceptance.
- P2 finding promotion and graduation reconciliation prevent findings from disappearing into chat-only promises.
- `session-handoff` gives compaction-safe resume state.
- `clean-tree` prevents certification on a dirty working tree.

Regression entrypoint:

```bash
node scripts/test-acef-process-validator
```

## Capstone Findings

### 1. Hook ledger scope is coarse

The guard hook reads all delivery/audit/ledger files under `docs/ai/` and `_bmad-output/`.

That is acceptable for v1 because it prevents missing evidence, but it can be too permissive: an old ledger may contain
reuse evidence, human risk acceptance, or do-not-copy rejection text that lets a later write pass.

Next hardening: add an active-ledger marker or environment variable, then make the hook prefer that ledger before
falling back to all ledgers.

### 2. Validator and hook duplicate parsing logic

The validator and hook separately parse:

- ledger fields such as `track:` and `workShape:`;
- human risk acceptance phrases;
- pattern registry terms;
- do-not-copy rejection context.

This keeps the hook portable today, but drift can appear if one parser changes and the other does not.

Next hardening: extract shared parsing helpers or add mirrored tests that run the same fixture through both surfaces.

### 3. `all` is a certification profile, not a development profile

`--check all` includes `clean-tree`, so it is intentionally strict. It should be used at certification, Process Judge,
handoff, or CI boundaries.

During active authoring, run targeted checks instead of `all`.

### 4. Step-ledger hook coverage is intentionally partial

The hook blocks known phase/story Bash commands until a ledger row is `IN PROGRESS`. It does not cover every possible
tool invocation shape in every agent runtime.

Next hardening: expand coverage only after observing real bypasses; avoid turning the hook into a brittle command
parser too early.

### 5. Path reconciliation is strict by design

Graduation reconciliation only accepts allowlisted repo roots such as `docs/`, `scripts/`, `method/`, `skills/`,
`claude-plugins/`, `.github/`, and normal source roots. Bare prose paths such as `realcheck.js` are not accepted.

This avoids treating arbitrary text as evidence.

## Recommended Next Slice

Do not add a new large validator yet.

Recommended next slice: active-ledger scoping for the hook.

Goal: prevent stale ledger evidence from satisfying current implementation writes while keeping the hook simple.

