# ACEF Product Risk Model

Status: documented-only method. This is not a workflow gate, validator, or installed review lens yet.

## Purpose

Use this model when a product feature can fail even if the implementation matches the written spec. The goal is to
surface business, safety, abuse, lifecycle, and operational edge cases before development by modeling the feature as a
system, then applying generic failure and exploit operators.

This is domain-agnostic. Domain adapters may add operators and examples, but they must not fork the core method.

## Core Pass

Run the pass in this order:

1. **Feature model**: identify actors, beneficiaries, value/resources, state transitions, authority sources,
   trust boundaries, user-controlled inputs, external systems, time windows, and recovery paths.
2. **Business invariants**: state what must remain true regardless of implementation shape. Name who may create value,
   who may benefit, which authority decides eligibility/pricing/ownership, and which boundaries must not mix.
3. **Generic operators**: apply the operator set below to the feature model. Generate concrete hypotheses without
   assuming the spec already named them.
4. **Disposition**: each hypothesis must end as `mitigated`, `accepted-risk`, `DECISION`, or `UNVERIFIED`, with evidence
   or an owner. Do not leave raw brainstorm items in the final plan.

## Baseline Model Fields

Record only fields that matter for the feature, but consider each field before omitting it:

| Field | Question |
| --- | --- |
| Actors | Who initiates, approves, receives, administers, supports, or attacks this flow? |
| Beneficiaries | Who gets the value or state change, and can that differ from the initiator? |
| Value/resources | Money, credit, discount, entitlement, quota, data, identity, access, visibility, or reputation. |
| State transitions | What states exist, who can move between them, and what is irreversible? |
| Authority sources | Which system decides identity, eligibility, pricing, ownership, limits, consent, or policy? |
| Trust boundaries | Tenant, account, role, region, device, provider, internal/admin, public/user, or third party. |
| User-controlled inputs | Values supplied by users, clients, webhooks, imports, admins, or untrusted integrations. |
| External systems | Payment, identity, email/SMS/push, analytics, CRM, warehouse, marketplace, provider API. |
| Time windows | Expiry, retry, activation, cancellation, refund, settlement, sync lag, backfill, migration. |
| Recovery paths | Rollback, refund, retry, manual support action, reconciliation, notification, audit trail. |

## Business Invariants

Write invariants as durable rules, not implementation guesses:

- Value creation: which event creates value, and what prevents duplicate creation?
- Value ownership: who owns the value before and after each state transition?
- Beneficiary authority: which identity/context decides whether the beneficiary is eligible?
- Boundary integrity: which tenant, account, region, role, or provider context must remain isolated?
- Limit authority: where quotas, caps, pricing, currency, and campaign rules are sourced from.
- Failure semantics: if a step fails after value or state changes, what must be restored or frozen?
- Auditability: which actor/action/value transitions must be explainable to support, finance, or compliance?

## Generic Operators

Apply the same operators across domains. The point is not to remember past incidents; it is to stress the model.

| Operator family | Probe |
| --- | --- |
| Actor substitution | What if initiator, payer, owner, beneficiary, admin, and support actor are different people? |
| Actor split/merge | What if one person controls many accounts, or many people coordinate through one account? |
| Boundary crossing | Can value, identity, state, data, or permissions cross tenant/account/region/role/provider boundaries? |
| Authority mismatch | Does one authority price/approve while another authority receives/activates/owns? |
| Identity spoofing | Can a user claim or act through an identifier that is not strongly bound to them? |
| Sequence shift | What if steps happen out of order, repeat, arrive late, or are completed on another surface? |
| Time-window abuse | What if expiry, retry, activation, refund, cancellation, or settlement windows overlap? |
| Replay/idempotency | What if the same request, webhook, import row, or callback is delivered twice? |
| Concurrency | What if two actors or devices attempt the same limited transition simultaneously? |
| Quota/limit reset | Can retries, cancellations, account changes, tenant changes, or partial failures reset a limit? |
| Stale state | What if eligibility, ownership, price, consent, or inventory changes between check and use? |
| Refund/rollback | Can value remain after refund, cancellation, failed settlement, deletion, or partial rollback? |
| Collusion | Can multiple legitimate actors combine allowed actions into an unintended outcome? |
| Provider failure | What if an external provider is down, slow, eventually consistent, duplicated, or wrong? |
| Observability gap | Would support/ops/finance know what happened and be able to repair it? |

## Baseline Lens Families

These are review lenses, not a closed taxonomy. Domain adapters may extend them.

- Conformance and traceability.
- Security, boundary, and ownership.
- Abuse, fraud, and business gaming.
- State, lifecycle, concurrency, and idempotency.
- Data integrity, migration, and backward compatibility.
- Payments, pricing, entitlements, and value accounting.
- Integration, operations, resilience, and observability.
- Scale, performance, and capacity.
- UX and support ambiguity.
- Compliance, legal, and policy.
- Measurement, analytics, and reporting.

## Domain Adapter Contract

A domain adapter adds local knowledge without changing the core method:

- domain-specific model fields;
- domain-specific invariant prompts;
- extra operators or high-risk combinations;
- local evidence sources and owner roles;
- examples and known false positives.

Adapters must stay additive. A missed case should update the missing model field or operator family, not add a
single-case checklist item.

## Missed-Case Learning

For every missed edge case, run this short postmortem:

1. Which model field was missing or mislabeled?
2. Which invariant should have made the risk visible?
3. Which generic operator was not run, or was too weak?
4. Is this solved by a core method update or a domain adapter update?
5. What backtest proves the update catches the class without being overfit to the incident?

Do not add rules shaped like the last incident. Add only reusable fields, invariants, operators, or domain-adapter
prompts.
