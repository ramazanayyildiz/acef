# Maintenance scan (pilot contract)

Status: pilot, 2026-10-25. This is a scan contract, not a new lifecycle or lane. It becomes a lane only after measured
runs show value beyond the Slice lane's 2b pass and independent reviews. Sources: proposals from the JakoMeet/CRM,
B2Press and Foundation sessions, reviewed by Claude Fable and Codex (gpt-6-astra).

## Why

Slice reviews look at one diff. Some defects only show at module or system level:
- the same sensitive effect reachable through a weaker parallel path;
- retry, idempotency and ordering across modules;
- deletion of personal data across queues, exports and backups;
- dependency advisories;
- missing indexes at real data volume;
- page-level query load.

## When

- **Release gate:** before a first launch or a major release, on the payment, auth and tenant modules.
- **Trigger:** an incident, material architectural drift, or a module declared finished.
- **Not:** on every slice. Per-slice security belongs in the review checklist (A7, D3, D7, D8 in
  `templates/slice/review-checklist.md`).

## Passes and owners

Mechanical checks run first; they cost no review time.

| Pass | Runner | Pilot budget |
|---|---|---|
| Dependency audit (`composer audit`, `npm audit`) | CI: nightly and on lockfile change; one reviewer triages | 30 min triage |
| Schema and index check (constraints, representative query plans, rollback; at real data volume) | DB tooling + developer; independent reviewer | 90 min |
| Query profile of the 5–10 busiest expected pages; results become per-page query-budget assertions | profiler + developer; reviewer interprets | 90 min |
| Module security review + bug hunt (cross-slice lifecycle, retries, ordering, concurrency, recovery paths, deletion across copies) | one reviewer per module, from a different model family than the implementer; high effort; separate sessions | 60 min per module |
| Critical test gaps in payment, auth, tenant and personal-data flows (mapped during the module review, fixed before launch) | same module reviewer | inside the module budget |
| Repo-wide cut pass; mutation testing beyond the per-slice rules | after launch, only where the gap map points | measured first |

## Contract

- **Inputs:** a pinned commit SHA, a finite list of modules and paths, the risk questions, prior findings, and a
  budget per pass (time, tokens, maximum findings).
- **Output:** one ranked, de-duplicated `findings.md` per pass under `<evidence>/maint/<date>/`, in the lens finding
  format (`file:line`, severity, concrete impact, confidence, evidence). Also a coverage list naming what was not run
  or not finished.
- **Evidence per finding:** verified location, a reproducer or trace, environment, confidence and disposition
  (`confirmed` / `needs_validation` / `rejected`).
- **No fixes inside the scan.** Each accepted finding becomes an ordinary slice. Money, tenant and permission findings
  become FULL slices, reviewed and merged one by one; the rest may batch as LIGHT. The coordinator writes the slice
  and picks its lane.
- **Budget:** stop at the budget and record the unresolved risks; do not stretch. An honest "0 findings" is a valid
  result.
- **Measurement per pass:** `Süre · Token`, unique defects by severity, duplicates, rejected (false-positive) count,
  findings that became slices, and repair hours.

## Stop rule

- An optional pass may be reduced after two consecutive runs (two repos or two dates) with nothing at `medium` or
  above.
- Security checks are never dropped on that basis.

## Promotion

Promote this to an ACEF lane only after at least one measured release-gate run (B2Press go-live) and one finished-repo
run (JakoMeet or the platform package). Compare their unique defects and hours against the cost.
