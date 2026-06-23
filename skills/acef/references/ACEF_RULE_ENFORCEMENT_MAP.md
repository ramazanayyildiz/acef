# ACEF Rule Enforcement Map

ACEF rules are not load-bearing just because they are written in a method document. A rule becomes load-bearing only
when it lives in one of these homes:

1. **Machinery** — hook, validator, CI, lint, or fitness function.
2. **Shard** — a fresh worker/reviewer/judge with a small scoped context.
3. **JIT injection** — the relevant rule or neighbor is surfaced at the moment of action.

Anything else is documentation-only. Documentation is useful for humans and harness authors, but it should not be
treated as enforcement.

## Enforcement homes

| Home | What it means | Attention dependency |
| --- | --- | --- |
| `machinery` | A tool blocks, validates, or fails deterministically. | None |
| `shard` | A fresh worker receives only the relevant artifact/diff/rubric. | Low |
| `jit` | A tiny rule/hint is injected at the moment it is needed. | Low |
| `documentation-only` | The agent must remember prose from the method docs. | High |

## Current rule map

| Rule | Lives today | Should live in | Gap to load-bearing | Priority |
| --- | --- | --- | --- | --- |
| Conductor cannot write implementation/BMAD artifacts | `machinery` via `acef-bmad-guard` | machinery | None. This is the exemplar. | Done |
| Codex worker scope checks | `machinery` via repo-local ACEF hook + optional Codex dispatcher + `.acef/bin/acef-codex-guard` | machinery | `scripts/install-acef-bmad-guard --repo <repo>` installs `.acef/hooks`; `--global-dispatcher` wires a tiny `~/.codex/hooks.json` dispatcher that only forwards to repos with a local engine. Run the CLI guard before commit/certification or from git hooks/CI as a backstop. | Done |
| OpenCode worker scope checks | `machinery` via repo-local ACEF hook + OpenCode `tool.execute.before` plugin | machinery | `scripts/install-acef-bmad-guard --repo <repo>` installs `.opencode/plugins/acef-bmad-hard-wall.js`; optional `--global-dispatcher` installs a user-level plugin that still dispatches to each repo's local `.acef/hooks` engine. | Done |
| Verification requires clean tree | validator CLI | machinery | `.acef/bin/acef-process-validator --check clean-tree` blocks certification on uncommitted or untracked changes. | P0 |
| 2x `REPLAN` escalates to human | validator CLI | machinery | `.acef/bin/acef-process-validator --check replan-counter`; hook/CI wiring still pending. | P0 |
| Artifact-claim reconciliation | validator CLI | machinery | `.acef/bin/acef-process-validator --check claims`; hook/CI wiring still pending. | P0 |
| Epic N+1 blocked until Epic N Process Judge is `PASS` | hook partial + validator CLI | machinery | Hook exists for story commands; `--check epic-boundary` validates ledger/artifacts. | P0 |
| Epic N+1 requires explicit human transition approval | typed receipt + hook + validator CLI | machinery | `acef-state approval --target-epic N --quote "Start Epic N"`; `--check epic-transition-approval --target-epic N` prefers the hashed human receipt. Generic "go on/devam/tamamla" is invalid. | Done |
| Seeded epic gates exist before implementation | validator CLI | machinery | `.acef/bin/acef-process-validator --check seeded-epic-gates`; hook/CI wiring still pending. | P0 |
| Adapter fresh before any route | validator CLI | machinery | `.acef/bin/acef-process-validator --check adapter-freshness`; hook/CI wiring still pending. | P0 |
| Preflight `PASS` before planning/implementation | validator CLI | machinery | `.acef/bin/acef-process-validator --check preflight`; hook/CI wiring still pending. | P0 |
| Step ledger entry exists before workflow/read/task execution | hook partial + validator tests | machinery | ACEF/BMAD guard hook blocks phase/story Bash commands until the ledger row is `IN PROGRESS`; wider tool coverage can mature later. | P0 |
| Worker stays inside one story/phase scope | hook + scope manifest | machinery | `docs/ai/ACEF_ACTIVE_WORKER_SCOPE.json` binds implementation workers to `activeStory`, `phase`, `allowedPaths`, one commit budget, no ledger edits, and no subagent spawning. | P0 |
| Guarded test floor has at least one symbol-grounded boundary test | validator CLI + sharded Test Author | machinery + shard | `--check guarded-test-floor` reconciles an exact boundary symbol to an asserted test and dedicated Test Author. | P1 |
| External framework API assumptions grounded before ATDD | shard + Process Judge | shard + machinery | Stories using third-party framework APIs require a spike/reference implementation before ATDD; fake descriptors, vendor overrides, monkey patches, and test-only shims are REPLAN triggers. | P1 |
| Runtime shortcuts cannot replace production entrypoint tests | shard + Process Judge | shard + machinery | Story/epic close requires real HTTP/CLI/queue/scheduler/CMS-runtime smoke with content or negative assertions when that runtime path owns behavior. | P1 |
| FRs trace to exercised capabilities, not artifacts | validator CLI + Process Judge | machinery | `--check vertical-slice` requires actor -> surface/entrypoint -> application path -> existing runtime evidence; artifact existence and manual-QA polish deferrals cannot satisfy missing user actions. | P1 |
| Fake-green tests cannot close gates | validator CLI + Process Judge | machinery | `--check test-authenticity` rejects warning-as-pass, silent catch/continue, self-referential assertions, and status-only runtime smoke. | P1 |
| Actor separation | typed sidecars + validator CLI | machinery | `acef-state actor` records story/phase actors; `--check actor-separation` requires six distinct full-BMAD actor records for typed runs. | Done |
| Worker scope identity | typed sidecar + hook/guard + validator | machinery | `acef-state worker-scope` writes the fail-closed scope; `--check worker-scope` reconciles story, phase, actor, base ref, and allowed paths. | Done |
| Runtime evidence integrity | typed sidecar + validator | machinery | `acef-state evidence-run` captures raw output/hash/commit/actor; `--check evidence-manifest` rejects stale, missing, escaped, or tampered evidence. | Done |
| Gate verdict integrity | typed sidecar + validator | machinery | `acef-state gate` requires evidence for PASS; `--check gate-verdict` reconciles Process Judge identity and successful evidence. | Done |
| Source reconciliation | validator CLI + planning shard | machinery + shard | `--check source-reconciliation` requires existing source paths and closed USED/NOT USED/CONFLICT decisions. | P1 |
| Subagent claims are not evidence | documentation-only | machinery + shard | Cited-path/command/artifact validator plus Process Judge. | P1 |
| Reuse-before-create | documentation-only | jit + shard | Write-time block plus conformance reviewer. | P1 |
| Conformance lens | documentation-only | shard | Fresh reviewer with diff + small rubric. | P1 |
| Pattern registry contract | validator CLI | machinery | `--check pattern-registry` validates required fields and evidence. | P1 |
| Reuse-before-create | validator CLI | machinery | `--check reuse-before-create` requires ledger evidence citing registry probe/golden neighbor. | P1 |
| Do-not-copy guard | validator CLI | machinery | `--check do-not-copy` fails if known legacy/risk entries are treated as reusable. | P1 |
| Pattern registry `PARTIAL` limits work | validator CLI + hook | machinery | `--check partial-workshape`; hook blocks implementation writes when ledger-declared `workShape` is missing/uncovered/guarded without human risk acceptance. | P1 |
| Finding promotion lifecycle | validator CLI | machinery | `--check finding-promotion` fails if a ledgered conformance finding has no patch/registry/check/defer disposition. | P2 |
| Graduation reconciliation | validator CLI | machinery | `--check graduation-reconciliation` requires promoted findings to point to an existing file or `enforcedBy:` value. | P2 |
| Session handoff state | validator CLI | machinery | `--check session-handoff` requires structured resume state in the delivery ledger, not adapter memory. | P2 |
| No raw hex / new dependency without decision | documentation-only/new | machinery | Lint/hook per stack. | P2 |
| Plan integrity / intent / altitude / taste | documentation-only | shard | Irreducible judgment; fresh Process Judge, never main-agent memory. | P2 |

## Cheap mechanical wins

Build these before growing more prose:

1. `REPLAN` counter validator. `.acef/bin/acef-process-validator --check replan-counter`
2. Claimed-output path-exists validator. `.acef/bin/acef-process-validator --check claims`
3. Epic gate state validator. `.acef/bin/acef-process-validator --check epic-boundary --target-epic N`
4. Epic transition approval validator. `.acef/bin/acef-process-validator --check epic-transition-approval --target-epic N`
5. Seeded epic gate existence validator. `.acef/bin/acef-process-validator --check seeded-epic-gates`
6. Adapter freshness validator. `.acef/bin/acef-process-validator --check adapter-freshness`
7. Preflight `PASS` validator. `.acef/bin/acef-process-validator --check preflight`
8. Step-ledger-before-tool-use hook. Pending.

These are mostly counters, path checks, and state checks. They convert the highest-risk documentation-only rules into
rules the agent cannot forget.

## Maturity rule

ACEF uses the same maturity ladder for its own process rules that it uses for repo conformance rules:

```text
documentation-only -> machinery/shard/jit -> retire duplicated prose
```

The map is a worklist, not a permanent registry. A row should either move toward load-bearing enforcement or be
demoted as non-load-bearing guidance.

## Success metric

Track:

```text
documentation-only load-bearing rules count
```

The number should trend toward zero. If it does not, ACEF is relying on agent memory and will degrade under context
pressure.

## Dogfood question

During Delta-3 validation, ask for each row:

- Did the agent have to remember this rule?
- Was it injected just in time?
- Did a fresh worker own the judgment?
- Did machinery make violation impossible?
- If the agent missed it, which enforcement home should it move to?
