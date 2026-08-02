# Execution Assurance v3.4 preparation result

Status: **GO for a separately frozen scored candidate; not yet scored or proven.**

The draft preflight passed the task binding, collaboration canary, environment probe, and reference validation from a
clean runner tree. It bound candidate `1deadd49876af1c0deca4f40dfb08c84aff28787` and runner
`fd08221770c7645625e41fb05aef187c99d99276`. All four unchanged frozen stories were behaviorally red at the pinned
source commit and green after their scoped canonical patches. The immutable preparation artifact is
`preparation-preflight.json` (SHA-256
`5bdedcaf4798333240435e5c8841274943c0c87a6ec4609bdd193603279fdce2`).

The v3.4 recovery gates now have mechanical evidence:

1. Four-actor-v3 ATDD evidence refuses to persist unless the test-only red tree is committed, clean, and descended
   from the actor input commit.
2. `ACTOR_RESULT=PASS` and `ACTOR_RESULT: PASS` normalize to the same typed result; other values still fail closed.
3. Reviewer completion is parsed from the exact `acef-state review-completion` tool stdout rather than final prose.
4. `functions.exec`-wrapped `exec_command` calls are visible to command metrics and reviewer mutation checks.
5. Reviewer report paths are derived from the exact task name and remain bound to the actor record, report hash, and
   input tree.
6. Reviewer shell access is restricted to one literal read-only command per call; dynamic, chained, substituted, or
   mutation-capable commands remain rejected.

The capability remains `enforced`. This preparation result authorizes freezing one new scored v3.4 candidate. It does
not alter the immutable v3.3 FAIL and does not justify a `proven` or rollout claim.
