# ACEF Context Retrieval Dogfood — 2026-06-23

## Scope

The first `acef-query context` slice was exercised against an active story in a real Twill CMS delivery run. No product
files or delivery artifacts were changed by the query.

## Findings

1. An unscoped Context Mode search returned stale session material from unrelated story phases. General session memory
   is therefore invalid as the default ACEF story source.
2. Scoping Context Mode to the active ledger, epic pack, story artifacts, role, Git HEAD, and content digest removed the
   stale-session collision.
3. Including the complete pattern registry caused one large JSON section to dominate ranking. The registry was removed
   from story-context retrieval; future pattern retrieval must use a work-shape slice.
4. The deterministic fallback initially leaked an adjacent old-story line. A red fixture caught it, and fallback now
   extracts heading-bounded story sections rather than proximity windows.

## Initial result

The final real-repo query selected four relevant source files:

- source bytes: 212,483;
- returned bytes: 3,132;
- reported reduction: 98.5%;
- returned evidence: active story developer result, tests, reuse probe, environment notes, deferrals, and touched files;
- stale story/session content: absent from the scoped source.

This proves bounded retrieval, not token billing. Model-token savings must be measured in later agent runs. Context Mode
remains optional and no gate depends on the query output.

## Follow-up reconciliation and hardening

A later installed-tool run reported 98.9% reduction. That was a separate observation against a changing active target,
not the immutable four-source run above; it therefore does not replace the 98.5% record.

Adversarial review then added fixtures for stale current-context, wrong-role current-context, `5.2` versus `5.20`,
neighbor-story epic-pack leakage, deterministic source ordering, and a Test Reviewer query profile. Context Mode now
indexes temporary story-scoped ledger/epic-pack material rather than the original broad files.

The hardened real-repo rerun observed:

| Provider | Sources | Source bytes | Returned bytes | Reduction | Relevant story | Neighbor story leak |
|---|---:|---:|---:|---:|---|---|
| Context Mode | 5 | 215,876 | 1,441 | 99.3% | yes | no |
| Files | 5 | 215,876 | 6,835 | 96.8% | yes | no |

These three percentages are retained as separate runs because the active repository and selected story artifacts changed
between measurements. The next evaluation must use fixed fixtures or immutable commits when comparing providers.
