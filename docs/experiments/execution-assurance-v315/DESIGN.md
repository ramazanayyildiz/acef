# Execution Assurance v3.15 typed findings and repair receipts

Status: **implementation and complete repository verification pass; rehearsal must be frozen separately.**

V3.14 proved story-scope enforcement and close-package-before-transition sequencing. Its real rehearsal exposed three
mechanical handoff defects around an otherwise legitimate Story 4 product-evidence stop:

- reviewers had to construct canonical base64 finding objects and several used helper or obsolete command shapes;
- a Developer repair receipt could not survive the later conductor-owned control-only review transition; and
- the successful lifecycle integration wrapper returned test output without an explicit inner exit code.

V3.15 makes those handoffs low-freedom and typed:

- `review-result` accepts repeated `--finding-id`, `--finding-severity`, and `--finding-reason` triples, injects
  `status=OPEN`, and preserves failure-atomic report/actor creation. Base64 remains compatibility-only and is not
  exposed to new reviewer prompts.
- Reviewer prompts prohibit encoding helpers, ad-hoc interpreter snippets, metadata probes, and obsolete finding
  options. Transcript allowlisting recognizes the new exact command while retaining one literal command per call.
- A repair receipt may bind an ancestor Developer commit when its application tree equals the final review tree and no
  scoped application/test path changed across intervening control-only commits.
- The conductor must emit `JSON.stringify({output:r.output,exit_code:r.exit_code})` for the one frozen lifecycle
  integration call. Output prose alone remains insufficient proof.

The genuine V3.14 Story 4 discovery finding is not weakened: additive ATDD assertions still must be collected by the
frozen runner before product close can pass. Capability maturity remains `enforced`; implementation and tests cannot
make it `proven`. Focused state/experiment, process-validator, repository-native skill, and capability checks pass; the
complete 30-entrypoint repository suite passed in 227 seconds. No rehearsal is authorized until a clean candidate,
manifest, preflight, and Stage 0 are committed separately.
