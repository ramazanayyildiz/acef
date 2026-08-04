# Execution Assurance v3.27 rehearsal

This is the one immutable successor to V3.26. It freezes the terminal Epic closeout repairs from commit
`f4c1cbe67c89fe55cbb99c1655f3f38d4fbe1c97` together with the provider-neutral role-routing policy whose SHA-256 is
`e9a23ab1383012937ee89f30333af94447ccdf1d5cf7cd85a7bff9f26dc944ec`.

V327-CAL-001 is the only semantic-floor change: OpenAI Code Review moves from `gpt-5.6-sol/high` to
`gpt-5.6-sol/medium` after a blinded held-out HIGH comparison scored medium 30/30 and high 28/30. The compiled
conductor uses `gpt-5.6-sol/medium`. ATDD, Development, Patch Assurance, conditional Process Judge, and Epic Process
Judge remain `gpt-5.6-sol/high`. Mechanical state, evidence, capsule, transition, and gate work remains model-free.

The story inventory, product fixture, four-role topology, one broad Epic integration run, and independent Epic Judge
are unchanged. The target is 45 active minutes, each story is capped at 15 active minutes, and the whole run stops at
60 active minutes. The attempt is sleep-inhibited, fail-closed, and may run exactly once. It is followed by the
existing blind external Judge only if the immutable attempt produces a judgeable packet; no automatic retry or repair
experiment is authorized.

A PASS can promote provider-neutral routing and capsule-supervisor maturity only to the level allowed by this
non-scored rehearsal contract. Provider mappings other than OpenAI remain unauthorized until separately calibrated.
