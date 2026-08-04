# Execution Assurance v3.28 rehearsal

This is the one immutable successor to V3.27. It freezes candidate commit
`d7b58f99afa90359f318c8213cd35aff2bb1f1af`, whose only lifecycle repair is a bounded post-red semantic ATDD
correction. The V3.27 fixture, four-story inventory, four-role topology, provider-neutral runtime matrix, one Epic
integration run, and independent terminal Epic Judge remain unchanged.

The new transition is admissible only when the original Developer identifies a semantic test-harness defect after red
evidence but before any application/test mutation. It must restore the clean original-red commit and emit a canonical
findings blob/hash. The deterministic state writer binds that Developer, the original ATDD actor and failing evidence,
the exact replayable command/discovery argv, explicit frozen test paths, and the saved Development worker scope.

The supervisor then commits only the correction control transition and dispatches one fresh ATDD correction actor at
`gpt-5.6-sol/high`. That actor may change and commit only the bound tests and must produce a new genuine failing red
receipt with the supervisor-owned identity. The original Developer is resumed with exactly one `followup_task`; it is
not replaced or respawned. A second correction, scope expansion, production write, non-red replacement, forged
identity, missing binding, or missing Developer continuation is a fail-closed `REPLAN/SPLIT`.

The calibrated role matrix is unchanged: conductor and Code Review use `gpt-5.6-sol/medium`; ATDD, Development, Patch
Assurance, conditional Process Judge, and Epic Process Judge use `gpt-5.6-sol/high`. Mechanical state and supervisor
work remains model-free. The target remains 45 active minutes, each story is capped at 15 active minutes, and the hard
run cap is 60 active minutes. Productive child execution is excluded from coordination-idle wait.

This attempt is sleep-inhibited, fail-closed, and may run exactly once. There is no automatic retry. A judgeable packet
is followed by one fresh external blind Judge using the terminal high-tier Judge runtime. Because this is a
non-promotable rehearsal, even a PASS permits only a separately reviewed controlled-canary decision.
