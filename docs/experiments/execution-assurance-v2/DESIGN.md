# ACEF Execution/Assurance V2 Real-World Validation

Status: preregistered; Stage 0 passed 6/6 on runner commit `e9eebb35c11f659f05b37392cbd7268bd4d2d0ba`;
the first Native drift sentinel passed after one preserved harness-invalidated attempt and a fresh scored rerun. The
first scored P0 pair completed without an eligible successful pair: legacy was product-complete but process-invalid,
while candidate stopped fail-closed during Story 2 and was product-incomplete. See `P0_RESULT.md`. No ACEF speed, quality,
proof, installation, or rollout claim is authorized.

## Question

Does candidate commit `076812348e1c88eb9139230a1cc2c9107dff9a12` reduce the delivery cost caused by overlapping ACEF/BMAD execution while preserving the safety
properties of legacy commit `d8b816c`?

The experimental unit is the original user outcome. Splitting one request into several stories does not stop the clock.
The primary comparison is paired legacy-versus-candidate execution on the same frozen task and source commit. Repo Native
is only a calibration arm for contained work; it is never the safety comparator for Guarded work.

`assuranceProfile: guarded` is the experiment's normalized risk stratum across arms, not a claim that legacy ACEF had a
composable assurance axis. For P0 the policy-compliant legacy runtime is its single `full-bmad` lane, including the
risk-specific safeguards that lane's own documentation requires. The candidate runtime is `full-bmad` plus its typed
Guarded assurance profile. A historical legacy `guarded`-lane-plus-Full-BMAD hybrid is recorded only as a misapplication
case and is not a causal comparator.

## Sequence

1. Run the six deterministic Stage 0 traps from the preregistered manifest.
2. Stop and repair the mechanism or measurement harness if any trap fails.
3. Run `--pilot-preflight` and require every referenced selector, pinned source commit, fixture, and dependency tree to
   resolve before starting an agent clock.
4. Run the 16-attempt pilot in its recorded order, using disposable clones, fresh sessions, pinned clients/models, and
   disabled cross-run memory.
5. Let an artifact-only blind judge assess the final diff and product surface. Do not give the judge transcripts or ACEF
   self-reports.
6. Expand only in batches of four to six matched pairs when the pilot is safe but statistically inconclusive.

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

The runner records a task as `PROVISIONAL_PASS` after the independent automated oracle. Product-done remains false until
the artifact-only blind judge records its verdict. ACEF treatment attempts remain fail-closed until exact-version
installation and lifecycle orchestration are available; the runner must not silently substitute the current checkout.
The Full + Guarded motivating pair installs each preregistered framework commit into an isolated epic clone and gives a
fresh root conductor the entire original outcome. Compact ACEF treatment cells remain disabled until their exact-version
state/closeout preparation is implemented.
