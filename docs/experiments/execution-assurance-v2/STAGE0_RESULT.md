# Stage 0 Result

Verdict: **PASS (6/6)**

- Candidate framework commit: `076812348e1c88eb9139230a1cc2c9107dff9a12`
- Experiment runner commit: `e9eebb35c11f659f05b37392cbd7268bd4d2d0ba`
- Runner worktree before execution: clean
- Raw append-only rows: `runs/stage0.jsonl`

| Trap | Result | Runtime |
| --- | --- | ---: |
| Guarded routing sweep | PASS | 0.872 ms |
| Oversized-scope rejection | PASS | 0.061 ms |
| Duplicate lifecycle detection | PASS | 0.725 ms |
| Out-of-scope write denial | PASS | 1217.418 ms |
| Dirty-worktree denial | PASS | 1092.732 ms |
| Broken-environment preflight | PASS | 610.681 ms |

The harness shakeout before the scored run exposed twelve missing Guarded vocabulary cases and one contained-delete
false positive. The production policy and its regression tests were corrected before the candidate commit was pinned.
The scored run then passed from a clean tree. This is mechanism evidence only; it does not establish delivery speed,
product quality, `proven`, or `installed` status.
