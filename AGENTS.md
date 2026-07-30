# AGENTS.md

This is the short entry point for fresh agents working on ACEF.

## Lane Entry

Before bootstrapping the normal ACEF lifecycle, read `skills/acef/SKILL.md` and `skills/acef-router/SKILL.md` and
evaluate whether the work qualifies for the `direct` lane.

- Use `direct` only for a reversible, contained change with one technical boundary and one product surface.
- Record it in `docs/ai/ACEF_DIRECT_RUN.json` through `acef-state direct-run`.
- Promote before continuing when persistence, security/privacy, money, provider integration, realtime,
  concurrency/fencing, state-machine, tracking/reporting/analytics, a new pattern, scope expansion, test weakening, or
  failed verification appears.
- Do not bootstrap the active-run ledger, worker/reviewer actors, or the full lifecycle for a valid direct task.

## First Checks

Before reporting that an ACEF flow, gate, lane, reviewer, worker role, hook, validator, or enforcement change is
implemented, inspect the repo truth:

1. Read `docs/ai/capabilities/*.json` if present.
2. Read `CHANGELOG.md` for the human-readable framework history.
3. Run `node scripts/acef-process-validator --repo . --check capability-change`.
4. Report the smallest honest status from the capability record: `documented-only`, `specified`, `wired`, `enforced`,
   `proven`, or `installed`.

Do not call a capability implemented when only markdown changed. If only method docs changed, it is `documented-only`.

## Core Rule

ACEF claims are not evidence. Repository files, validators, tests, installed hooks/tools, and runtime evidence are the
evidence. Keep that boundary intact.
