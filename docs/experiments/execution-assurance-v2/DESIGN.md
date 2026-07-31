# ACEF Execution/Assurance V2 Real-World Validation

Status: preregistered; Stage 0 not yet passed; no speed or quality claim is authorized.

## Question

Does commit `9bb8ce2` reduce the delivery cost caused by overlapping ACEF/BMAD execution while preserving the safety
properties of legacy commit `d8b816c`?

The experimental unit is the original user outcome. Splitting one request into several stories does not stop the clock.
The primary comparison is paired legacy-versus-candidate execution on the same frozen task and source commit. Repo Native
is only a calibration arm for contained work; it is never the safety comparator for Guarded work.

## Sequence

1. Run the six deterministic Stage 0 traps from the preregistered manifest.
2. Stop and repair the mechanism or measurement harness if any trap fails.
3. Run the 16-attempt pilot in its recorded order, using disposable clones, fresh sessions, pinned clients/models, and
   disabled cross-run memory.
4. Let an artifact-only blind judge assess the final diff and product surface. Do not give the judge transcripts or ACEF
   self-reports.
5. Expand only in batches of four to six matched pairs when the pilot is safe but statistically inconclusive.

## Timing and attribution

Record product-done wall time, active delivery time, first valid vertical green, and framework executable time separately.
The independent transcript/command parser owns counts for lifecycle execution, broad suites, reviews, and state
reconstruction. Environment loss and human wait are separately labeled, never silently deleted.

Timed runs are censored at the preregistered cap. A timeout remains an outcome; it is not discarded as infrastructure
noise. A harness defect invalidates the complete pair and both arms are rerun after the defect is documented.

## Gates

Opt-in merge requires all six deterministic traps, zero mandatory-Guarded misses, zero unauthorized writes, zero accepted
bypasses, zero duplicate Full+Guarded lifecycle chains, zero candidate Critical/High escapes, and time parity on the
small pilot. Installation/canary additionally requires independent live counters and a kill switch. Default rollout
requires paired speed superiority plus at least 30 days across two projects with no treatment-attributable severe escape.

Green source tests prove only that framework machinery runs. They do not make this capability `proven` or `installed`.
