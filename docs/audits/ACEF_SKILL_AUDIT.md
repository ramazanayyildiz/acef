# ACEF Skill-Quality Audit

Auditor role: skill-quality reviewer (report-only). No skills were rewritten.
Scope: `acef`, `map-codebase`, `acef-adapter`, `bug-hunter`, `qa-only`, `qa`.
ACEF values checked against: actor separation, bounded context, evidence-backed gates, report-only review lenses, local-first install, portability (Claude/Codex/OpenCode).

Verdict at a glance:

| Skill | Tier | Headline issue |
|---|---|---|
| `acef` | **SOLID** | Reference list is large; mostly disciplined |
| `map-codebase` | **SOLID** | Slight overlap with `acef-adapter` |
| `acef-adapter` | **SOLID** | Dense; overlaps `map-codebase` |
| `bug-hunter` | **SOLID** | Best-in-class lens; version 0.1.0 still pre-release |
| `qa-only` | **BLOCKER** | gstack skill mislabeled as ACEF; hidden global state, broken dep |
| `qa` | **BLOCKER** | Mutating actor in a report-only fleet; fixes+commits code |

---

## 1. `acef` (Orchestrator)

1. **Activation clarity** — Good. Description names the trigger surface (routing, lane selection, durable evidence, helper coordination). Could enumerate a few literal trigger phrases like the other skills do. *NICE TO HAVE.*
2. **Scope boundaries** — Strong. "Coordinates without authoring implementation" is stated in the description and re-stated in Hard Boundaries. Actor separation is explicit (conductor ≠ implementer/reviewer/judge).
3. **Token economy** — Good intent ("Lean Default", path+verdict only, no full artifacts in chat). Risk: "Required References By Situation" lists ~14 reference docs; an agent that reads several completely per the instruction can blow context. The rule says "read only what the step needs," which mitigates it. *SHOULD FIX:* add a hard cap (e.g. "never load more than 2 reference docs per step without recording why").
4. **Output contract** — Clear. Two fixed shapes (Default / Completion) with named fields. Good.
5. **Safety / actor boundary** — Excellent. Approval gates, "subagent output is a lead not evidence," no unapproved installs/deploys/migrations, BMAD-requires-real-runtime. This is the model the QA skills violate.
6. **Portability** — Good. Mentions `.acef/bin/acef-state` for typed runs but degrades gracefully ("where supported"). No hard Claude-only assumption. Stack-agnostic.
7. **Hidden/global state** — Low. `.acef/bin/acef-state` and `docs/ai/` are repo-local, not user-home global. Local-first compliant.
8. **Usable without excessive extra docs** — Borderline. The skill body is self-sufficient for routing, but real work pulls in many `references/*`. Acceptable for an orchestrator, but it is the heaviest reader here.
9. **"Do not do" explicitness** — Excellent. Hard Boundaries section is unambiguous.
10. **Highest-priority patch** — Cap reference-doc loading per step and add 2-3 literal trigger phrases to the description.

**Issues:** reference-load cap (*SHOULD FIX*); literal triggers (*NICE TO HAVE*).

---

## 2. `map-codebase`

1. **Activation clarity** — Excellent. Rich trigger list ("map this codebase", "how does this repo write", etc.).
2. **Scope boundaries** — Strong and explicitly read-only ("never modifies code", 4 read-only Explore sub-agents).
3. **Token economy** — Moderate risk. Spawns 4 parallel agents; each prompt is large and each returns a full report that the orchestrator then synthesizes. The "subagent output is a lead, verify before recording" rule is present and good. *NICE TO HAVE:* tell sub-agents to return bounded/structured output, not free-form essays, to keep synthesis cheap.
4. **Output contract** — Excellent. Concrete `codebase-map.md` shape, Pattern Registry table schema, freshness stamp, status labels (READY/PARTIAL/MISSING). One of the clearest contracts in the set.
5. **Safety / actor boundary** — Strong. Read-only; secrets are P0 with "report path+type, never print value." Good.
6. **Portability** — Good. Stack-agnostic detection across many manifests; no Claude-only calls beyond the generic Agent/Explore subagent type (which Codex/OpenCode must map). *SHOULD FIX:* note that "4 parallel Explore sub-agents" assumes a host that has parallel read-only sub-agents; give a serial fallback for hosts that don't.
7. **Hidden/global state** — None. Output is repo-local (`docs/codebase-map.md`).
8. **Usable without extra docs** — Yes, fully self-contained except an optional `PATTERN_REGISTRY.md` contract ("when ACEF method docs are available" — graceful).
9. **"Do not do" explicitness** — Good ("never trust docs over code", "never print secrets", "read-only").
10. **Highest-priority patch** — Add a serial/non-parallel fallback note for portability, and bound sub-agent output size.

**Issues:** parallel-subagent portability fallback (*SHOULD FIX*); bound subagent output (*NICE TO HAVE*); overlap with `acef-adapter` (see cross-skill).

---

## 3. `acef-adapter`

1. **Activation clarity** — Good, with explicit triggers. The description is very long (a paragraph) — accurate but heavy.
2. **Scope boundaries** — Excellent and repeated: "read-only fact-finding; never installs, never writes tests, never changes code, never picks a framework without approval." Closing "Not this (read-only)" section reinforces it.
3. **Token economy** — Moderate. Dense procedure (9 fields + research mechanisms + YAML schema). Explicitly says "summarize signatures/paths instead of dumping whole files" and "avoid whole-repo dumps" — good. The skill body itself is long.
4. **Output contract** — Strong. Defines output path, freshness stamp, READY/DRAFT/MISSING tags, and a compact YAML entry schema. Clear.
5. **Safety / actor boundary** — Excellent. "Gate evidence rule: subagent summaries are leads, not adapter facts"; symbol-level grounding mandatory before copy. Best evidence discipline in the set.
6. **Portability** — Good. Stack-agnostic by design ("detect, never assume"); avoids embedding/vector deps deliberately. No host-specific calls.
7. **Hidden/global state** — None. Output is repo-local; explicitly says run-local state belongs in the ledger, not the adapter.
8. **Usable without extra docs** — Mostly. References `PATTERN_REGISTRY.md` for the JSON variant (graceful, optional).
9. **"Do not do" explicitness** — Excellent (dedicated read-only boundary section + "never record a desired future convention as current fact").
10. **Highest-priority patch** — Trim the description to one or two sentences + trigger list; the body already carries the detail.

**Issues:** overlong description / body density (*SHOULD FIX* for the description, *NICE TO HAVE* for the body); functional overlap with `map-codebase` (cross-skill).

---

## 4. `bug-hunter`

1. **Activation clarity** — Good. Triggers listed; clearly PR/lightweight-review report-only static analysis. "Never edits code or approves gates" in the description itself.
2. **Scope boundaries** — Excellent. Bounded scope, finite scan budget + max findings required, returns `BLOCKED` if scope/budget/profile missing, "never expand scope silently."
3. **Token economy** — Excellent. "Load only the generated codemap review-profile and matching registry slice." Detailed report goes to an artifact; chat gets a compact result. Exemplary.
4. **Output contract** — Excellent. Frontmatter declares `finding-contract`, `mode: report-only`, `disposition`. Body defines verdict enum (CLEAR/FINDINGS/BLOCKED), per-finding evidence schema, finding-type enum, reviewed-vs-unreviewed scope. Strongest contract here.
5. **Safety / actor boundary** — Excellent and exactly what the prompt asks to preserve: "you advise an existing Code Reviewer; you are not a new actor or gate." "Never edit files, commit, spawn workers, approve a gate, or mark complete." Security findings deferred to a future security lens. **Confirmed report-only by skill text** — no change to its disposition.
6. **Portability** — Good. No host-specific calls; uses a local `templates/report-template.md` (verified present). Portable.
7. **Hidden/global state** — None. Inputs are passed in; report path is caller-supplied.
8. **Usable without extra docs** — Yes. Self-contained; only needs the caller-provided codemap profile + registry slice (which is the correct dependency, not a doc-read burden).
9. **"Do not do" explicitness** — Excellent (explicit "Do not report as bugs" list + closing actor-boundary paragraph).
10. **Highest-priority patch** — Bump `version: 0.1.0` once stabilized; optionally add a one-line "report-only" restatement at the very top of the body (frontmatter already says it). Both minor.

**Issues:** pre-release version number (*NICE TO HAVE*). This skill is the reference standard the others should match.

---

## 5. `qa-only`  — **BLOCKER**

This is a **gstack skill copied into the ACEF tree**, not an ACEF-native skill. It carries the full gstack runtime contract.

1. **Activation clarity** — OK on the surface (triggers present), but the name collides conceptually with ACEF review lenses and it auto-activates ("diff-aware mode automatic on a feature branch"), which can fire inside an ACEF lane without ACEF approval.
2. **Scope boundaries** — Internally coherent (report-only browser QA) but **not bounded by ACEF**. It self-scopes from git diff and auto-detects ports/URLs; an ACEF lane expects scope to be handed in, not inferred.
3. **Token economy** — **Severe bloat.** ~330 lines before the actual QA workflow: a 40-line bash preamble, a full "Voice / Garry Tan" persona section, Completeness Principle tables, Contributor Mode, Telemetry-run-last, Plan Status Footer. Almost none of it is QA. This is the worst token offender in the set.
4. **Output contract** — Mixed. The QA report shape is fine, but it is wrapped in gstack status protocols (DONE/BLOCKED/NEEDS_CONTEXT) that differ from ACEF's verdict vocabulary (PASS/CLEAR/FINDINGS).
5. **Safety / actor boundary** — Partial. It *is* report-only ("never fix"), which is correct, but it runs side-effecting bash on every invocation (writes `~/.gstack/analytics/*.jsonl`, `touch ~/.gstack/.proactive-prompted`, opens a browser tab, prompts to `open` an external URL). ACEF says "no broad automation, no unapproved side effects" — this violates that on load.
6. **Portability** — **Broken.** Hard-codes `~/.claude/skills/gstack/bin/gstack-*`. Verified: that path is **absent on this machine**. On Codex/OpenCode (no `~/.claude/...`) the entire preamble degrades to error-swallowed no-ops, and the binary-dependent behavior silently disappears. Not portable.
7. **Hidden/global state** — **Heavy.** `~/.gstack/sessions`, `~/.gstack/analytics`, `~/.gstack/.proactive-prompted`, `~/.gstack/.telemetry-prompted`, telemetry config. Directly violates ACEF local-first. Phones home if telemetry is on.
8. **Usable without extra docs** — Body is self-contained for QA, but depends on a whole external gstack install + `gstack/ETHOS.md`, `gstack-upgrade/SKILL.md`, etc.
9. **"Do not do" explicit** — Yes for QA ("never fix", "never read source code", "ACEF gate compatibility: do not mark a process gate PASS"). That last line shows someone knew it would touch ACEF — but bolting one compatibility sentence onto a foreign runtime is not integration.
10. **Highest-priority patch** — **Do not ship this as an ACEF skill.** Either (a) keep it as an external gstack tool that ACEF *calls* via an adapter and treats its output as a lead, or (b) extract a thin ACEF-native `acef-qa-report` lens (browser evidence + report path + verdict, no preamble, no telemetry, no persona, repo-local output). Strip the gstack preamble/voice/telemetry entirely from anything living in the ACEF tree.

**Issues:** mislabeled foreign runtime (*BLOCKER*); hidden global state + telemetry (*BLOCKER*); broken portability (*BLOCKER*); token bloat (*SHOULD FIX*); on-load side effects (*SHOULD FIX*).

---

## 6. `qa`  — **BLOCKER (most serious)**

Same gstack chassis as `qa-only`, plus it **mutates the repo**.

1. **Activation clarity** — Dangerously broad triggers: "does this work?", "fix what". These fire easily and pull in a code-mutating actor. Auto diff-aware on any feature branch.
2. **Scope boundaries** — Weak for ACEF. It bootstraps test frameworks, installs packages, writes CI workflows, edits `CLAUDE.md`/`TESTING.md`, and fixes source — self-scoped from git diff. Massive blast radius.
3. **Token economy** — **Worst in the set** (~1100 lines): full gstack preamble + entire test-bootstrap subsystem + fix loop + WTF-likelihood heuristic.
4. **Output contract** — Functional but heavy; mixes gstack status protocol with QA report + commit log.
5. **Safety / actor boundary** — **Direct violation.** ACEF separates implement / review / verify-patch / judge actors. `qa` is reviewer + implementer + committer + test-author in one skill: it edits source (`Phase 8 Fix Loop`), makes commits (`fix(qa): ...`), writes regression tests, and `git revert`s. This is exactly the actor collapse ACEF forbids. It does include an ACEF guard ("When invoked through ACEF, ACEF gates override this bootstrap... do not install without preflight + approval") — good that it exists, but it is one paragraph governing a skill whose default identity is "QA engineer AND bug-fix engineer."
6. **Portability** — Broken, same gstack path dependency as `qa-only`; verified absent here.
7. **Hidden/global state** — Heavy (same `~/.gstack/*` + telemetry), plus it now also writes to the user's repo (commits, CI files, CLAUDE.md).
8. **Usable without extra docs** — No; depends on the gstack install and external essays.
9. **"Do not do" explicit** — Partial. Has good local rules (minimal fix, one commit per fix, revert on regression, never modify existing tests) but its *whole purpose* is the thing ACEF wants gated behind separate actors + approval.
10. **Highest-priority patch** — **Must not be the default QA path in ACEF lanes** (the prompt requires this). Keep `qa` strictly outside ACEF, or gate it so that inside an ACEF run it collapses to report-only and hands fixes to a separate `verify-patch`/implementation actor. The fix/commit/bootstrap behavior cannot run under an ACEF lane without explicit per-action approval and actor separation.

**Issues:** actor collapse (reviewer+implementer+committer) (*BLOCKER*); default-mutating under broad triggers (*BLOCKER*); hidden global state + telemetry (*BLOCKER*); broken portability (*BLOCKER*); token bloat (*SHOULD FIX*).

---

## Cross-Skill Summary

### Overlapping responsibilities
- **`map-codebase` ⟷ `acef-adapter`** are ~70% the same job: scan repo, produce stack/architecture/conventions/concerns + a Pattern Registry with golden neighbors, do-not-copy, freshness stamps, READY/PARTIAL/MISSING. `acef-adapter` adds living-memory schema, risk surface, and symbol-level contract grounding; `map-codebase` adds the 4-parallel-agent mechanism. They should not both be first-class entry points with overlapping triggers ("map this repo", "pattern registry" appear in both).
- **`qa` ⟷ `qa-only`** are the same ~700/1100-line skill differing only in "fix or not." 95% duplicated text (identical preamble, voice, telemetry, modes, health rubric, framework guidance).
- **`bug-hunter` ⟷ `qa*`** both surface defects but at different layers (static lens vs runtime browser). Low conflict; keep separate.

### Confusing names / triggers
- `qa` triggers "does this work?" / "fix what" are too broad and will hijack ACEF lanes toward a mutating skill.
- `qa` vs `qa-only` — the distinction (fix vs report) is invisible from the names; a user types "qa" and gets the code-mutating one by default. **This is the exact thing the prompt warns against.**
- "pattern registry" / "map this repo" trigger both `map-codebase` and `acef-adapter`.

### Should be split
- None of the ACEF-native skills need splitting. `qa` *internally* should be split (the test-bootstrap subsystem is a separate concern from browser QA), but the real fix is removal from the ACEF tree, not splitting.

### Should be merged
- **`map-codebase` → fold into `acef-adapter` as its scan engine**, OR make `acef-adapter` explicitly *consume* `map-codebase`'s output (it already gestures at this). Two near-identical extractors with overlapping triggers is the main internal redundancy. Recommend: keep `map-codebase` as the generic stack-agnostic scanner, and have `acef-adapter` call it and add the ACEF governance/memory layer — document that dependency so they stop overlapping.

### Should stay optional
- `qa` and `qa-only` should be **optional, external, opt-in** — never auto-activated inside an ACEF lane, never the default ACEF QA path. ACEF should call them through an adapter and treat their reports as leads, not gates.
- `map-codebase` can stay optional (the adapter is the ACEF-blessed entry point).

### Metadata / frontmatter issues
- `qa-only` / `qa` carry `preamble-tier: 4` — a gstack-only field meaningless in ACEF; signals foreign origin.
- `bug-hunter` is `version: 0.1.0` (pre-release) while everything else is `1.0.0`; it is actually the most mature contract — bump it.
- `acef` description lacks literal trigger phrases that the others have.
- `acef-adapter` description is a full paragraph — overlong for a frontmatter field.
- Only `bug-hunter` uses the rich `kind/contract/mode/permissions/finding-contract/disposition` frontmatter. The other ACEF-native skills (`acef`, `map-codebase`, `acef-adapter`) would benefit from the same machine-readable `mode:`/`permissions:` tags so a host can enforce report-only vs mutating without reading the body.

### Token-bloat risks (ranked)
1. **`qa` (~1100 lines)** and **`qa-only` (~330 lines of non-QA preamble)** — by far the largest, mostly persona/telemetry/boilerplate unrelated to the task. Every invocation also runs a ~40-line bash preamble.
2. **`acef`** — the 14-item "Required References" list invites multi-doc loads; needs a per-step cap.
3. **`map-codebase` / `acef-adapter`** — free-form subagent reports + dense bodies; bound subagent output and trim the adapter description.
4. ACEF-native skills are otherwise lean and disk-first.

---

## Top recommendations (in priority order)

1. **BLOCKER — Get `qa` and `qa-only` out of the ACEF skill tree.** They are gstack skills: hidden `~/.gstack` global state, telemetry/phone-home, a broken `~/.claude/skills/gstack/bin` dependency (verified absent here), persona bloat, and — for `qa` — full code-mutation/commit/bootstrap that collapses ACEF's implement/review/judge actors. If QA-by-browser is wanted in ACEF, add a thin native `acef-qa-report` report-only lens modeled on `bug-hunter`.
2. **BLOCKER — Never make `qa` the default ACEF QA path** and narrow/remove its broad auto-triggers ("does this work?", "fix what").
3. **SHOULD FIX — Resolve `map-codebase` / `acef-adapter` overlap** by making one consume the other; deduplicate triggers.
4. **SHOULD FIX — Add a reference-load cap to `acef`** and add `mode:`/`permissions:` frontmatter to the three native skills that lack it (copy `bug-hunter`'s pattern).
5. **NICE TO HAVE — Bump `bug-hunter` to 1.0.0**, trim `acef-adapter`'s description, bound subagent output in `map-codebase`.

**Preserved per instructions:** no new frameworks proposed; actor separation untouched; `bug-hunter` treated as report-only (its text confirms it); `qa` kept off the default ACEF path.
