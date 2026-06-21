# ACEF Pattern Registry Contract

The pattern registry is the machine-readable part of adapter living-knowledge. It answers:

> For this work shape, how does this repo write it, what should be reused first, and what must not be copied?

The registry is not run-local state. Gate summaries, drift notes, handoffs, and next allowed step belong in the delivery
ledger, not in this file.

## Default location

Use the repo's chosen adapter location. If no project-specific location exists, use:

```text
docs/ai/pattern-registry.json
```

Do-not-copy starts as a section in this JSON. Split it into a separate file only if it becomes too large.

## JSON shape

```json
{
  "schemaVersion": 1,
  "repo": "repo-name",
  "generatedAt": "2026-06-21",
  "generatedFromCommit": "abc123",
  "coveredScopes": ["modules/account"],
  "status": "READY | PARTIAL | MISSING",
  "patterns": [
    {
      "id": "pattern.mutation-hook.react-query",
      "workShape": "mutation-hook",
      "status": "canonical",
      "maturity": "rubric-item",
      "enforcedBy": null,
      "summary": "Mutations use the shared API client and invalidate query keys after success.",
      "evidence": "12 of 13 mutation hooks match; the outlier is listed in doNotCopy.",
      "sourceEvidence": [
        { "path": "modules/account/hooks/use-update-profile.ts", "line": 12 },
        { "path": "modules/account/query-keys.ts", "line": 1 }
      ],
      "goldenNeighbors": [
        { "path": "modules/account/hooks/use-update-profile.ts", "why": "current mutation hook with query invalidation" }
      ],
      "reuseProbe": ["useMutation", "apiClient", "invalidateQueries", "queryKeys"],
      "doNotCopy": ["legacy.account.direct-fetch"],
      "confidence": "multiple-examples",
      "lastVerifiedAt": "2026-06-21",
      "lastVerifiedCommit": "abc123",
      "refreshTriggers": ["merged-better-exemplar", "touched-scope-change", "major-refactor"]
    }
  ],
  "doNotCopy": [
    {
      "id": "legacy.account.direct-fetch",
      "reason": "Bypasses the shared API client and error envelope.",
      "sourceEvidence": [{ "path": "legacy/account/profile.ts", "line": 30 }],
      "lastVerifiedCommit": "abc123"
    }
  ]
}
```

## Required per-entry fields

Every `patterns[]` entry must include:

- `id`
- `workShape`
- `status`
- `maturity`
- `enforcedBy`
- `evidence`
- `sourceEvidence`
- `goldenNeighbors`
- `reuseProbe`
- `doNotCopy`
- `confidence`
- `lastVerifiedAt`
- `lastVerifiedCommit`
- `refreshTriggers`

`goldenNeighbors` are examples. `evidence` is the proof that the pattern is accepted.

## Freshness semantics

`generatedFromCommit` and each `lastVerifiedCommit` record the commit where the cited evidence was verified. A registry
is fresh when that stamp is the current HEAD, or when that stamp is an ancestor of HEAD and no covered source paths have
changed since. If the branch is rebased, pulled forward, or otherwise moved across covered code, rerun the relevant
extraction or recheck the cited evidence before treating the registry as fresh.

## Status values

| Value | Meaning |
| --- | --- |
| `canonical` | Dominant accepted pattern with source evidence. |
| `emerging` | Newer code shows migration direction; old code still exists. |
| `aspirational` | Docs claim it, but code does not consistently follow it. |
| `legacy` | Exists, but should not guide new work. |
| `needs-decision` | Multiple live patterns conflict; do not choose silently. |

## Registry status

| Registry status | What it permits |
| --- | --- |
| `READY` | Registry can guide all route/track work within covered scopes. |
| `PARTIAL` | Mechanical/standard work may proceed only for work shapes already covered by `patterns[]`. New work shapes and guarded work require registry extraction or human risk acceptance first. |
| `MISSING` | No conformance gate may pass. Run `map-codebase` / `acef-adapter` first. |

`PARTIAL` is not a soft pass. It narrows the allowed work.

## Maturity and retirement

| Maturity | Meaning |
| --- | --- |
| `review-finding` | Came from a review finding; not stable yet. |
| `rubric-item` | Used by conformance review. |
| `mechanical-check` | Enforced by lint, CI, hook, or fitness function. |
| `retired` | No longer active prose guidance. |

When `enforcedBy` is non-null and the mechanical check is reliable, remove the duplicated prose from the review rubric
or mark the entry `retired`. A superseded golden neighbor is dropped or archived, not kept forever.

## Feedback rule

Every conformance finding must end in one of:

1. code patch,
2. pattern registry update,
3. do-not-copy update,
4. proposed mechanical check,
5. explicit human decision to defer.

Findings must not disappear into chat.

## Mechanical checks

`scripts/acef-process-validator` includes the first mechanical conformance checks:

- `--check pattern-registry` validates the registry contract and required per-entry fields.
- `--check reuse-before-create` requires the delivery ledger to record a reuse/golden-neighbor probe that cites a
  registry `reuseProbe` term or golden-neighbor path.
- `--check do-not-copy` fails when a delivery ledger mentions a do-not-copy entry without an explicit avoided/rejected
  context.

These checks do not replace judgment. They prevent the most common silent drift: skipping local neighbor search or
treating known legacy examples as patterns.
