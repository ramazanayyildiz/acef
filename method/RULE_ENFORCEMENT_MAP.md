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
| Verification requires clean tree | validator CLI | machinery | `scripts/acef-process-validator --check clean-tree` blocks certification on uncommitted or untracked changes. | P0 |
| 2x `REPLAN` escalates to human | validator CLI | machinery | `scripts/acef-process-validator --check replan-counter`; hook/CI wiring still pending. | P0 |
| Artifact-claim reconciliation | validator CLI | machinery | `scripts/acef-process-validator --check claims`; hook/CI wiring still pending. | P0 |
| Epic N+1 blocked until Epic N Process Judge is `PASS` | hook partial + validator CLI | machinery | Hook exists for story commands; `--check epic-boundary` validates ledger/artifacts. | P0 |
| Seeded epic gates exist before implementation | validator CLI | machinery | `scripts/acef-process-validator --check seeded-epic-gates`; hook/CI wiring still pending. | P0 |
| Adapter fresh before any route | validator CLI | machinery | `scripts/acef-process-validator --check adapter-freshness`; hook/CI wiring still pending. | P0 |
| Preflight `PASS` before planning/implementation | validator CLI | machinery | `scripts/acef-process-validator --check preflight`; hook/CI wiring still pending. | P0 |
| Step ledger entry exists before workflow/read/task execution | hook partial + validator tests | machinery | ACEF/BMAD guard hook blocks phase/story Bash commands until the ledger row is `IN PROGRESS`; wider tool coverage can mature later. | P0 |
| Guarded test floor has at least one symbol-grounded boundary test | documentation-only + sharded Test Author | machinery + shard | Validate boundary symbol reference plus independent Test Author artifact. | P1 |
| Actor separation | documentation + partial shard | shard + machinery | Harness must spawn distinct identities; ledger can validate identity fields. | P1 |
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

1. `REPLAN` counter validator. `scripts/acef-process-validator --check replan-counter`
2. Claimed-output path-exists validator. `scripts/acef-process-validator --check claims`
3. Epic gate state validator. `scripts/acef-process-validator --check epic-boundary --target-epic N`
4. Seeded epic gate existence validator. `scripts/acef-process-validator --check seeded-epic-gates`
5. Adapter freshness validator. `scripts/acef-process-validator --check adapter-freshness`
6. Preflight `PASS` validator. `scripts/acef-process-validator --check preflight`
7. Step-ledger-before-tool-use hook. Pending.

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
