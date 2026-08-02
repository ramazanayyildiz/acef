# Execution Assurance v3.5 recovery design

Status: **preparation-only; no scored attempt is frozen or authorized.**

V3.4 remains an immutable automated and blind FAIL. This successor changes only mechanisms directly supported by that
run's evidence and keeps the four-story product unit, four-actor-v3 lifecycle, Guarded assurance, quality thresholds,
and measured budgets unchanged.

## Preparation gates

1. **Legacy control-state classification** — both `ACEF_DELIVERY_LEDGER.md` and suffixed delivery ledgers, plus
   `ACEF_ACTIVE_LEDGER`, are excluded from application dirt and application-tree scope in state writing and validation.
2. **Semantic durability dosing** — a `Billing` or other high-risk directory name still influences assurance routing,
   but does not by itself claim durable state mutation. Durable write/read proof is required only by explicit mutation
   semantics or persistence/stateful risk triggers.
3. **Original-assertion continuity** — every semantic line from the original frozen red source must remain. Tests added
   during repair may be strengthened, corrected, or isolated without being mistaken for removal of original ATDD.
4. **Single typed reviewer result** — Code Review and Patch Assurance results come from their validated deterministic
   `acef.review-report.v3` verdict and machine completion receipt, not a second prose `ACTOR_RESULT` spelling.
5. **One-shot reviewer completion** — the compiled contract includes the minimum report schema, prohibits schema-probe
   completion calls and dynamic/batched reviewer shell calls, and requires exactly one final completion command.
6. **Affected-only retry** — a reviewer whose immediately prior typed verdict is PASS must not run in the next repair
   cycle; the harness continues to reject that topology and the conductor contract now makes the pre-spawn check exact.
7. **Generic MySQL compatibility oracle** — the v3.5 task adds an artifact-hidden check that both webhook classifiers
   retain the frozen generic `Duplicate entry` signature without requiring named constraint text.

## Go/no-go rule

A separately frozen scored v3.5 candidate is allowed only after targeted regressions, the complete repository suite,
clean task/environment/reference preflight, and the new hidden MySQL compatibility oracle all pass. Preparation does
not change capability maturity from `enforced` and does not authorize rollout.
