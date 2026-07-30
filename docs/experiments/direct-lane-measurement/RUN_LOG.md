# Direct Lane Measurement Run Log

## 2026-07-30 — OpenCode provider preflight

The first counted Codex baseline run completed and was recorded. The following OpenCode baseline process remained alive
for more than six minutes without changing any file or producing a completed transcript. The measurement runner was
stopped before that run produced a result row.

Initial correction attempt: add OpenCode's documented `--auto` flag for noninteractive permission handling. A minimal
`READY` preflight still stalled. Debug logging then identified the actual provider error before any task execution:

```text
AI_APICallError: Insufficient balance or no resource package. Please recharge.
providerID=zai-coding-plan modelID=glm-5.2
```

Final correction: keep `--auto` and pin all OpenCode matrix runs to
`opencode/deepseek-v4-flash-free`. A minimal no-tool preflight returned `READY` with exit 0. This fixes the client model
before any OpenCode task outcome exists; task prompts, repositories, fixtures, lanes, metrics, scoring, and
preregistered thresholds are unchanged. The incomplete run ID was not recorded and will be run once after the
correction.
