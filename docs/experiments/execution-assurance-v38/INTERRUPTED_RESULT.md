# Execution Assurance v3.8 rehearsal interruption

Status: **INTERRUPTED / non-replayable — no automated result row, no blind Judge, no promotion.**

`REHEARSAL-v38` was intentionally stopped after 9 minutes 34 seconds of actor runtime when the live conductor proved
that the new Developer receiver-UUID contract was impossible under the pinned Codex CLI 0.146.0 interface. Replaying
the same attempt identity is prohibited.

## Observed evidence

- The conductor spawned `acef_s1_resolver_fail_closed_development`.
- The machine-observed `spawn_agent` output exposed only
  `{"task_name":"/root/acef_s1_resolver_fail_closed_development"}`.
- The harness separately observed hidden receiver thread UUID `019fc4a7-ed31-7631-a84a-b8d009a3dde6`, but that UUID was
  not returned to the conductor.
- The conductor therefore wrote Developer `sessionId=/root/acef_s1_resolver_fail_closed_development`.
- S1 had already produced test-only red commit `f96acdfa` and implementation commit `333ade2b`; this partial product
  work is disposable rehearsal evidence and is not imported into ACEF.

The parent runner was interrupted to avoid a known final-oracle failure. The orphaned actor process was then terminated
explicitly. `--pilot-finalize REHEARSAL-v38` refused to fabricate a result because the actor had started but exited
without a signed receipt. That refusal is correct: the attempt is consumed and must be adjudicated rather than replayed.

## Integrity bindings

- Raw actor stream SHA-256: `56a3ae5dadb1e04134109bb871169cacab423ed21c4bf02232869c015ae2106f`
- Conductor session SHA-256: `999678fa9647f6c3f83792ea95269617541bea31b5811167a9e6771fed2296a9`
- Developer actor record SHA-256: `3e43794698eeb1ed60c1dd9fa87bf34d7ae4bf61a3bc08dbb5894c02b781b8e4`
- Disposable clone HEAD/tree at interruption:
  `333ade2b541406cd77935279b48b53faff867938` / `2bc41679dfde1ffbc51f8509c9c328027c1808d4`

## Decision

The internal receiver UUID must not be a conductor-authored field when the pinned collaboration API does not expose it.
A successor should use the canonical agent path returned by `spawn_agent` as Developer `sessionId`, while the harness
independently proves that canonical path maps to the hidden receiver UUID through child-session provenance. The repair
receipt binds the same canonical session identity. This preserves separation and continuity without requiring
unobservable data.

Capability maturity remains `enforced`.
