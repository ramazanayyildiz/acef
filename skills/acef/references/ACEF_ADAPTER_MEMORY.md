# ACEF Adapter Memory

ACEF separates repo knowledge from run state. This prevents codemap and delivery ledgers from turning into one stale,
ever-growing document.

## Three buckets

| Bucket | What | Lifetime | Lives in |
| --- | --- | --- | --- |
| **Snapshot** | The codemap photo: stack, layout, commands, tests, CI, architecture, conventions, concerns | Re-extracted when stale | Project adapter / codebase map |
| **Adapter living-knowledge** | Patterns, golden neighbors, do-not-copy entries, reuse probes, fitness checks, risk boundaries, component/helper/service inventory | Cross-session, versioned with the repo | Project adapter curated sections |
| **Run / ledger state** | Gate summaries, drift notes, current state, handoff, next allowed step, correct-course events | One feature/task run, then archived | Delivery ledger |

Per-package convention files are projections of adapter living-knowledge into the edit location. They are not a fourth
source of truth.

## Physical split

Default locations when a repo has no stronger convention:

- Bucket 1 snapshot: `docs/codebase-map.md` or the project adapter output.
- Bucket 2 adapter living-knowledge: `docs/ai/pattern-registry.json` or the project adapter's curated registry section.
- Bucket 3 run/ledger state: `docs/ai/ACEF_<feature>_DELIVERY_AUDIT.md` or the project ledger.

Do not place gate summaries, drift notes, context handoffs, or next-allowed-step state in the pattern registry. A
recurring drift can graduate into a do-not-copy entry or fitness check, but the per-run drift note stays in the ledger.

## Session handoff block

An active delivery ledger must carry the resume state explicitly. This is run state, not adapter memory.

```md
## Session Handoff
status:
current_step:
last_passed_gate:
next_allowed_step:
active_lane:
active_track:
ledger_path:
blocked_on:
do_not_continue_without:
```

`blocked_on` and `do_not_continue_without` may be `none` for standard work. Guarded, blocked, hold, or halt states must
name the blocker or the missing approval/evidence. The handoff must live in the delivery ledger; putting it in
`docs/ai/pattern-registry.json`, the codemap, or the project adapter is a category error.

## Provenance triple

Every adapter memory entry that can guide implementation or review must carry:

| Field | Meaning |
| --- | --- |
| `source_evidence` | File/command/path proving the entry. Use `path:line` when practical. |
| `confidence` | `statistical-strong`, `multiple-examples`, `single-example`, `inferred`, or `needs-verification`. |
| `freshness` | Last verified date and commit/revision/scope. |

If an entry lacks this triple, it is a lead, not a rule. It cannot be used as a hard conformance gate.

Pattern entries also carry `evidence`, `lastVerifiedCommit`, and `enforcedBy` per `PATTERN_REGISTRY.md`.

## Living entry schema

Use this shape in markdown tables or JSON/YAML projections:

```yaml
id: pattern.mutation-hook.react-query
bucket: adapter-living-knowledge
kind: pattern | golden-neighbor | do-not-copy | reuse-probe | fitness-check | risk-boundary | component-inventory
status: proposed | active | promoted-to-check | retired | archived
maturity: review-finding | rubric-item | mechanical-check | retired
enforcedBy: null
trigger: conformance-revise | merged-better-exemplar | command-change | risk-boundary-change | n-commits-stale | major-refactor
evidence: "Why this is canonical, not just an example path."
source_evidence:
  - path: modules/account/hooks/use-update-profile.ts:12
confidence: multiple-examples
freshness:
  verified_at: 2026-06-21
  commit: abc123
  scope: modules/account
lastVerifiedCommit: abc123
owner: adapter
expires_or_refresh_when:
  - major refactor
  - no qualified neighbor found
  - touched path changes
notes: "Short human-readable rule."
```

## Maturity ladder

Living memory should shrink over time. A soft rule should graduate into a mechanical wall, then retire from prose.

```text
review finding -> rubric item -> mechanical check (lint / fitness / hook / CI) -> prose RETIRED
```

Rules that never graduate should still decay. Superseded golden neighbors are removed or archived. Resolved drift notes
belong in the run archive, not in the adapter.

If `enforcedBy` points to a reliable lint/CI/hook/fitness check, retire the duplicate prose guidance from the rubric or
mark the prose entry `retired`.

## Update triggers

Each living entry must name when it updates:

| Trigger | Required action |
| --- | --- |
| `conformance-revise` | Patch code or append/update do-not-copy/reuse probe; propose a fitness check if repeated. |
| `merged-better-exemplar` | Refresh golden neighbor and demote/archive the older exemplar. |
| `command-change` | Refresh command map and freshness stamp. |
| `risk-boundary-change` | Refresh risk boundary and required gate evidence. |
| `n-commits-stale` | Re-run codemap or verify affected entries. |
| `major-refactor` | Re-extract snapshot and revalidate living entries. |
| `no-qualified-neighbor` | Mark `Needs decision`; do not silently create a new pattern. |

If no trigger can be named, the entry is probably commentary, not adapter memory.

## Ownership rule

- Adapter owns cross-session repo knowledge.
- Ledger owns one run's state.
- Codemap owns the current extracted snapshot.
- Conformance reviewers may propose adapter updates, but a proposal is not active until it has provenance and a trigger.

## Gate rule

A conformance gate may rely only on:

1. current snapshot entries with freshness,
2. active adapter living-knowledge entries with provenance triples,
3. the current run ledger for run-local state.

Do not use stale archive notes, uncited summaries, or subagent claims as conformance facts.
