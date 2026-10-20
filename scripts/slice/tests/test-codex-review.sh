#!/bin/bash
# Self-test for the core review call scripts/slice/codex-review.sh (stack-neutral; moved from the adapter in R1/F8):
# dry-run shape, model required, a fresh output file per run, and the strict verdict line (ACEF-FIX-02).
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # scripts/slice
ROOT=$(cd "$HERE/../.." && pwd -P)
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
[ -x "$HERE/codex-review.sh" ]; check "$?" 0 "scripts/slice/codex-review.sh exists in the core"
REVIEW_MODEL=x "$HERE/codex-review.sh" --dry-run "$ROOT/templates/slice/review-brief.md" /dev/null 2>/dev/null | grep -q -- "-s read-only"
check "$?" 0 "dry-run is read-only"
env -u REVIEW_MODEL SLICE_METHOD_CONFIG=/nonexistent "$HERE/codex-review.sh" --dry-run "$ROOT/templates/slice/review-brief.md" /dev/null >/dev/null 2>&1
check "$?" 2 "refuses without a model"
n=$(ls "$ROOT"/stacks/*/codex-review.sh 2>/dev/null | wc -l | tr -d ' '); check "$n" 0 "no adapter keeps its own copy"
# ---- ACEF-FIX-02: fresh output per run, strict verdict line (fake codex; no network, no model) ----
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-cr.XXXXXX"); trap 'rm -rf "$T"' EXIT
cat > "$T/fake-codex" <<'F'
#!/bin/bash
# writes $FAKE_BODY (if set) to the path after -o, swallows stdin, exits $FAKE_RC
o=""; while [ $# -gt 0 ]; do [ "$1" = "-o" ] && { o=$2; shift; }; shift; done
cat >/dev/null
[ -z "${FAKE_BODY+x}" ] || printf '%s\n' "$FAKE_BODY" > "$o"
exit "${FAKE_RC:-0}"
F
chmod +x "$T/fake-codex"
printf 'brief\n' > "$T/brief.md"
review() { # <want rc> <label> [FAKE_BODY]  (FAKE_BODY unset = model wrote nothing)
    local want=$1 label=$2
    if [ $# -ge 3 ]; then FAKE_BODY=$3 REVIEW_MODEL=x CODEX_BIN="$T/fake-codex" "$HERE/codex-review.sh" "$T/brief.md" "$T/out.md" >/dev/null 2>&1
    else env -u FAKE_BODY REVIEW_MODEL=x CODEX_BIN="$T/fake-codex" "$HERE/codex-review.sh" "$T/brief.md" "$T/out.md" >/dev/null 2>&1; fi
    check "$?" "$want" "$label"
}
printf 'Karar: PASS\n' > "$T/out.md"
review 3 "stale PASS in out.md + model wrote nothing -> TOOL ERROR (3), never PASS"
review 0 "Karar: PASS -> 0" 'Karar: PASS'
grep -qx 'Karar: PASS' "$T/out.md"; check "$?" 0 "out.md holds this run's report"
review 0 "Karar: **PASS** -> 0" '# X review
Karar: **PASS**'
review 0 "**Karar:** PASS -> 0" '**Karar:** PASS'
review 0 "VERDICT: PASS -> 0" 'VERDICT: PASS'
review 1 "Karar: **REVISE** -> 1" 'Karar: **REVISE**'
review 1 "verdict: REVISE (lower-case label) -> 1" 'verdict: REVISE'
review 3 "VERDICT: NOT PASS -> 3 (never PASS)" 'VERDICT: NOT PASS'
review 3 "VERDICT: PASSED -> 3" 'VERDICT: PASSED'
review 3 "VERDICT: ACCEPT -> 3" 'VERDICT: ACCEPT'
review 3 "template placeholder Karar: **PASS | REVISE** -> 3" 'Karar: **PASS | REVISE**'
review 3 "first verdict line decides: NOT PASS then PASS -> 3" 'Verdict: NOT PASS
Verdict: PASS'
review 3 "no verdict line -> 3" 'looks fine to me'
FAKE_RC=1 review 3 "codex exit 1 with a PASS report -> 3" 'Karar: PASS'
# ---- R1 (PR #3 review): examples in fenced code are not the verdict; verdict lines must agree; bold is paired ----
review 1 "reviewer's example: fenced Verdict: PASS, then the real Verdict: REVISE -> 1" 'Format example:
```
Verdict: PASS
```
Verdict: REVISE
| 1 | HIGH | finding |'
review 1 "~~~ fenced example PASS, real Karar: **REVISE** -> 1" '~~~text
Karar: **PASS**
~~~
Karar: **REVISE**'
review 0 "fenced REVISE example, real PASS -> 0" '```
Verdict: REVISE
```
Verdict: PASS'
review 3 "unfenced REVISE then unfenced PASS (disagree) -> 3" 'Verdict: REVISE
later text
Verdict: PASS'
review 3 "only verdict line is inside a fence -> 3" '```
Verdict: PASS
```'
review 3 "unpaired bold Verdict: **PASS -> 3" 'Verdict: **PASS'
review 3 "unpaired bold Verdict: PASS** -> 3" 'Verdict: PASS**'
review 3 "unpaired bold **Verdict: PASS -> 3" '**Verdict: PASS'
review 1 "markdown heading ## Verdict: REVISE -> 1" '## Verdict: REVISE'
review 0 "same verdict twice (header + summary) -> 0" 'Karar: **PASS**
...
Verdict: PASS'
echo "test-codex-review: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
