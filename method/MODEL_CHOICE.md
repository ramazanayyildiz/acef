# Model choice

One rule for every agent, Claude or Codex, in every host, whenever it starts a subagent or a Codex run.
Owner decision 2026-10-27 (Ram). Why: one host's coordinator ran almost every agent on Opus, mechanical work included,
and used up the usage limit; long-waiting agents with 300–600k context kept waking up to poll queued test runs.

**Where this page applies.** Every actor admitted through ACEF routing follows the policy file
`method/model-routing-policy-v1.json` (installed as `.acef/model-routing-policy.json`, host overrides kept): Full
capsule-supervisor roles and the Fix/Standard dispatches of runs bound to `admitted-role-routing-v1`. There the policy
wins and the hard-wall rejects any other model or effort; for example a Standard developer must run at sol/high even
though this table would say medium. The table and the effort rules below govern the free choices: ordinary Claude
Code subagents, Codex runs and tours that ACEF routing does not admit.

**Admitted roles on Claude: per-role models.** Each policy role has an execution class, and each provider maps the
classes to models. A provider can also name a model for one role (`providers.<id>.roleModels`), which wins over its
class. The model is resolved in this order, by one shared function (`resolveRoleRuntime` in
`scripts/lib/acef-model-routing.js`) that the launcher, hard-wall, validator and `acef-state` all use:

1. the run's host override for that role: `acef-state active-run --routing-role-model <role>=<model>`, recorded as
   `routingRoleModels` on the active run (`<role>=` clears it);
2. the policy's `roleModels` for that role (a `null` value skips to step 3);
3. the policy's class mapping, `models[executionClass]`.

Effort always comes from the role's `reasoningTier`, whichever step picked the model. Default anthropic routing
(owner decision 2026-10-27):

| Role | Claude model | Source |
|---|---|---|
| conductor, atdd, development | `claude-sonnet-5-5` | class |
| code-review | `claude-sonnet-5-5` | class |
| patch-assurance, process-judge, epic-process-judge | `claude-opus-5-5` | `roleModels` |

Development stays on Sonnet unless a host overrides it. This matches the table below: critical development may stay
on Sonnet when an Opus review follows, and Patch Assurance and the Judges are that review.
Cost note: review roles only. Hosts that run admitted roles on anthropic see Patch Assurance and both Judges move from
Sonnet to Opus after `update-acef-installation`; no other role changes. OpenAI/Codex is unchanged: `gpt-6.1-sol` for
every role, effort by the role tier, and no `roleModels` by default.

**No downgrade of review roles** (owner decision 2026-10-27). For `code-review`, `patch-assurance`, `process-judge`
and `epic-process-judge` the model never goes below the ACEF floor. Floors and model strength come only from the
ACEF-owned `method/model-review-floors-v1.json` (installed as `.acef/model-review-floors.json`, reset on every update,
loaded apart from any host policy). Its `modelRank` lists models weakest first: anthropic `claude-sonnet-5-5` <
`claude-opus-5-5`; openai `gpt-6.1-sol` < `gpt-6-astra` (ranking Astra does not choose it: Astra is still used only
when Ram names it); `gpt-6.1-terra` is unranked. A review-role model missing from `modelRank` is rejected.
- Host policy, whichever file wins (`docs/ai/ACEF_MODEL_ROUTING_POLICY.json` or `.acef/model-routing-policy.json`): each
  review role at or above its floor, or the provider lists `roleModelExemptions.<role>` with a reason. A host can add
  exemptions; it cannot remove or lower floors. Checked when a role resolves, and by `update-acef-installation` before
  it writes anything: a violation stops the update, leaves the host unchanged and prints the exemption line to add.
- Run override: at or above the policy's model, or the run records
  `--routing-role-model-exemption "<role>: <reason>"` (stored as `routingRoleModelExemptions`, shown by `acef-next`;
  `"<role>:"` clears it). `acef-state` refuses the write; the hard-wall and the validator refuse the dispatch.
- `development`, `atdd` and `conductor` stay freely overridable, also with unranked models.

A host changes a role permanently in its `.acef/model-routing-policy.json` (for example
`"roleModels": { "development": "claude-opus-5-5" }`), or for one run with `--routing-role-model`. Role keys must be
canonical policy roles (`code-review`, not `reviewer`); an unknown key fails validation, also when it is already
stored on an active run. Model ids share one grammar (`MODEL_ID_SOURCE`: letters, digits, `.`, `_`, `-`, `:`, `/`),
which the hard-wall also uses to read `--model` from shell dispatches. `update-acef-installation` merges the policy
three-way, so a host's own per-role values and exemptions survive updates, and new ACEF per-role defaults the host
never named are added. Consumers reach the routing library through `scripts/lib/acef-routing-selection.js`: if a host
kept an older library that cannot honor per-role routing in play, they fail with an error naming the library, never
fall back silently.

## Which model

Pick the class from the work, not from the size of the diff.

| Class | Examples | Claude | Codex |
|---|---|---|---|
| critical | money, tenancy, permission, data loss, migrations, concurrency/locks: development AND review of that code; deciding whether a test can really fail | Opus | gpt-6.1-sol, high |
| standard | normal feature development, light-slice review, design checks | Sonnet. Development of critical code may also stay on Sonnet when an Opus review follows. | gpt-6.1-sol, medium (the standard review setting) |
| mechanical | renames, test-only fixture changes, ACEF adoption/update PRs, conflict resolution in merge prep, cleanup | Sonnet | gpt-6.1-sol, low (owner decision 2026-10-27) |
| light | summarising long logs or junit, sorting failures against a known list, formatting reports/handoff/PR text, translation | Haiku | gpt-6.1-sol, low |
| browser tours / exploratory UI | user-goal and exploration tours | — | gpt-6.1-terra |
| trivial lookup | PR state, file lists | the coordinator itself from the shell, no agent | — |

- Cleanup that deletes data, databases or worktrees is never Haiku: Sonnet or the coordinator itself.
- Codex keeps one model (sol) and varies effort. Only terra is a different model, and only for browser work.
- Astra (gpt-6-astra) only when Ram names it.
- Model ids: Opus = `claude-opus-5-5`, Sonnet = `claude-sonnet-5-5`, Haiku = the current Haiku id of the host's Claude
  Code. Update this page and the policy when a model generation changes.

## Effort

**Principle.** Effort follows the cost of an undetected mistake and the depth of reasoning needed, not the size of the
change. A 2,000-line rename is low; a 10-line lock-order change is high.

**Four questions.**
1. What does a mistake that slips through cost? Money, data loss, permission, migrations → raise. Copy, screens,
   tests, docs → lower.
2. Will a later step catch it? Nothing checks after this step (final review, merge decision) → raise. An independent
   review or test follows → lower.
3. How deep is the reasoning? Interacting constraints (concurrency, invariants, edge cases, design) → raise. Following
   a clear spec → lower.
4. Did it fail before? The same task failed twice, or the review keeps looping → raise.

**Levels.**
- **low**: mechanical work, formatting, summaries, ACEF updates.
- **medium** (default): normal development and most reviews. Evidence: ACEF V327-CAL-001 blind judge, review at medium
  30/30 against high 28/30. More effort is not automatically better; it can add noise and latency.
- **high**: writing money/permission/data code; the final review of critical-class code (money, permission, data) or
  of deep reasoning (concurrency, invariants, design) when nothing reviews after it; judging whether a test can really
  fail. Being the last review does not raise effort on its own: a routine light slice's only review stays medium.
- **xhigh / max**: never by default. Only for a stuck problem (the same error twice) or a hard design question such as
  lock order.

**Escalation.** On a failure or a review loop, raise effort one level, not straight to max. The next task starts at its
normal level again.

**Don't pay twice.** Questions 1 and 2 combine. If a high-effort review follows, the author may run at medium. High at
every step pays twice for the same safety.

**Measure.** Dev and review reports record the model and effort used (`Model:` and `Effort:` lines in the slice
templates). The weekly retro (`method/WEEKLY_RETRO.md`) compares review rounds and escaped defects by effort, so these
defaults are corrected from data.

**Where effort is set.**
- Codex: per run, `-c model_reasoning_effort=<low|medium|high>`.
- Claude Code: a subagent's effort comes from its agent definition (`.claude/agents/*.md` frontmatter), unless the user
  explicitly asks for a level. On the Claude side these levels therefore apply through agent definitions: keep one
  definition per class you use, rather than asking for an effort per call.

## A project's own decision wins

A project's recorded decision (HANDOFF, AGENTS.md, agent memory) wins over this table for free choices. Example of a
valid override: B2Press runs Claude developer subagents on Sonnet and reviews on Opus, including for critical slices;
the Opus review is the critical-class step there. For admitted roles the default anthropic routing now expresses the
same split (see per-role models above), and a host changes any single role in its `.acef/model-routing-policy.json`
`roleModels` (kept across ACEF updates) or per run with `--routing-role-model`.

## Waiting

- Run long tests as background jobs with a completion notification. Never wake an agent repeatedly to poll: an idle
  agent costs nothing, while each check-in re-reads its whole context.
- Before a long wait (over ~30 min), or once an agent's context passes ~300k tokens, hand off: write a short state
  note, end the agent, and start a fresh one from the note when the result arrives.
- Do not start a "watcher" model to wait.
- A long-running session (a coordinator, a main session) moves to a new session after its 3rd compaction or 24 hours
  open, whichever comes first. Before it ends, it writes the project's handoff note (HANDOFF.md or the file the project
  names) with the live state, open items and any decision that exists only in chat; the new session starts from that
  note. Each compaction drops detail and every turn re-reads the whole context. No one has to remember this: the
  Claude Code hook `scripts/acef-session-rotation` tells the session and the owner, and the daily review lists the
  sessions past the point under "Rotation due".

## Log it

When a task clearly ran on a higher class or effort than it needed, or used up the limit, log it:
`acef-note add <project> --tags sizing,method --what "model choice: ..." --fix "..." --cost <time or tokens>`
(`method/FEEDBACK_LOOP.md`). The tag list is closed and has no model tag, so start the text with "model choice:" to
make it searchable.
