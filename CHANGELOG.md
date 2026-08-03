# ACEF Changelog

This file is the human-readable history of ACEF's framework changes. Git remains the exact source of truth, and
`docs/ai/capabilities/*.json` remains the layer-by-layer truth for whether a capability is documented, wired, enforced,
proven, or installed.

Update this file whenever ACEF itself gains or changes a flow, gate, validator, hook, skill, installer behavior, workflow,
or evidence contract. Do not use it to claim implementation status; link to the capability record for that.

## Unreleased

### Full story lifecycle v3.15 typed findings and repair receipts

- Replaced reviewer-authored base64 in the active v3 prompt with repeated typed finding ID/severity/reason options;
  `acef-state review-result` injects `OPEN` and retains failure-atomic report/actor creation. Compatibility base64 stays
  readable but is not the new-run interface.
- Bound a Developer repair receipt to its repaired application tree across later conductor-owned control-only review
  transition commits. Those commits cannot trigger an extra Developer follow-up or replacement receipt.
- Required the one lifecycle integration wrapper to emit both output and the inner `exit_code`; successful-looking test
  prose without that typed field remains fail-closed.
- Prohibited reviewer encoding helpers, ad-hoc interpreter snippets, metadata probes, and obsolete finding options;
  added focused regressions for typed findings, control-only repair transitions, command allowlisting, and output-only
  lifecycle receipts. Focused validators pass and the complete repository suite passed 30/30 in 227 seconds. Maturity
  remains `enforced` pending a separately frozen rehearsal.
- Froze and repeated the non-scored V3.15 rehearsal. The first attempt was environmentally interrupted by clamshell
  sleep; the unchanged sleep-inhibited repeat completed normally in 3,016.3 seconds but failed closed. Typed reviewer
  findings and explicit lifecycle exit receipts worked, while undiscovered Story 2 tests, a Developer non-PASS repair
  dead end, unbound pre-review continuations, close-bootstrap omissions, the intermediate-REVISE hook conflict, and a
  source-shape-sensitive webhook assertion prevented promotion. Maturity remains `enforced`.

### Full story lifecycle v3.14 story scope and structured receipts

- Made `scopeUnit` fail closed at the state-writer boundary: a frozen four-actor-v3 catalog story cannot start or
  continue under epic scope. Epic scope remains available for epic-level state and the terminal Epic Process Judge.
- Decoded structured Codex tool-output blocks before lifecycle exit-receipt validation. The immutable V3.13 integration
  transcript now re-evaluates as exactly one attributed command with exit 0 and valid story/Judge ordering.
- Applied the one-literal-command/one-exec rule to every reviewer read and completion call, allowlisted only bounded
  `awk` and safe `git grep` reads, and retained fail-closed rejection of separators, pipelines, dynamic commands, and
  text-conversion filters.
- Required each exact story-close package to commit before any next-story active-run, Current Context, or ledger
  transition. Focused state, experiment, process-validator, skill, installer, and capability tests pass; the complete
  repository suite passed 30/30 in 264 seconds. Maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze and ran non-scored `REHEARSAL-v314`. Story scope was correct on all four stories, Stories 2–3 closed
  at cycle 0, and close packages preceded next-story state. The immutable attempt still failed after 4,068.3 seconds:
  reviewer findings lacked a reliable one-command typed handoff, S1 repair receipts conflicted with the later
  control-only review transition, the successful integration wrapper omitted an explicit exit receipt, and both S4
  reviewers found a genuine undiscovered-ATDD HIGH issue. Maturity remains `enforced`.

### Full story lifecycle v3.13 canonical reviewer and terminal closeout

- Added reviewer-owned `acef-state review-result`: reviewers supply only canonical actor, verdict, and optional
  base64-encoded findings. The state writer derives the report path plus run/story/phase/commit/tree bindings, validates
  the typed report, and creates report and reviewer actor as one failure-atomic handoff. Legacy `review-completion`
  remains readable for frozen compatibility runs.
- Canonicalized exact lifecycle integration attribution through the observed `sh -c` wrapper and allowlisted bounded
  read-only reviewer existence/syntax checks without authorizing application writes.
- Allowed the mandatory Epic Process Judge to persist a typed terminal non-PASS gate with missing-story inventory and
  latest story dispositions. PASS still requires exactly one terminal deterministic PASS gate and aggregated green
  evidence for every frozen story.
- Added regressions for derived reviewer binding, failed-handoff cleanup, immutable replay refusal, wrapped lifecycle
  attribution, reviewer read-only commands, and terminal non-PASS Epic durability. The complete repository suite passed
  30/30 in 266 seconds. Maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze and ran non-scored `REHEARSAL-v313`. Canonical reviewer handoff closed Stories 2–4, including both
  previously failing Story 3/4 Patch Assurance cases; the wrapped integration command was recognized 1/1 and exited 0;
  and the Epic Judge durably wrote a terminal `REPLAN` gate with one missing story. The immutable run still failed after
  2,802.8 seconds because Story 1 remained epic-scoped when review opened, structured tool output hid the successful
  exit receipt from the parser, several reviewers batched read-only shell commands, and staged Story 2 closeout was
  checked against active Story 3. Maturity remains `enforced`.

### Full story lifecycle v3.12 atomic ATDD evidence handoff

- Changed four-actor-v3 `evidence-run` so the one literal runtime-test command validates a clean committed test-only red
  tree and atomically creates the missing canonical ATDD actor record before test execution. The record binds the
  canonical child identity plus the pre-red parent commit/tree; no separate conductor actor step remains.
- Moved evidence-kind and immutable evidence-ID validation before actor creation or command execution. Invalid kinds,
  dirty trees, non-test commits, wrong actor/story identities, and consumed evidence IDs leave no actor, raw log, or
  evidence manifest.
- Added child-transcript enforcement for exactly one canonical runtime-test evidence command and canonical ATDD actor
  session binding.
- Added regressions for invalid-kind atomicity, dirty-tree atomicity, automatic actor/evidence binding, and exact-one
  transcript attribution. The complete repository suite passed 30/30 in 280 seconds. Maturity remains `enforced`
  pending a separately frozen rehearsal.
- Separately froze and ran non-scored `REHEARSAL-v312`. Atomic ATDD actor/evidence handoff passed on all four stories,
  Stories 1–2 closed at cycle 0, and the one broad integration shell command exited 0. The immutable attempt still
  failed after 3,830.6 active seconds: Story 3 Patch Assurance used a nested report binding, Story 4 mistyped its
  completion artifact path, exact lifecycle-command attribution observed 0/1 because of shell wrapping, and terminal
  blocked closeout could not be committed without an epic gate. Maturity remains `enforced`.

### Full story lifecycle v3.11 ATDD transition fence

- Rendered one literal `acef-state evidence-run --kind runtime-test` command for every frozen story and required the
  ATDD actor to use it once after the clean test-only commit. Unsupported semantic kinds, trailing path operands, and
  failed evidence-ID reuse are explicitly prohibited.
- Added a live four-actor-v3 supervisor policy that permits `followup_task` only for canonical Developer identities.
  A follow-up to ATDD, reviewer, or Judge is detected from the parent session transcript and terminates the process
  group before later lifecycle work can continue; the bound actor receipt records the exact violation.
- Corrected post-run collaboration validation so four-actor-v3 ATDD `REVISE` requires one fresh adjudication before
  Development. The earlier condition accidentally applied the adjudication state machine only outside v3.
- Added regressions for literal ATDD evidence commands, missing/admitted v3 adjudication, invocation accounting, and a
  real supervised child process stopped on forbidden ATDD reactivation. The complete repository suite passed 30/30 in
  288 seconds. Maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze non-scored `REHEARSAL-v311`; preflight and Stage 0 passed. The run failed closed after 314 seconds
  with no follow-ups or Development dispatch: the exact evidence command required an ATDD actor record that the
  lifecycle still scheduled only after FINAL_ANSWER. The transition fence passed, reviewer handoff was not reached,
  and maturity remains `enforced`.

### Full story lifecycle v3.10 atomic reviewer handoff

- Changed the final `review-completion` command from report-only validation into one atomic handoff: it validates the
  typed report and creates the report-bound immutable reviewer actor record before emitting the machine completion
  payload.
- Removed the contradictory conductor-owned reviewer actor step. The conductor now commits transition state first,
  freezes one shared input commit/tree for concurrent Code Review and Patch Assurance, and never pre-creates or
  rewrites either reviewer actor record.
- Extended transcript write auditing to observe and permit exactly the reviewer's typed report plus its own actor
  record. Cross-repository, extra-option, unobservable, delegated, and other writes remain fail-closed.
- Added state-writer and execution-assurance regressions for failed-handoff atomicity, generated actor identity/role,
  exact shell allowlisting, and transcript-visible actor creation. The complete repository suite passed 30/30 in 265
  seconds. Capability maturity remains `enforced` pending a separately frozen rehearsal.
- Separately froze non-scored `REHEARSAL-v310`; preflight and Stage 0 passed. The real run was intentionally stopped
  after 413.1 seconds when the same ATDD actor received two forbidden follow-ups after inventing unsupported evidence
  kind `atdd-red`. Development had started without a receipt, so finalize correctly classified the attempt as consumed,
  indeterminate, and non-replayable. Reviewer atomic handoff was not reached and maturity remains `enforced`.

### Full story lifecycle v3.9 canonical Developer session binding

- Replaced the unobservable internal receiver-UUID requirement with the exact canonical `/root/<task_name>` identity
  actually returned to the conductor by Codex CLI 0.146.0.
- The harness still proves the hidden receiver UUID independently through child-session `id`, `agent_path`, parent, and
  spawn provenance; actor and repair receipts bind the visible canonical identity.
- Added regressions rejecting bare task names and arbitrary receiver strings while accepting the canonical spawn path.
  Focused execution-assurance, state, and process-validator tests pass; maturity remains `enforced` pending a separately
  frozen rehearsal.
- The complete repository suite passed 30/30, the interrupted v3.8 real actor record passed the new canonical binding
  check, and non-scored `REHEARSAL-v39` was separately frozen against clean commit `28fa3e4`.
- Recorded immutable non-scored V3.9 FAIL after 908.7 seconds. Canonical Developer session binding passed in the real
  run, but reviewer completion exposed an immutable actor/report handoff contradiction and mismatched shared review
  input tree. No blind Judge or maturity change is implied.

### Full story lifecycle v3.8 final-tree recovery

- Corrected bounded repair routing: Patch Assurance now reruns after every application/test-tree repair; Code Review
  reruns after its own REVISE or a production repair, while test-only repair may preserve a prior Code Review PASS.
- Bound Developer actor/repair identity to the actual spawn receiver id instead of task name, accepted harmless trailing
  whitespace in repair handoffs, and made the typed Judge decision the trigger source of truth.
- Replaced raw shell-metacharacter scanning with quote-aware detection. Quoted PHPUnit/jq operators are accepted as
  arguments; unquoted pipelines, redirections, substitutions, dynamic commands, and mutations remain rejected.
- Made `review-completion` the sole report-shape validation command and prohibited schema/help probing in reviewer work.
- Reworked formal story-close durability into one exact immutable cycle-0 package plus exact immutable repair-delta
  layers. Historical REVISE evidence is preserved rather than reintroduced or rewritten.
- Added regressions for all observed v3.7 failure modes. The complete repository suite passed 30/30; capability maturity
  remains `enforced` pending a separately frozen non-scored rehearsal and later scored evidence.
- Separately froze non-scored `REHEARSAL-v38` against clean implementation commit `fe5f8b8`; freezing does not start the
  attempt and cannot change maturity or authorize promotion.
- `REHEARSAL-v38` was intentionally interrupted after live evidence showed that Codex CLI 0.146.0 returns only canonical
  `/root/<task>` identity to the conductor, not the harness-internal receiver UUID required by the candidate. Finalize
  correctly refused to invent a receipt/result, so the attempt is non-replayable and maturity remains `enforced`.

### Full story lifecycle v3.7 reviewer normalization rehearsal

- Canonicalized trusted review-report vocabulary at the parser boundary: verdict, severity, and status casing is
  normalized; `INFO` maps to `LOW` and `CLOSED` maps to `RESOLVED`. Unknown values, empty REVISE reports, PASS reports
  with open findings, and unsafe HIGH/CRITICAL dispositions remain rejected.
- Added parser and machine-observed `review-completion` regressions and passed the complete 30/30 repository suite.
- Recorded the immutable non-scored v3.7 rehearsal FAIL after 4,209.6 active seconds. All four stories reached review;
  S1–S3 closed; S4's real HIGH finding was repaired and Code Review passed, but the prior PASS Patch Assurance was
  stale for the repaired final tree. Deterministic close correctly refused to pass and the broad closeout did not run.
- The rehearsal also exposed trailing-whitespace repair binding, quoted-shell-metacharacter, duplicate Judge-trigger,
  and multi-layer close-package oracle defects. No promotion or maturity change is implied.

### Full story lifecycle v3.6 deterministic-close rehearsal

- Removed the contradictory requirement that a genuine test-runner failure must name the editable ATDD path. Guarded
  runs may execute an immutable verification test while deterministic close continues to require a clean test-only red
  commit, authentic production assertions, exact-command red-to-green ancestry, semantic test continuity, and clean
  runner proof.
- Added a full deterministic-gate regression using an editable ATDD test and a distinct frozen verification test. The
  complete repository suite passed 30/30; clean preflight passed task/canary/environment and four reference validations;
  Stage 0 passed 6/6.
- Recorded the immutable non-scored v3.6 rehearsal FAIL after 930.9 active seconds. The repaired red/green evidence was
  accepted, but both Story 1 reviewers used schema-invalid enum spellings in their one-shot completion reports. The
  system correctly stopped, yet could not route the real HIGH finding into bounded Developer repair. No promotion or
  maturity change is implied.

### Full story lifecycle v3.5 measured-failure recovery preparation

- Classified unsuffixed and suffixed delivery ledgers plus the active-ledger pointer consistently as control state, so
  legacy ledger normalization cannot invalidate application evidence mid-story.
- Restricted durable write/read proof to explicit mutation semantics or persistence/stateful risk triggers. High-risk
  names such as `Billing` still route assurance but no longer make a static route edit look like database mutation.
- Replaced whole-file ATDD substring continuity with original semantic-line preservation: original assertions remain
  mandatory while repair-added tests may be corrected or isolated.
- Made the validated typed review-report verdict the single reviewer result channel. The compiled contract now embeds
  the minimum report schema, permits only one final completion call, prohibits dynamic/batched reviewer shell calls,
  and requires prior typed REVISE before a reviewer retry.
- Added a separate v3.5 withheld compatibility fixture that freezes the generic MySQL `Duplicate entry` signature for
  both webhook classifiers without modifying immutable v3.3/v3.4 artifacts.
- The complete repository suite passed 30/30 and the clean draft preflight passed task binding, collaboration canary,
  environment probe, and all four baseline-red/reference-green validations, including the new hidden MySQL oracle.
- This remains preparation-only. V3.4 is an immutable automated/blind FAIL and maturity remains `enforced`; a scored
  successor must be frozen separately.
- After preparation GO, separately froze `P0-candidate-v35` against framework commit `82b5f73`. Freezing does not start
  the attempt and does not change capability maturity before automated and blind results exist.
- Recorded the immutable v3.5 automated and blind FAIL. The attempt reached the first valid implementation and two
  concurrent typed reviewer PASS results without retries or repair, then stopped after 1,160.1 active seconds when
  deterministic close rejected the genuine test-only-red/production-only-green ancestry with a red-evidence path
  continuity anomaly. Stories 2–4, the broad lifecycle suite, and the Epic Process Judge therefore did not run; the
  blind Judge independently reported three HIGH missing-story findings. Capability maturity remains `enforced`.

### Full story lifecycle v3.4 typed-handoff recovery preparation

- Added an ATDD evidence hard wall: four-actor-v3 red evidence now refuses to run or persist until the test-only red tree
  is committed, clean, and descended from the ATDD actor input commit. ACEF active-ledger pointers are classified as
  control state rather than application dirt.
- Normalized the typed actor-result delimiter so `ACTOR_RESULT=PASS` and `ACTOR_RESULT: PASS` have identical semantics;
  punctuation can no longer quarantine an otherwise completed actor while non-success values remain fail-closed.
- Reviewer completion is now derived from the actual `acef-state review-completion` stdout in the child transcript,
  not copied final prose. The command path is deterministic from exact task name, and actor/report binding remains
  hash/tree checked.
- Added trace support for `functions.exec`-wrapped `exec_command`, including quoted command keys and safe coordination
  calls. Reviewers are constrained to one literal read-only command per call; dynamic or mutation-capable shell access
  still fails closed.
- This is preparation-only. V3.3 remains an immutable FAIL and capability maturity remains `enforced` until a separately
  frozen successor passes automated closeout and blind judgment.
- The clean v3.4 draft preflight passed task binding, collaboration canary, environment probe, and baseline-red/
  reference-green validation for all four unchanged frozen stories. This authorizes a separately frozen scored
  candidate but does not change maturity or the v3.3 result.
- Separately froze scored attempt `P0-candidate-v34` against framework commit `1deadd4`, with the unchanged task,
  quality gates, stop rules, and measured budget. Freezing the attempt does not change capability maturity before its
  automated and blind results are recorded.
- Recorded the immutable v3.4 automated and blind FAIL. The targeted typed-handoff repairs allowed all four stories to
  execute and reduced true coordination idle to 6.6 seconds, but S4 exhausted two repair cycles and reached REPLAN,
  tool calls exceeded budget, reviewer completion/retry topology still had process violations, and the blind Judge
  found one HIGH MySQL compatibility regression. Capability maturity remains `enforced`.

### Full story lifecycle v3.3 preparation hardening

- Extended offline ATDD authenticity checks to recognize PHPUnit exception contracts and namespaced PHP production
  references. The archived Story 1 red test is now a permanent golden regression, while test-framework-only PHP still
  fails authenticity.
- Added a required baseline-red/reference-green preflight for frozen task catalogs. Every story must provide a canonical
  patch whose changed paths stay inside the story envelope, applies cleanly to the pinned source, turns the exact focused
  oracle green, and leaves frozen fixtures unchanged.
- Corrected the frozen Story 2 ATDD constraint to require one resolver call and one Gate evaluation. Corrected Story 4
  scope to include the ingress dedup service; a bounded, non-scored dry-run then closed it in one actor invocation.
- Split harness waiting into total wait, productive delegated execution, and coordination-idle wait. Existing budget
  profiles retain their historical total-wait semantics; only the new `v33-measured` preparation profile budgets idle
  coordination without raising the 2,700-second/38% ceiling.
- Compiled four-actor prompts now prohibit recursive ACEF/BMAD workflow-document loading, cap initial task reads, state
  story-specific ATDD constraints, and trigger a typed bottleneck return after ten active minutes without progress.
- V3.3 artifacts remain draft and non-scored. `pilotRunAllowed: false` is enforced, and capability maturity remains
  `enforced` until a separately bound scored candidate passes every product, process, and budget gate.
- After all preparation gates passed, separately froze scored attempt `P0-candidate-v33` against framework commit
  `d339a61`. This preregistration authorizes one measured run but does not change capability maturity before its
  automated and blind results are recorded.
- Recorded the immutable v3.3 automated and blind FAIL. The run reduced active time, aggregate input tokens, tool calls,
  and invocations relative to the also-incomplete v3.2 P0, while measuring only 4.8 seconds of true coordination-idle
  wait. It still failed product and process closeout because typed handoffs were not atomic or machine-carried: stale
  red-evidence binding, punctuation-sensitive actor result parsing, and copied reviewer report paths quarantined the
  stories before Epic close. Capability maturity remains `enforced`.

### Full story lifecycle v3.2 recovery candidate

- Preserved the v3.1 P0 as an immutable FAIL: product oracle verification passed, but the run exhausted its 21 actor
  invocations before delta re-review and Epic Judge closeout, skipped the one required lifecycle integration command,
  and exposed auxiliary readiness reports in otherwise control-only story-close commits.
- Fixed blind-judge packet validation so frozen `testPaths` are product artifacts alongside production `allowedPaths`;
  protected harness/control paths remain rejected.
- Added the separately preregisterable `v32-empirical` budget profile. Its 25-invocation hard cap is derived from the
  observed 21-invocation partial run plus the two required delta reviewers, mandatory Epic Judge, and one infrastructure
  retry buffer; token, tool, active-time, and harness-wait ceilings remain unchanged.
- Product acceptance criteria are now rendered explicitly into every story actor contract. Story-close instructions
  explicitly exclude readiness/reuse working notes and require staging only the gate-bound package paths.
- Recorded the immutable v3.2 P0 automated/process/blind FAIL. The run admitted the blinded Judge and stayed within
  actor, token, tool, and active-time ceilings, but failed deterministic story close, product completion, exact broad
  closeout, and the 38% harness-wait ceiling. Capability maturity remains `enforced`, not `proven`.

### Full story lifecycle v3.1 recovery candidate

- Added story-scoped final-tree binding: deterministic gates freeze the story's explicit production/test paths, so
  later independent stories no longer invalidate earlier PASS packages while same-scope changes still do.
- Added the read-only `acef-state review-completion` command and transcript enforcement. Reviewer completion payloads
  now bind the active run, exact reviewer, story, phase, commit, tree, report bytes, and SHA-256 before acceptance;
  missing or invalid payloads stop rather than opening an unbounded reviewer follow-up.
- Added explicit per-story test envelopes to the P0 task contract and included them in scope/oracle enforcement.
- Added the exact scored SQLite story oracle to catalog preflight and timed-launch prechecks. It must produce a genuine
  behavioral red; migration/bootstrap/dependency failures are rejected. Broad tests that require the project's
  unsupported full SQLite migration chain are excluded from the frozen story test envelope.
- Added the separately preregisterable `v31-empirical` budget profile. It preserves the 17/21 actor and 180-minute hard
  topology/time bounds while freezing 50M input-token, 520 tool-call, and 2,700-second/38% harness-wait ceilings from
  the prior incomplete observation.
- Capability maturity remains `enforced`; the v3.1 P0 and blind judgment must pass before any `proven` claim.

### Full story lifecycle v3 removes duplicate assurance passes

- Added the versioned `four-actor-v3` Full-flow contract for new runs while keeping missing/`six-actor-v2` active-run
  state readable and closeable. Guarded remains an additive assurance profile, not another lifecycle.
- Reduced each new Full story to four mandatory independent actors: ATDD, Development, Code Review, and report-only
  Patch Assurance. Code Review and Patch Assurance inspect the same implementation tree in parallel; findings return
  to a scoped Developer and only affected review areas rerun.
- Replaced the mandatory per-story Process Judge with a deterministic story-close gate. A Story Process Judge is
  dispatched only for a waiver, evidence conflict, non-mechanical ambiguity, or gate anomaly and cannot override a
  failed mechanical check. Epic Process Judge remains mandatory.
- The close gate computes actor separation, red-before-green ancestry, final-tree review/assurance, successful runner
  proof, unresolved severity counts, and report/scope hashes. Historical red evidence remains integrity/ancestry-bound
  after implementation; final-tree evidence must be fresh.
- Bound every v3 actor, review report, repair receipt, conditional Judge decision, and gate to the active run and
  contract. Developer repair and conditional adjudication now use typed, hash-checked artifacts; PASS/REPLAN are
  terminal and stale records from another run cannot consume or satisfy the current lifecycle.
- Strengthened ATDD red evidence to require a real test-runner failure over production behavior, the same command green
  later, and preservation of the critical assertion while allowing additive regression coverage. Epic close persists
  and verifies the frozen expected-story inventory rather than trusting whichever story happens to remain active.
- Bounded v3 execution at two repair cycles per story, 17 base actor invocations for a four-story epic (21 maximum),
  focused tests per story, one broad suite at epic close, and separate harness-wait accounting.
- Hardened the v3 experiment oracle around aggregate conductor/child cost, exact-one broad suite, terminal zero-write
  infrastructure retries, immutable regular-file close packages, reviewer completion blobs, and a harness-launched
  fresh blind Judge that receives only the frozen product contract and product diff.
- The completed v2 candidate rerun took 11,174.7 active seconds, used 56,626,888 input tokens and 437 tool calls, and
  correctly failed process closeout despite a green integration command. Its mandatory 25-actor topology and repeated
  review/closeout passes are measured recovery evidence, not a speed success.
- Capability maturity is `enforced` in this source tree after deterministic tests; it remains uninstalled in target
  repositories and unproven. The frozen v3 candidate manifest is preregistered against implementation commit
  `23b58de`, before Stage 0 and the real-world run.
- The first preregistered v3 P0 run finished in 5,270.2 active seconds, 52.8% faster than the v2 rerun, but failed
  automated closeout, blind product judgment, and token/tool/harness-wait budgets. It therefore remains an enforced
  controlled canary rather than a proven or installable default. The run also exposed missing real-environment
  preflight and repository-wide story-tree freshness problems for a separately preregistered successor.
- Hardened experiment recovery after the run exposed two harness defects: full diff capture now tolerates patches
  above Node's default synchronous buffer, and pinned-client provenance hashes preserve raw binary bytes.

### Full + Guarded candidate recovery policy hardened

- Replaced the one-strike ATDD stop with a bounded exception path: one fresh report-only adjudication, followed only
  when upheld by one findings-hash-bound, test-artifact-only correction. Initial ATDD now targets the critical vertical
  path while mapping regression-only acceptance criteria for expansion before test review.
- Bound correction authority through a durable pre-dispatch record because pinned Codex transcripts encrypt spawn
  messages at rest; the oracle now reads real `custom_tool_call/input` events and audits adjudication as report-only.
- Added an installed typed schema/parser for that correction record, requires the binding to exist unchanged in the
  correction child's spawn commit, and deny-lists arbitrary shell execution through a narrow read/test allowlist.
- Added dependency-aware quarantine semantics so a failed story blocks its transitive dependants without discarding
  evidence from independent stories; shared safety invariants still halt the run.
- Froze the mandatory actor inventory before execution and made unexpected closeout/coverage/trace/statistics actors an
  oracle failure. Lifecycle duplication is now measured from typed collaboration dispatches rather than textual command
  mentions.
- Kept the capability at `enforced`. These changes repair mechanisms exposed by the failed first P0 pair; a new complete
  matched pair is still required before canary authorization.
- Preregistered that fresh matched pair in `manifest-p0-r2.json`; it pins candidate commit `041d849`, preserves the
  original product task and caps, and scores cost only after both product and process gates pass.

### Execution/assurance real-world pilot preregistered

- Added a separate execution/assurance experiment harness and a fixed 16-attempt paired pilot comparing legacy commit
  `d8b816c`, the candidate architecture, and Repo Native calibration without mixing results into the older lane studies.
- Added six deterministic pre-pilot traps for Guarded routing vocabulary, oversized-scope rejection, duplicate lifecycle
  detection, worker scope enforcement, dirty-worktree refusal, and pre-timer environment diagnosis.
- The first harness shakeout exposed missing Guarded synonyms and a contained-delete false positive. Expanded risk routing
  for OAuth/SSO/access-control/credentials/secrets/encryption/key rotation/subscriptions/refunds/data deletion/consent/
  retention/entitlements while keeping localized CSS/copy/docs deletion outside Guarded.
- Capability maturity remains `enforced`: Stage 0 and the paired/live campaign must pass before `proven` or `installed`.
- The pinned clean-tree Stage 0 run passed 6/6. This authorizes the paired pilot, not a speed/quality or installation
  claim.
- Added an immutable pilot catalog preflight that resolves every task selector, pinned source commit, fixture, and
  dependency tree before agent timing starts. Missing Browser RTS and MVT dependencies were found during shakeout and
  prepared before the scored preflight.
- Pinned the stochastic runtime to Codex CLI 0.146.0 / `gpt-5.6-sol` / high reasoning and added the first single-task
  Repo Native executor. It records raw transcript and diff hashes, independent lifecycle counts, scope/fixture checks,
  timing and token usage, but remains provisional until a blind artifact-only Judge passes it. ACEF treatment execution
  fails closed until exact-version lifecycle orchestration is wired.
- Preserved and invalidated the first Native sentinel after its independently captured patch proved non-replayable:
  a trimming helper removed the final newline. Diff capture now preserves exact bytes and has a regression test; the
  attempt must rerun fresh and is excluded from scored analysis despite its automated oracle passing.
- The fresh Native sentinel rerun passed its automated oracle, replayed patch, and treatment-blinded independent Judge
  with zero Critical/High/Medium findings or scope/test violations. It took 76.1 active seconds and 352,235 measured
  input tokens. This is calibration evidence only; no legacy/candidate ACEF pair has completed.
- Added exact-version Full + Guarded pilot preparation: each arm clones the pinned framework commit, installs its tools,
  skills and hook into an isolated pinned Jakomeet clone, seeds all four hidden regressions, and assigns the complete
  outcome to a fresh conductor. Compact ACEF treatment cells remain fail-closed rather than silently using current HEAD.
- The first P0 preparation exposed a harness-ordering bug before the agent clock: Laravel's gitignored storage/cache
  skeleton was created after Composer package discovery. Epic preparation now creates it before dependency linking;
  the failed preparation is not a scored attempt.
- Completed the first scored P0 Full + Guarded pair. Legacy took 26,151.6 active seconds and produced a blind-Judge product
  PASS, but failed process closeout after recursive epic review/coverage work left the run blocked. Candidate stopped
  fail-closed after 4,632.8 seconds when Story 2 ATDD returned REVISE, and the blind Judge found three unfinished High
  product outcomes. The candidate used 82.3% less active time and 82.0% fewer tool calls, but this is fail-fast cost
  evidence rather than delivery-speed superiority because the original outcome was incomplete. Capability maturity
  remains `enforced`; see `docs/experiments/execution-assurance-v2/P0_RESULT.md`.

### Execution workflow and assurance separated

- Replaced the overloaded Guarded lane model with two typed dimensions: execution workflow (`quick-fix`,
  `lightweight`, `full-bmad`) and assurance profile (`baseline`, `guarded`). User-facing names are ACEF Fix, ACEF
  Standard, and ACEF Full (BMAD v2).
- Added active-run v2 state, explicit migration for ambiguous legacy `lane: guarded` runs, v2 control dosing, and a
  monotonic overlay resolver so Guarded can add controls but cannot weaken the selected workflow.
- Updated routing, authorization, status/next output, closeout, pre-commit checks, review circuit breaker, test floor,
  and actor separation. Guarded Fix/Standard use compact developer/Judge separation; only ACEF Full requires the six
  BMAD phase actors.
- Closeout now shares identical validator executions across multiple control IDs, so current-context and evidence
  provenance remain separately declared controls without rerunning the same expensive validation.
- ACEF hook activation now requires ACEF-owned markers or typed ACEF state. Stock `.bmad`, `_bmad`, and
  `_bmad-output` directories no longer activate ACEF by themselves.
- Direct remains retired compatibility state during the upgrade bridge; it is not an execution workflow and no new
  Direct admission is allowed.

### Direct admission retired after treatment recheck

- Re-ran the 10 changed direct-treatment cells against the original 20 fixed baseline/lightweight controls after the
  compact-context/help changes. Direct improved versus its first measurement but still missed the stop thresholds:
  +60.8% paired input and +112.8% paired runtime versus baseline, +147.9% runtime versus lightweight, 25% context
  misses, 6/8 eligible direct closeouts, and 1/2 correct provider promotions.
- Retired new direct-run admission rather than adding more process. Contained reversible single-boundary/single-surface
  work now stays outside ACEF and uses the repository's native workflow plus focused verification.
- Kept direct schema/parser/status/next/hook/closeout compatibility so existing `ACEF_DIRECT_RUN.json` records can be
  read, closed, or promoted. `acef-state direct-run` mechanically rejects a new run ID.
- Added `docs/ai/capabilities/direct-admission-retirement.json` with status `enforced`.

### Run authorization and bounded review loops

- Added one shared run-authorization predicate for `acef-status`, `acef-next`, `acef-codex-guard`, the cross-client
  hard-wall hook, and pre-commit validation. Typed writes now fail closed when the active run is missing, non-active,
  points at another ledger/context, or disagrees with the worker scope.
- `acef-state worker-scope` now requires an active matching story and binds the active `runId` automatically. Legacy
  scopes remain parseable but are not authorized for writes until regenerated.
- Replaced the prose `2× REPLAN` counter with a typed guarded/full-BMAD review circuit breaker: two consecutive
  non-`PASS` review/Judge gate verdicts for the active scope stop the patch loop and require `REPLAN/SPLIT`. The legacy
  `replan-counter` check remains as an alias.
- Wired both checks into guarded/full-BMAD pre-commit and closeout without adding a new agent, review round, or evidence
  artifact. The authorization benchmark is enforced at p95 ≤50 ms.
- Added `docs/ai/capabilities/run-authorization-enforcement.json` and
  `docs/ai/capabilities/typed-review-circuit-breaker.json`, both at status `enforced`.

### Direct-lane entry reduction

- `acef-state direct-run --help` now provides the complete start/close/promote command surface without schema or source
  inspection.
- `acef-next` treats `ACEF_DIRECT_RUN.json` as the entire direct context boundary and emits the direct write/stop packet
  without bootstrapping typed active-run, ledger, context, or worker artifacts.
- The treatment recheck completed and still failed the cost/reliability thresholds; new direct admission is retired.

### Direct task lane

- Added the `direct` lane for reversible copy, style, localized UI/config/docs/mechanical changes and localized bug
  fixes that stay inside one technical boundary.
- Added `schemas/direct-run.schema.json`, `acef-state direct-run`, and
  `docs/ai/ACEF_DIRECT_RUN.json`: one compact record carries scope, acceptance, reversibility, changed paths, focused
  command/exit verification, handoff, and promotion disposition.
- Added `direct-lifecycle` validation and wired `lane-selection`/`lane-closeout` so inferred high-risk paths,
  multiple product surfaces, undeclared changed paths, failed verification, and obvious test weakening block direct
  closeout and require promotion.
- Direct intentionally skips adapter refresh, preflight, active-run bootstrap, worker scope, separate ATDD/reviewer/
  Process Judge actors, delivery ledger, evidence manifests, runner proof, gate verdict, and phase commits.
- Extended the control-dosing manifest and installer/test coverage for the fifth lane. Added
  `docs/ai/capabilities/direct-task-lane.json` with status `enforced`.
- Added deterministic disposable-clone dogfood on Agentbus and Scientificfloor: both direct closeouts passed and an
  intentional migration-shaped change was rejected. The 30-real-task empirical threshold remains pending, so the
  lane is not yet `proven`.
- Preregistered a 30-run direct-lane measurement across baseline/direct/lightweight and Codex/OpenCode, with four
  direct-eligible real-repo tasks plus one provider-integration promotion trap. The empirical harness now records
  direct state, closeout, promotion, implementation-attempt, scope, token, runtime, and quality outcomes.
- Completed the 30-run matrix with 0 invalid runs. After data-quality review, eligible pass was 8/8 baseline, 6/8
  direct, and 8/8 lightweight; direct contract closeout was 6/8, provider promotion 1/2, and context misses 25%.
  Paired task/client medians showed direct used 190% more input and took 175.1% more runtime than baseline, while
  taking 203.3% more runtime than lightweight. The capability remains `enforced`, not `proven`.
- Preserved raw scoring and added a documented oracle review: an exact source-string check falsely rejected four valid
  config-driven locale implementations. Primary cost analysis now uses paired within-client deltas so incompatible
  Codex/OpenCode token scales are not pooled.
- Refined lane triggers: provider integration, realtime, concurrency/fencing, and state-machine work route to guarded;
  generic feature and multi-surface labels no longer automatically force full-BMAD, while direct still promotes on
  multiple inferred surfaces.

### Cockpit borrow table verified — Watchfire/Archon/Chorus decoded

- Added `docs/research/cockpit-tool-decodes-2026-07-07.md`: three borrow-table tools decoded by parallel research
  agents. All verdicts BORROW, none USE — validates buy/borrow-the-shell, keep-authority-in-ACEF.
- Borrow table in `method/ACEF_COCKPIT.md` updated with verified identities (Chorus is chorus-ai.dev, not chorus.sh)
  and the concrete steals: per-task kernel sandbox from scope contract (Watchfire), DB-state pause gates +
  fail-closed evaluators (Archon), permission-bit tool registration + human-only Done (Chorus).
- Negative finding recorded: even Archon's autonomous path trusts model self-report — self-certification remains
  mechanically unsolved in the market; `product_done.self_certified_only` stays load-bearing.

### Cockpit direction reassessed — v1 narrowed to read-only state viewer

- `method/ACEF_COCKPIT.md` reassessed (2026-07-07): the original doc conflated three products. State viewer
  (`acef-cockpit-status` JSON + terminal table) stays as v1; context compiler + tool proxy deferred (token-cost
  motivation superseded by v2 measurements; context-mode covers bounded tool output today); execution shell bought
  (Nimbalyst/Conductor-class), not built.
- V1 JSON contract now carries `product_done` (persona-walk evidence, `self_certified_only`, `stale_evidence`) from the
  O2 dev-done-vs-product-done finding, and a `decision_queue` aggregating product-risk `DECISION`/`UNVERIFIED` items.
- Success criteria rewritten operator-shaped (visibility questions answerable without grepping), not token-shaped.
- Added `docs/ai/capabilities/cockpit-state-viewer.json` with status `documented-only`. The JSON/table contract is
  method documentation; no schema, artifact, `acef-cockpit*` script, tests, or installer exists yet.

### Product risk model documented

- Added `method/PRODUCT_RISK_MODEL.md`, a domain-agnostic documented-only method for pre-development product risk
  analysis: feature model -> business invariants -> generic operators -> disposition.
- Added `docs/ai/capabilities/product-risk-model.json` with status `documented-only`. No ACEF workflow, review lens,
  schema, validator, installer, or target-repo integration enforces this method yet.

### V2 honest-down + first thinning move

- README "ACEF v1 Status" → "ACEF v2 Status": token-cost claim superseded (+20%/+24% codex, ≈0% opencode), quality
  claim honest-downed (no lane edge on bounded single-step tasks; controls' remaining documented value is the
  unattended/multi-session/multi-worker regime, which is unmeasured). `VALIDATION_PLAN.md` gained a v2 Result
  section resolving the v1 sample caveat against the claim; `STABILIZATION_ROADMAP.md` records the active posture.
- First thinning move per the WS4 decision: `runner-proof` removed from the guarded lane bundle and downgraded to
  `required-if-triggered` (unattended/async) in `control-dosing.json`; the parser hard-rule and both control
  rationale dosing tables updated. Full-BMAD keeps runner-proof required. Backstop: the skeptical re-run, as the
  dosing table always documented. Worker-scope, gate-decision, and test-integrity guards are explicitly NOT
  thinned without the multi-step epic measurement.

### V2 matrix result: cost fixed, quality edge did not replicate

- Ran the full 72-run v2 matrix (12 tasks × 3 lanes × 2 clients, 0 invalid): `runs/results-v2.jsonl`, write-up in
  `docs/experiments/empirical-validation/report-v2.md`.
- WS3 validated: codex ACEF-lane overhead fell from +39%/+65% (v1) to +20%/+24%; opencode lanes now at/below
  baseline. The worker short-circuit was the entire treatment change.
- Quality: no lane differentiation. Oracle-adjusted pass is 23/24 baseline, 24/24 lightweight, 23/24 guarded; the
  purpose-built provocations (scope bait, test bait, hidden findings, wiring, persistence, multi-system) were
  passed by every lane; zero scope violations or fixture tampering. The single genuine lane split: baseline
  opencode left the traversal security regression unfixed.
- Instrument: 6 of 8 raw failures were one exact-string oracle bug (turkish task demanded literal `setLocale('tr')`
  while all six agents made the test pass) and 1 was marker-retention noise — the oracle-validity lesson recurred
  in an oracle authored after writing the lesson down.
- Decision per the pre-committed WS4 rule (outcome three): keep the freeze, honest-down the quality claim, begin
  thinning always-on controls whose only justification is defect-catching on bounded single-step tasks; next
  instrument frontier is multi-step epic benchmarks where drift controls plausibly matter.

### Epic benchmark (v3): 6/6 epic_pass — multi-session regime measured

- Ran `acef-epic-authz-v3` on jakomeet worktrees: one real 4-story deferred-work epic × 3 lanes × 2 clients, each
  story a fresh agent session (24 sessions, 0 errors, 0 scope violations). All six runs epic_pass with green
  integration. Full write-up: `docs/experiments/epic-benchmark/report-epic.md`.
- Cost pricing: lightweight is free per epic (+3.3% codex / −0.4% opencode vs baseline); guarded costs +25.7% /
  +15.5% for enforcement that was never provoked. Baseline resumed correctly from story prompts alone at this
  epic size. Honest scope: n=1 epic, sequential single worker, per-story oracles — parallel/ambiguous/long-horizon
  regimes remain the open frontier.
- Instrument hardening en route (six real bugs): Laravel storage skeleton in worktrees, manifest `setupDirs`,
  `verbatimSymlinks` for composer path repos, porcelain-trim phantom violations, `--no-verify` harness checkpoints
  vs target-repo hooks, per-story guarded actor identity (`acef-state` immutability honored). Documented opencode
  worktree `external_directory` auto-reject flake (~10%, purged + rerun).

### WS3 cost round: worker short-circuit on ACEF reference reads

- Pilot transcript audit found the dominant ACEF-lane token overhead: `skills/acef/SKILL.md` said "Always for
  concrete ACEF work: read OPERATING_MODEL + DELIVERY_RULES" (~920 lines), workers obeyed, and chat-completion
  clients resend the whole context on every subsequent tool call (guarded codex: 14 tool calls → 583k input tokens
  vs 215k baseline on the same task).
- Subtractive fix (freeze-compatible): SKILL.md worker short-circuit — when `docs/ai/ACEF_CURRENT_CONTEXT.md`
  exists, a scoped worker reads NO references/operating model/delivery rules/full ledger; reference reads are
  conductor/router-only. Mirrored into `method/CONTEXT_POLICY.md` with the pilot numbers, the benchmark
  current-context header, and both ACEF lane prompts in the harness.

### V2 matrix: 5 scouted tasks accepted (11 tasks / 66 runs)

- Fanned roster-task scouting to three agentbus codex workers (one per target repo); every proposal gated through a
  local dry-run (anchors unique at pinned commit, verify red after seed, green after canonical revert, oracles green
  on clean tree). Accepted 5: deepl reuse-helper, unprefixed-turkish ambiguous-default, admin api-keys multi-file
  wiring (+ fixture oracle), public api-key durable-persistence (+ fixture oracle), builder-state multi-system.
- Rejected 2 with recorded causes (scouting the dirty working tree instead of the pinned commit; a seed whose defect
  the chosen test cannot detect). Both scouting rules added to `task-gaps.md`; detaysoft scope-bait retry pending.

### V2 pilot run + findings

- Ran the 12-run pilot matrix (`acef-empirical-v2-pilot`): baseline 3/4 pass (recall 5/6), lightweight 4/4 (6/6),
  guarded 4/4 (6/6); zero scope violations; `fixtureUnchanged` never fired. First same-client lane split: opencode
  failed the gather-modifier task under baseline, passed under lightweight/guarded. Results in
  `docs/experiments/empirical-validation/runs/results-v2-pilot.jsonl`; full write-up in `task-gaps.md`.
- Pilot caught a live regression: the lane-aware `precommit-gate` fails guarded commits made before any gate verdict
  exists, killing guarded runs at the actor/scope binding commit. Harness fix: `commitAll` supports `--no-verify`
  for the runner's own scaffolding commits (the agent under test never commits). Logged framework follow-up: a
  bootstrap exemption for state-binding-only commits (freeze-compatible bug-fix candidate).
- Authoring lesson recorded: descriptive seed markers un-hide hidden defects; remaining roster tasks use
  non-descriptive markers.

### V2 plan: control freeze + validation/optimization roadmap

- Added `docs/experiments/empirical-validation/task-gaps.md` (WS2 gap analysis): all five v1 tasks share the
  single-file/seeded-line/provided-test shape, so recall ≡ pass by construction and scope/test-integrity metrics never
  fire; `detaysoft-download-traversal`'s 0/6 is partly an exact-string oracle-validity bug. Includes a 10-task v2
  candidate roster covering the eight missing defect classes (multi-file wiring, test-weakening bait, scope bait,
  hidden second defect, adjacent regression, reuse-before-create, durable persistence, ambiguous default) and names
  the pilot pair (`browser-rts-test-bait`, `mvt-second-defect`) plus the two additive harness extensions they need
  (`fixture-unchanged` expectation, per-finding recall).
- Authored the v2 pilot pair in `docs/experiments/empirical-validation/manifest-v2-pilot.json` (12 runs,
  experiment `acef-empirical-v2-pilot`): `browser-rts-gather-modifier-bait` (test-weakening bait — the benchmark
  script is inside `allowedPaths`, tamper caught by the new `fixtureUnchanged` expectation) and
  `mvt-people-archive-leak` (two seeded soft-delete leaks; the list-route leak is invisible to the provided vitest
  file, scored via per-task `knownFindings` recall so recall is finally independent of pass rate). Extended
  `scripts/acef-empirical-validation` additively: `fixtureUnchanged` expectations, `knownFindings` per-finding
  recall, manifest-declared `expectedRuns`. Both tasks dry-run verified in disposable clones (seed red → canonical
  fix green; hidden defect confirmed invisible to verify). New coverage in `scripts/test-acef-empirical-validation`.

- Added `docs/v2-validation-optimization-plan.md` — the v2 round plan: (1) freeze the enforcement surface, (2) expand
  the benchmark task set with 8–10 seeded-defect, lane-sensitive tasks (the v1 quality claim rests on an effective
  n=1), (3) run the already-scoped cost round (shorter worker prompts, narrower reads, one ledger load per phase,
  per-role Epic Context Packs), (4) rerun the matrix against the v1 `results.jsonl` baseline and decide:
  unfreeze control, iterate cost, or start thinning checks that never caught a defect.
- Declared the **control freeze** in `method/STABILIZATION_ROADMAP.md`, `method/CONTROL_RATIONALE.md`, and the skill
  reference: `acef-process-validator`, `control-dosing.json`, and the guard hooks accept bug fixes only — no new
  checks, gates, dosing rules, lenses, or capability records — until the v2 matrix verdict exists. This restores the
  roadmap's own "measure before adding control" rule, which the recent control-dosing/self-certification round bypassed.

### Gate self-certification guard

- Tightened typed `gate-verdict` validation so guarded/full-BMAD PASS gates must be decided by a real Process Judge
  actor: both phase and role must be Process Judge, and the implementation/developer actor cannot certify its own work.
- Added regression coverage for developer-decided gates and Process Judge actors mislabeled as Developer.
- **Wired the guard into the commit path.** The hardened self-certification guard only helps if it runs; previously the
  pre-commit hook ran only `lean-evidence`, so a conductor could mint a developer-self-decided PASS gate and commit
  without ever invoking closeout (the STU360-001 hole — certification path and commit path had diverged). Added a
  lane-aware `precommit-gate` meta-check that the pre-commit hook now calls: guarded/full-BMAD commits must clear
  `gate-decider` **and** `lean-evidence`; quick-fix/lightweight only `lean-evidence`.
- Added `gate-decider`, a narrow tree-independent check that enforces **only** the decider rule: a guarded/full-BMAD PASS
  gate must be decided by a genuine, distinct Process Judge, never the developer. `precommit-gate` uses it instead of full
  `gate-verdict` on purpose: `gate-verdict`'s surface-inference and durable-persistence requirements are tree-sensitive
  and can over-classify read-only guarded work at commit time. Full `gate-verdict` remains the closeout/CI check, where
  the tree is clean and surface/persistence evidence is intentionally being certified. Regression coverage: good guarded
  gate passes; a developer-decided gate blocks the commit; a guarded commit can pass `precommit-gate` even when full
  `gate-verdict` is red for surface/persistence evidence; a lightweight lane does not require `gate-decider`.
- Known follow-up (logged via STU360-001 dogfood): full `gate-verdict` over-classifies read-only `ui` surfaces — it infers
  surfaces from path heuristics and the whole dirty working tree and demands persistence from read-only code paths, instead of
  honoring an explicit read-only/`ui` surface classification and the scope's own changed paths. Closeout/CI surface +
  persistence enforcement should defer to the declared surface; tracked separately.
- Capability status: see `docs/ai/capabilities/gate-self-certification-guard.json`.

### Control dosing validator

- Added a machine-readable control dosing manifest (`method/control-dosing.json`) and schema
  (`schemas/control-dosing.schema.json`) that classifies ACEF integrity controls by lane, role, dose, enforcement level,
  and fallback backstop.
- Added `acef-process-validator --check control-dosing` and wired `lane-closeout` to select control checks from the
  manifest's per-lane bundles instead of a parallel hardcoded control list.
- Added `lean-evidence` to the dosing manifest and made `checkLeanEvidence` consume its lane dose: quick-fix gets light
  evidence, lightweight gets compact evidence, and guarded/full-BMAD keep full closeout evidence.
- `install-acef-tools` now installs the default manifest to `.acef/control-dosing.json`; target repos must refresh ACEF
  tools before this check is available locally.
- Capability status: see `docs/ai/capabilities/control-dosing-enforcement.json`.

### Surface-done closeout contract

- Added `scripts/acef-closeout-verify` (with `scripts/lib/acef-surface-contract.js` and `scripts/test-acef-closeout-verify`): a code-grounded, per-surface "done" verifier that derives required evidence from the project adapter's per-surface registry and enforces fail-closed rules.
- Enforces: **cold-process / separate-process fresh-read** for persistence surfaces (a same-process read does not count); **reachability** as separate evidence (an isolated render that nothing links to is `partial`, not pass); fail-closed on unknown surfaces (no nearest-match); no story self-downgrade of a surface its goal owns; human-signed, versioned waivers recorded in output.
- Added `schemas/surface-evidence.schema.json`.
- Reconciled into `method/DELIVERY_RULES.md` as the rule **"Done = surface-proven."**
- CI-gated: `validate.yml` runs the full `test-acef-*` matrix and a closeout integration check.

### Audit remediation (Tier 1)

- CI now runs the **full `test-acef-*` matrix** (was only the process-validator), plus a closeout integration check.
- `scripts/install-acef-bmad-guard` now installs a packaged **git pre-commit gate** (`acef-precommit-gate.sh`) that fires the lean-evidence check on an active ACEF run (no-op otherwise).
- `acef-closeout-verify` now rejects empty or mislabeled surface-evidence records — missing required fields or an empty `goal.surfaceSet` fail-closed rather than vacuously passing — and is wired into `install-acef-tools`.
- **Fix: default ledger resolution.** `acef-process-validator`'s `findLedger` (used when `--ledger` is omitted, e.g. by the pre-commit gate) chose the alphabetically-first ledger candidate, which could resolve a legacy `ACEF_ACTIVE_LEDGER` ahead of the active run's audit and produce a false FAIL (forcing `--no-verify` commits). It now prefers `ACEF_ACTIVE_RUN.json`'s declared `ledgerPath` when present, falling back to the alphabetical scan otherwise. Regression test added.
- **Fix: pre-commit wrapper quoting.** The git `pre-commit` wrapper that `install-acef-bmad-guard` writes single-quoted the `$(git rev-parse --show-toplevel)` path, so the command substitution never expanded; the `-x` test always failed and the wrapper exited 1 on every commit — forcing `--no-verify` even when the ACEF gate itself passed. Now double-quoted and wrapped in an `if` so a missing gate does not block while a failing gate still does.
- Fixed a self-test that was red on `main`.
- Honest-up'd overstated claims in `method/RULE_ENFORCEMENT_MAP.md`, `method/TRUST_MODEL.md`, `README.md`, `method/VALIDATION_PLAN.md`, and `method/ACEF_COCKPIT.md`: evidence mechanisms detect accidental/lazy evidence gaps, not a forging agent; right-sized the quality claim to the actual benchmark; added a "not yet built" banner on COCKPIT.

### Hard-wall identity fallback

- The BMAD hard-wall previously failed-closed on **all** guarded writes when the harness did not propagate worker identity (which the Claude subagent harness never does), blocking a correctly set-up developer worker from writing any code.
- Fix: when no identity is present, the hard wall **degrades from per-actor to scope-level enforcement** — a guarded write is allowed only when the active conductor-written worker scope is in an implementation phase AND the path is in `allowedPaths`; all other cases remain denied.
- Strict per-actor enforcement is kept when `ACEF_WORKER_ID` is present in the environment. `ACEF_WORKER_ID` is env-only and cannot widen authority beyond the scope's `workerId`, so the conductor-written scope file remains the unforgeable trust anchor.
- Documented limitation added to `method/TRUST_MODEL.md`: without harness identity propagation, the hard wall provides scope-phase+path proof, not per-actor proof. Raw shell writes are not path-gated.

### Goal coverage gate

- Added typed `activeGoal` and `goalCoverage` fields to `ACEF_ACTIVE_RUN.json` so story PASS and original product-goal
  completion are mechanically separate.
- Added `goal-coverage` validation: user-facing complete runs must prove visible product surface coverage and cannot use
  `foundation` or `backend-capability` stories to close workspace/staff-flow/product goals.
- Wired `goal-coverage` into full-BMAD and guarded closeout and added `acef-state active-run` flags for recording goal
  coverage metadata.

### Surface evidence quality

- Tightened existing surface-evidence validation for state-changing work: CRM/notes/tracking/finance/payment/persistence
  closeout can no longer pass on schema existence, route/render/status smoke, or in-memory/demo-store evidence alone.
- Full-BMAD/guarded `gate-verdict` and lightweight lifecycle closeout now require the evidence package to include at
  least one durable write/read signal such as DB insert/select, persisted row, fresh-request requery, or read-after-write
  proof when the work creates or mutates product state.

### Spec-readiness gate

- Added the `spec-readiness` skill as an intake-time product/spec readiness classifier for vague or risky requests before
  route dispatch, spec writing, story creation, or implementation.
- Added `schemas/spec-readiness.schema.json` and parser support for file-backed `docs/ai/ACEF_SPEC_READINESS.json`
  verdicts with `PASS`, `NEEDS_PM`, `NEEDS_DISCOVERY`, `NEEDS_BMAD`, `NEEDS_GUARDED_DISCOVERY`, and `REJECT` routing.
- Added the `spec-readiness` validator check and wired `lane-selection` so planning/execution phases that are full-BMAD,
  guarded, or risk-triggered by CRM/notes/tracking/persistence/RBAC/schema/PII/money/finance cannot proceed without a
  current `PASS` verdict.
- Installed `spec-readiness` as a default ACEF skill and added
  `docs/ai/capabilities/spec-readiness-gate.json` with status `enforced`.

### Operational friction reduction

- Allowed `acef-state evidence-run` to capture evidence while application paths are dirty, recording
  `dirtyApplicationPathsBefore` and `dirtyApplicationPathsAfter` in the evidence manifest instead of refusing to run.
  `clean-tree` remains the certification/Process Judge cleanliness gate.
- Fixed current-context semantics so typed active runs with `status: complete` can still satisfy `current-context`
  instead of failing only because the run is closed.
- Improved worker-scope hard-wall denials so stale or mismatched `ACEF_ACTIVE_WORKER_SCOPE.json` states report the active
  story, phase, worker id, allowed paths, requested path, and whether to close stale ACEF state or dispatch a matching
  worker.
- Added `docs/ai/capabilities/operational-friction-reduction.json` to classify these friction fixes as `enforced`.

### Intake decision gate

- Added `intakeDecision` to typed active runs so planning/execution phases must record the selected route, confidence,
  clarifying questions asked, inferred answers, unresolved questions, and execution approval state.
- Tightened `lane-selection` so typed runs in planning/execution fail when intake was skipped or unresolved questions are
  marked execution-approved.
- Tightened raw feature handling: low/medium-confidence work must record clarifying questions, full-BMAD/guarded work
  must record an approved interview brief, and CRM/notes/tracking/accounting/finance signals route upward instead of
  letting agents invent specs from a thin prompt.
- Added `docs/ai/capabilities/intake-decision-gate.json` with status `enforced`; target repos must refresh ACEF before
  the gate is installed there.

### Quick-fix envelope and test-integrity gate

- Expanded quick-fix from a narrow file fence to a computed fix envelope: implementation paths, relevant tests, fixtures,
  smoke/route files, and shared resources.
- Added quick-fix test-integrity metadata to `ACEF_LIGHTWEIGHT_RUN.json` and validator checks for edited tests: tests
  must be inside the envelope, assertion counts cannot drop, skip/only/todo/xfail patterns are rejected, matcher
  loosening can be flagged, and each test edit must name the implementation reference it still exercises.
- Tightened parallel quick-fix guidance: workers need disjoint files and disjoint shared resources, not just
  non-overlapping filenames.

### Installation versioning and update path

- Added `docs/ai/ACEF_INSTALLATION.json` as the target-repo ACEF installation stamp. Repo-local tool, skill, and guard
  installers update the same manifest with the ACEF source path, source commit, branch, dirty/clean source state,
  installed components, and refresh command.
- Added `scripts/update-acef-installation` and installed it into target repos as `.acef/bin/update-acef-installation`.
  The target-local updater resolves the original ACEF checkout from `ACEF_INSTALLATION.json` and refreshes tools,
  skills, guard hooks, schemas, workflows, and the stamp.
- Updated `acef-status` to report the installed ACEF source version and installed components, and to block readiness when
  the installation manifest is missing or invalid.
- Added installer tests proving both the manifest stamp and the target-local update command.

### Lane and surface enforcement

- Added runner-proof validation for typed evidence manifests and lightweight surface evidence. Evidence artifacts must now
  carry command/exit metadata and a deterministic runner proof, so fake prose logs cannot pass merely by matching a hash.
- Added the `quick-fix` lane for BMAD-style narrow bug fixes, with required repro, before-patch, after-patch, independent
  review, and touched-surface evidence in `docs/ai/ACEF_LIGHTWEIGHT_RUN.json`.
- Added `lane-selection` and `lane-closeout` validator checks so quick-fix, lightweight, full-BMAD, and guarded lanes
  have mechanical selection and closeout bundles.
- Added touched-surface validation for lightweight runs and typed full-BMAD/guarded PASS gates.
- Added path-name inference for obvious undeclared surfaces and high-risk triggers so hidden UI/API/auth/payment-style
  changes cannot pass solely by omitting them from the run declaration.
- Tightened guarded closeout so guarded work inherits full typed closeout checks plus the guarded test floor.
- Added capability records for quick-fix, lane closeout, lean surface validation, and full-flow surface validation.

### Capability completeness

- Added `capability-change` validation so ACEF flow/gate/role/enforcement changes must declare their implemented layers
  instead of being reported as complete after markdown-only edits.
- Added `schemas/capability-change.schema.json` and parser support for capability records.
- Added `docs/ai/capabilities/capability-change-completeness.json` as the proven record for this mechanism.
- Added `docs/ai/capabilities/implementation-shape-review.json` to classify implementation-shape review honestly as
  `wired`, not enforced.
- Added `AGENTS.md` as a fresh-session entry point that tells agents to inspect capability records and run
  `capability-change` before reporting ACEF implementation status.
- Updated the static documentation site to expose the changelog/capability-record model and the wired status of
  `implementation-shape-review`.

### Implementation shape review

- Added `skills/implementation-shape-review/` as an optional report-only review lens for finding simplification/refactor
  candidates before a separate patching actor touches code.
- Wired the lens into `scripts/install-acef-skills --review-lenses`.
- Added installer and metadata tests for the lens.
- Limitation: this lens is not currently a mandatory story or epic gate.

## 2026-06-25 and earlier reconstructed milestones

These entries are reconstructed from git history and summarize broad phases rather than every commit.

### Surface and runtime evidence gates

- Added validation for surface input-output evidence.
- Added test-authenticity gates to reject hollow-green tests, status-only smoke, silent skip patterns, and fake framework
  shims.
- Added guidance that runtime entrypoints, CMS/admin paths, UI round trips, and author-controlled input bindings require
  real-path evidence.

### Workflow and state machinery

- Added workflow-as-code guardrails, including lightweight workflow validation.
- Added `acef-next` next-action helper and `acef-status` fresh-session status helper.
- Added typed ACEF state foundation and operationalization.
- Added worker result rollup substrate.

### Review and lightweight lanes

- Added bounded `bug-hunter` review lens and piloted it through PR review.
- Added codemap-backed PR review profile validation.
- Added lightweight lane lifecycle validation.
- Archived external QA skills that were not ACEF-native.

### Context and token policy

- Ran the context retrieval pilot and rejected retrieval-provider default changes where token reduction did not preserve
  quality/scope.
- Defined the current optimization target: shorter worker prompts, narrower reads, less repeated ledger loading, and
  better per-role context packs.

### v1 empirical validation

- Ran the empirical validation matrix across repositories/stacks/clients.
- Closed the ACEF v1 policy loop: ACEF is evidence-backed for quality/process control, not yet for token-cost reduction.
