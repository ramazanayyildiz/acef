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

## Which model

Pick the class from the work, not from the size of the diff.

| Class | Examples | Claude | Codex |
|---|---|---|---|
| critical | money, tenancy, permission, data loss, migrations, concurrency/locks: development AND review of that code; deciding whether a test can really fail | Opus | gpt-6.1-sol, high |
| standard | normal feature development, light-slice review, design checks | Sonnet. Development of critical code may also stay on Sonnet when an Opus review follows. | gpt-6.1-sol, medium (the standard review setting) |
| mechanical | renames, test-only fixture changes, ACEF adoption/update PRs, conflict resolution in merge prep, cleanup | Sonnet | gpt-6.1-sol, low (default pending Ram's confirmation) |
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

A project's recorded decision (HANDOFF, AGENTS.md, agent memory) wins over this default. Example of a valid override:
B2Press runs Claude developer subagents on Sonnet and reviews on Opus, including for critical slices; the Opus review
is the critical-class step there. A host override of the routing policy goes in its `.acef/model-routing-policy.json`
(kept across ACEF updates).

## Waiting

- Run long tests as background jobs with a completion notification. Never wake an agent repeatedly to poll: an idle
  agent costs nothing, while each check-in re-reads its whole context.
- Before a long wait (over ~30 min), or once an agent's context passes ~300k tokens, hand off: write a short state
  note, end the agent, and start a fresh one from the note when the result arrives.
- Do not start a "watcher" model to wait.

## Log it

When a task clearly ran on a higher class or effort than it needed, or used up the limit, log it:
`acef-note add <project> --tags sizing,method --what "model choice: ..." --fix "..." --cost <time or tokens>`
(`method/FEEDBACK_LOOP.md`; the tag list is closed, so start the text with "model choice:" to make it searchable).
