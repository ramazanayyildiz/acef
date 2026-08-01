# Amendment 009 — P0 repair pair

Date: 2026-08-01

The first P0 pair is closed and remains immutable. Its candidate cost cannot be treated as a speed win because the
candidate stopped after Story 2 ATDD and did not complete the product outcome.

## Independent ATDD adjudication

The Story 2 `REVISE` was over-broad relative to the frozen experiment contract. The supplied protected test produced a
genuine critical-path red for duplicate middleware evaluation, retained the downstream-response assertion, and was the
frozen focused oracle. The Test Author correctly identified useful later regression cases, but incorrectly promoted the
absence of every regression case in the protected benchmark into a pre-development blocker. Those cases belong in the
post-green expansion/test-review boundary; the frozen scope expressly prohibited editing the protected benchmark.

Disposition for the historical result: `OVERRULE` as an execution decision, without changing the recorded failed row.
The old candidate is not resumed or rescored.

## Candidate repair

Candidate commit `815d6d0644898af8e1db7a6e5a8f018356f278a2` adds:

- one fresh report-only adjudication after ATDD `REVISE`;
- at most one findings-hash-bound, test-artifact-only correction when the adjudication is upheld;
- `REPLAN/SPLIT` after a second incomplete ATDD result;
- dependency-aware quarantine, with whole-run halt only for dependency/shared-safety reasons;
- a frozen mandatory actor inventory and rejection of unexpected closeout actor chains;
- lifecycle duplication measurement from typed collaboration dispatches rather than textual mentions;
- explicit pre-write scope reconciliation, backed by the existing worker-scope hard wall and post-run oracle.

The dependency metadata added to the frozen task declares only the relationship already stated in Story 3's prompt:
Story 3 depends on Story 2. Stories 1, 2, and 4 otherwise have no dependency edge. Product behavior, allowed production
paths, fixtures, protected tests, verification commands, model, and time caps are unchanged.

## New matched pair

`manifest-p0-r2.json` preregisters a fresh legacy/candidate pair. It does not reuse the old candidate row. Promotion
requires all four stories complete, automated and blind product PASS, zero Critical/High, exactly one epic Process Judge,
no scope/phase/result violation, no genuine lifecycle duplicate, and no closeout-created mandatory chain. Cost is scored
only after product PASS, with caps of 13,100 active seconds, 52 million input tokens, and 424 tool calls.

A passing pair authorizes only a controlled canary. It does not make the capability `proven` or `installed`.
