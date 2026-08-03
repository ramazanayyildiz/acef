# Execution Assurance v3.14 story scope and structured receipt recovery

Status: **implementation and complete repository verification pass; rehearsal must be frozen separately.**

V3.13 proved canonical reviewer handoff on Stories 2–4, exact wrapped integration-command recognition, and typed
terminal non-PASS Epic durability. Its real rehearsal exposed four remaining orchestration/parser boundaries:

- Story 1 remained under `scopeUnit: epic` until review, so both one-shot reviewer completions failed mechanically;
- structured `custom_tool_call_output` blocks escaped the inner successful exit receipt;
- several reviewers batched otherwise read-only shell inspection; and
- the conductor changed working-tree state to the next story before committing the prior close package.

V3.14 narrows those freedoms:

- `acef-state active-run` rejects every frozen catalog story opened under epic scope;
- lifecycle integration evidence uses the existing block-aware output decoder before exit-code validation;
- reviewer prompts make the one-literal-command/one-exec rule apply to every inspection and completion call, while the
  transcript allowlist recognizes bounded `awk` and safe `git grep` reads without admitting separators or filters; and
- the compiled close contract requires the exact close package to commit before any next-story run/context/ledger write.

The real V3.13 transcript re-evaluates as one exact lifecycle command with a successful structured receipt and correct
story-result/Judge ordering. Focused state, experiment, process-validator, skill-validator, skill-installer, tool-
installer, and capability-change tests pass. The complete 30-entrypoint repository suite passed in 264 seconds.
Capability maturity remains `enforced`; implementation evidence does not make it `proven` or authorize a rehearsal
until a separate manifest is frozen.
