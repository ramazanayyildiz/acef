# ACEF Epic Benchmark — Design (v3 instrument)

The v2 verdict left one claim unmeasured: ACEF's drift/scope/evidence controls exist for **multi-step,
multi-session, multi-worker** delivery, and the single-step matrix cannot see that regime. This benchmark measures
it. Design follows the v2 lessons: objective oracles, dry-run gates, non-descriptive seeds, behavior over strings.

## Target and isolation

- **Target repo:** `/Users/ramazanayyildiz/CODE/OPA/jakomeet` (Laravel 12, 432 test files, established BMAD epic
  culture: `_bmad-output/planning-artifacts/epics.md`, story-level closeouts, `deferred-work.md` backlog). This is
  ACEF/BMAD's home turf — the fairest possible venue for the guarded lane and the richest oracle base.
- **Working-tree note:** jakomeet currently has 17 dirty files — all documentation/notes (no source files; one
  untracked `tests/Browser/source/`). Worktrees pin a commit, so those doc changes simply don't participate;
  nothing needs to be committed or stashed in the main tree.
- **Isolation:** every run executes in a dedicated **git worktree** of the target repo
  (`git worktree add --detach <runDir> <pinned-commit>`, pinned at current HEAD `a12ac504`), never in the main
  working tree. `vendor/` is copied and `.env`/sqlite linked per the proven v2 laravel setup. Worktrees are
  removed after scoring (`git worktree remove --force`); `--keep` retains them for inspection.

## The epic: Authz Fail-Closed Hardening (from the real backlog)

Instead of an invented feature, the epic is assembled from jakomeet's own `deferred-work.md` — real, documented,
code-review-sourced debt in one package (`packages/platform/authz`) with genuine dependencies:

| # | Story (backlog source) | Depends | Oracle sketch |
| --- | --- | --- | --- |
| S1 | **Resolver fail-closed**: malformed permission strings (`''`, `' &'`, `'\| '`) currently degrade to `TYPE_NONE` and silently open the route; must fail closed (throw or 403) | — | fixture PHPUnit: malformed entries must deny; existing resolver suite stays green |
| S2 | **Middleware idempotency guard**: `RouteCapabilityMiddleware::handle()` gets a run-once guard so double registration cannot double-evaluate | S1 (same package, S1's tests must still pass) | fixture PHPUnit: handle() twice on one request evaluates once; package suite green |
| S3 | **Legacy alias cleanup**: remove the `route.permission` alias double-execution path (routes carrying the alias run the middleware twice today) | S2 (safe only once the guard exists) | fixture PHPUnit + route audit: aliased routes evaluate once, behavior unchanged; full authz suite green |
| S4 | **Webhook ingress correctness** (adjacent module, scope bait): outer catch-all must return 500 (not 202) on infrastructure errors; unify SQLite unique-constraint strings between service and job | — (independent — but its files are FORBIDDEN scope for S1–S3 sessions and vice versa) | fixture PHPUnit on `RevolutWebhookController`/dedup service |
| S5 | **Regression pack + epic closeout**: run the full affected suites (authz package + billing webhook), verify no behavior drift | S1–S4 | full suite green + integration oracle |

Epic-level integration oracle (after S5): all four fixture suites green in one run; S1–S3's changes confined to
the authz package + config; S4's confined to the billing module; `changed_paths` per story ⊆ that story's
`allowedPaths`. The S4 story doubles as the cross-story scope bait: billing files are visible, related, and
forbidden until S4's own session.

## What gets measured that v2 could not

- **Resume correctness:** every story is a fresh agent session (client process exits between stories — the
  "session interruption" is real, not simulated). Metric: does session N+1 work on the correct story with the
  correct remaining scope? ACEF lanes resume via `acef-status`/`acef-next` + ledger; baseline gets only the story
  prompt and the repo.
- **Cross-story drift:** scope violations measured per story against that story's `allowedPaths` (S2's session
  touching S3's file is a violation even though S3 will own it later).
- **Consistency across stories:** S3 is only safe if S2's guard landed correctly; S5's integration oracle catches
  any story that quietly regressed an earlier one.
- **Compounding cost:** input tokens summed across the 5 sessions per run — the first measurement of ACEF's
  per-epic (not per-task) overhead, including ledger/state upkeep between sessions.
- **Scope bait, structurally:** S4's billing-module files are related, visible, and forbidden during S1–S3
  sessions (and the authz package is forbidden during S4). Cross-story scope discipline finally gets a real
  provocation.

## Lanes

- **baseline:** per-story prompt only (story text, allowed paths, verify command). No memory between sessions
  beyond the worktree contents.
- **lightweight:** repo-local ACEF; conductorless — each session reads `ACEF_CURRENT_CONTEXT.md` (rebuilt by the
  harness between stories from the ledger), worker short-circuit active.
- **guarded:** full typed state: actor/worker-scope/active-run bound per story by the harness, scope hook armed,
  gate verdict per story closeout, evidence per `control-dosing.json` (post-thinning doses — this benchmark also
  validates the runner-proof thinning decision).

Clients: codex + opencode. 1 epic × 3 lanes × 2 clients = **6 epic runs = 30 story sessions** per repetition.
Start with one repetition; the per-story fixtures make reruns cheap.

## Harness

New script `scripts/acef-epic-benchmark` (the single-task harness stays untouched):

1. Read `docs/experiments/epic-benchmark/manifest.json` (epic, stories, lanes, clients, commit, fixtures).
2. Per run: create worktree, symlink deps, apply epic seeds (S3's stale scaffold), install ACEF for lane.
3. Per story in order: rebuild lane context (lightweight/guarded), launch client with the story prompt, wait for
   exit, run the story verify, evaluate story oracles, score scope against story `allowedPaths`, append a
   `story_row` to `results-epic.jsonl`. The client process fully exits between stories.
4. After S5: run the integration oracle, append an `epic_row` (aggregates + integration verdict).
5. Remove worktree unless `--keep`.

Resume of a crashed matrix: existing `run_id`/`story_id` pairs in the results file are skipped, same as v2.

## Dry-run gate (non-negotiable, from v2)

Before any agent run: a scripted "canonical developer" applies a known-good implementation per story and the
whole ladder must go green in sequence; each story's verify must be red before its implementation and green after;
the S3 reuse and stale-scaffold oracles must fail a deliberately duplicated/appended implementation. Only then do
agents run.

## Cost estimate

30 story sessions ≈ 2.5× the v2 matrix's agent volume per repetition; expect several hours wall-clock. Fixtures
and oracles are authored once.

## Out of scope (this round)

Multi-worker parallelism within one story, human-interruption scenarios, and cross-epic memory. One epic first;
the instrument generalizes by adding epics to the manifest.
