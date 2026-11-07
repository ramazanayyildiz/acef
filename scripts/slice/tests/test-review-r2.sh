#!/bin/bash
# Self-test for review-r2.py (owner decision 2026-11-03: the round-2 brief is generated and narrow by default).
#   B1 narrow brief: scope/session lines, every finding with its fix hunk, unclaimed hunks, "where these fixes meet",
#      affected tests from routing.test_map (an unmapped file adds the fallback set), mutations on the fixed lines,
#      the slice's race tests, the contract set only when its areas are touched
#   B2 full scope only with a listed reason; a fresh session only with --session-gone; usage errors exit 2
#   B3 SCOPE_UP (exit 1, nothing written): a fix touching a risk path rule, or a fix large relative to the slice;
#      a tests-only fix in a risk area stays narrow
#   C1 check: FAIL without the scope line, on full without a listed reason, without the session line, on a fresh
#      session without "session gone"; round 1 needs neither; WARN (exit 0) on a gate summary line or the profile's
#      bare test command
#   M1 metrics.py prints the r2 scope per slice
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # scripts/slice
S="$HERE/review-r2.py"
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-r2.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
has() { printf '%s\n' "$1" | grep -qF -- "$2" && check 1 1 "$3" || check 0 1 "$3"; }
hasnt() { printf '%s\n' "$1" | grep -qF -- "$2" && check 1 0 "$3" || check 0 0 "$3"; }
r2() { python3 -I "$S" "$@"; }

R="$T/repo"; mkdir -p "$R" && cd "$R" && git init -q -b main && git config user.email t@t && git config user.name t
cat > slice-method.json <<'J'
{ "method_version": "3.0.0-beta", "project": "demo", "slices_dir": "docs/slices",
  "gate": { "commands": [ { "name": "tests", "run": "true" } ] },
  "contract_tests": ["tests/contract/authz_matrix.sh"],
  "contract_paths": ["^src/auth/"],
  "routing": {
    "risk_paths": { "money": ["(^|/)billing/"] },
    "test_map": [ { "paths": "^src/(\\w+)/", "tests": ["tests/\\1"] } ],
    "test_map_fallback": ["tests/"] } }
J
mkdir -p src/core src/billing lib tests/core docs/slices
seq 1 40 | sed 's/^/core line /' > src/core/calc.py
seq 1 30 | sed 's/^/other line /' > src/core/other.py
seq 1 10 | sed 's/^/util /' > lib/util.sh
seq 1 10 | sed 's/^/bill /' > src/billing/charge.py
git add slice-method.json src lib && git commit -qm base
BASE=$(git rev-parse HEAD)
# slice: 40 code lines
seq 41 80 | sed 's/^/core line /' >> src/core/calc.py
git commit -qam slice
REVIEWED=$(git rev-parse HEAD)
cat > docs/slices/DEMO-02.md <<EOF
# DEMO-02 — fixture

Durum: REVISE
İnceleme sınıfı: HAFİF (gerekçe: hiçbiri)
- Giriş kartı: card.md · **Yol: HAFİF — no risk fact, 3 file(s)**
Dal / taban: \`slice/demo-02\` · \`$BASE\`

## Komutlar

- Yarış testleri (kilit/yarış yolu varsa): \`tests/race/lock_race.sh\`
EOF
cat > docs/slices/DEMO-02-review.md <<'EOF'
# DEMO-02 bağımsız inceleme
Karar: **REVISE**

| # | Önem | Blok | Dosya:satır | Yeniden üretim ve kanıt | Öneri |
|---|---|---|---|---|---|
| R1 | high | evet | `src/core/calc.py:50` | off by one at line 50 | fix |
| R2 | medium | evet | `src/core/calc.py:52` | same block, second defect | fix |
| R3 | low | hayır | `lib/util.sh:5` | util drift | fix |
| R4 | medium | evet | — | K3 has no test | add a test |

- [P2] stray note without a location
EOF
git add docs && git commit -qm docs
cp docs/slices/DEMO-02.md docs/slices/DEMO-02-review.md "$T/"   # for branches cut before the docs commit
# fix: R1+R2 in one hunk of calc.py, R3 in lib/util.sh, an unclaimed change in other.py, a new test
sed -i.bak -e 's/^core line 50$/core line 50 fixed/' -e 's/^core line 52$/core line 52 fixed/' src/core/calc.py
sed -i.bak 's/^util 5$/util 5 fixed/' lib/util.sh
sed -i.bak 's/^other line 20$/other line 20 changed/' src/core/other.py
rm -f src/core/*.bak lib/*.bak
printf 'test calc\n' > tests/core/calc_test.sh
git add src lib tests && git commit -qm fix
HEAD1=$(git rev-parse HEAD)

# ---- B1 narrow brief ----
out=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session codex-r1-thread); rc=$?
check "$rc" 0 "narrow brief exit 0"
has "$out" "# DEMO-02 — hedefli yeniden inceleme (r2)" "title filled with the slice id and round"
has "$out" "Review scope: narrow — default: the fix's code files hit no" "scope line: narrow with its reason"
has "$out" "Reviewer session: same — codex-r1-thread" "session line names the r1 reviewer session"
has "$out" "Yol: HAFİF — no risk fact, 3 file(s)" "R-5: the slice's route line is copied into the brief"
printf '%s\n' "$out" | grep -c '^Yol:' | grep -qx 1 && check 1 1 "R-5: exactly one route line" || check 0 1 "R-5: exactly one route line"
grep -v '^- Giriş kartı' docs/slices/DEMO-02.md > "$T/noroute.md"
r2 brief --slice "$T/noroute.md" --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s >/dev/null 2>&1
check "$?" 2 "R-5: a slice without a filled Yol line gets no brief"
has "$out" "#### R1 · high · blok: evet" "finding R1 listed"
has "$out" "+core line 50 fixed" "R1 shows its fix hunk"
has "$out" "(atıf satırında)" "finding matched at the cited line"
has "$out" "#### R4" "finding without a location listed"
has "$out" "dosya:satır atfı yok: bu bulgu için bütün düzeltme diff'i kapsamda" "finding without a location widens to the whole fix diff"
has "$out" "#### P2" "bullet finding listed"
hasnt "$out" "#### P2 · P2" "a bullet id is not repeated as its severity"
has "$out" "H4: yukarıda, R1 altında." "a hunk shared by two findings is printed once"
has "$out" "| R4 | KAPANDI / AÇIK / KABUL | <…> |" "the per-finding table lists every finding"
hasnt "$out" "((" "no doubled parentheses"
has "$out" "### Hiçbir bulgunun adlandırmadığı düzeltme parçaları" "unclaimed hunks section"
has "$out" "+other line 20 changed" "the unclaimed hunk is shown"
has "$out" "- R1 × R2 — same hunk" "intersection: two findings fixed in one hunk"
has "$out" "- H5 \`src/core/other.py\`" "a hunk no finding takes stays in scope (unclaimed)"
has "$out" "kesişim testi:" "a test is asked at each intersection"
has "$out" '- `tests/core` ← `src/core/calc.py`' "affected tests from routing.test_map"
has "$out" '- `tests/core/calc_test.sh` ← `tests/core/calc_test.sh`' "a changed test file is its own test"
has "$out" '- Eşlenmeyen: `lib/util.sh` → geniş set yukarıda' "unmapped code file reported"
has "$out" '- `tests/` ← `lib/util.sh`' "an unmapped code file adds the fallback set"
has "$out" 'src/core/calc.py` satır 50,52 (R1, R2)' "mutations on the fixed lines"
hasnt "$out" 'tests/core/calc_test.sh` satır' "no mutation asked on a test file"
has "$out" '- `tests/race/lock_race.sh`' "the slice's race tests"
has "$out" "Koşmaz: düzeltme sözleşme alanlarına dokunmuyor" "contract set skipped when its areas are untouched"
has "$out" "## Kontroller" "template body kept"
has "$out" "git diff ${REVIEWED:0:12} ${HEAD1:0:12} --stat" "diff command filled"
hasnt "$out" "<SLICE-ID>" "no slice-id placeholder left"
printf '%s\n' "$out" | grep -c '^Review scope:' | grep -qx 1 && check 1 1 "exactly one scope line" || check 0 1 "exactly one scope line"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s1 --out "$T/brief.md" >/dev/null
check "$?" 0 "--out writes the brief"
[ -s "$T/brief.md" ] && check 1 1 "brief file is not empty" || check 0 1 "brief file is not empty"

# ---- B2 flags ----
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" >/dev/null 2>&1
check "$?" 2 "no --session and no --session-gone refused"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session a --session-gone b >/dev/null 2>&1
check "$?" 2 "--session and --session-gone together refused"
out=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session-gone "context limit")
has "$out" "Reviewer session: fresh — session gone: context limit" "fresh session says why the r1 session is gone"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --scope full >/dev/null 2>&1
check "$?" 2 "full without a reason refused"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --scope full --reason "looks risky" >/dev/null 2>&1
check "$?" 2 "full with a reason outside the list refused"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --reason money >/dev/null 2>&1
check "$?" 2 "--reason without --scope full refused"
out=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --scope full --reason redesign); rc=$?
check "$rc" 0 "full with a listed reason"
has "$out" "Review scope: full — redesign" "full reason printed in the scope line"
has "$out" "**Tam kapsam (redesign).** Bütün dilim yeniden incelenir: \`git diff ${BASE:0:7} ${HEAD1:0:7}\`" "full scope reviews the whole slice diff"
has "$out" "Tam takım yine koşmaz" "full scope still runs no full suite"
printf '# empty\n' > "$T/none.md"
r2 brief --slice docs/slices/DEMO-02.md --review "$T/none.md" --reviewed "$REVIEWED" --session s >/dev/null 2>&1
check "$?" 2 "a review report without findings refused"
grep -v '^Review scope:' "$HERE/../../templates/slice/review-r2.md" > "$T/old-template.md"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --template "$T/old-template.md" >/dev/null 2>&1
check "$?" 2 "a template without the scope line refused"
sed '/^Dal \/ taban/d' docs/slices/DEMO-02.md > "$T/no-base.md"
r2 brief --slice "$T/no-base.md" --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s >/dev/null 2>&1
check "$?" 2 "slice base unknown refused"
r2 brief --slice "$T/no-base.md" --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --slice-base "$BASE" >/dev/null 2>&1
check "$?" 0 "--slice-base fills a missing slice base"

# ---- B3 SCOPE_UP ----
git checkout -q -b money "$HEAD1"
sed -i.bak 's/^bill 3$/bill 3 fixed/' src/billing/charge.py && rm -f src/billing/*.bak && git commit -qam "money fix"
err=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --out "$T/money.md" 2>&1 >/dev/null); rc=$?
check "$rc" 1 "a fix in a money path cannot be narrow (SCOPE_UP)"
has "$err" "SCOPE_UP: money path rule: src/billing/charge.py; this fix needs full scope: --scope full --reason money" "SCOPE_UP names the rule and the flag"
[ -e "$T/money.md" ] && check 1 0 "SCOPE_UP writes nothing" || check 0 0 "SCOPE_UP writes nothing"
out=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s --scope full --reason money); rc=$?
check "$rc" 0 "the money fix with --scope full --reason money"
has "$out" 'Düzeltmenin değdiği yol kuralları: money: `src/billing/charge.py`' "full brief names the path rule it hit"
git checkout -q -b big "$HEAD1"
seq 1 30 | sed 's/^/added /' >> src/core/other.py && git commit -qam "big fix"
err=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s 2>&1 >/dev/null); rc=$?
check "$rc" 1 "a fix large relative to the slice cannot be narrow"
has "$err" "--reason fix-larger-than-slice" "SCOPE_UP asks for fix-larger-than-slice"
python3 -c "import json;c=json.load(open('slice-method.json'));c['review']={'r2_full_ratio':2};json.dump(c,open('slice-method.json','w'))"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s >/dev/null 2>&1
check "$?" 0 "review.r2_full_ratio raises the size threshold"
git checkout -q slice-method.json
git checkout -q -b testsonly "$REVIEWED"
mkdir -p tests/billing && printf 'billing test\n' > tests/billing/charge_test.sh && git add tests && git commit -qm "tests-only fix"
out=$(r2 brief --slice "$T/DEMO-02.md" --review "$T/DEMO-02-review.md" --reviewed "$REVIEWED" --session s); rc=$?
check "$rc" 0 "a tests-only fix in a risk area stays narrow"
has "$out" "Uygulanmaz: düzeltme kod satırı değiştirmiyor" "no mutation for a tests-only fix"
git checkout -q -b auth "$HEAD1"
mkdir -p src/auth && printf 'gate\n' > src/auth/gate.py && git add src && git commit -qm "auth area"
out=$(r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s)
has "$out" '- `tests/contract/authz_matrix.sh`' "contract set listed when contract_paths are touched"
python3 -c "import json;c=json.load(open('slice-method.json'));c['routing']['test_map']=[{'paths':'(','tests':['x']}];json.dump(c,open('slice-method.json','w'))"
r2 brief --slice docs/slices/DEMO-02.md --review docs/slices/DEMO-02-review.md --reviewed "$REVIEWED" --session s >/dev/null 2>&1
check "$?" 2 "an invalid routing.test_map pattern is a config error"
git checkout -q slice-method.json

# ---- R4 (Codex r1): a rename from code into docs keeps its code review and mutation ----
git checkout -q -b rename "$REVIEWED"
mkdir -p docs && git mv src/core/other.py docs/other.md && sed -i.bak 's/^other line 5$/other line 5 moved/' docs/other.md && rm -f docs/*.bak
git add docs/other.md && git commit -qm "move code into docs"
out=$(r2 brief --slice "$T/DEMO-02.md" --review "$T/DEMO-02-review.md" --reviewed "$REVIEWED" --session s); rc=$?
check "$rc" 0 "a code-to-docs rename brief"
has "$out" '`src/core/other.py` → `docs/other.md` satır 5' "a code-to-docs rename keeps its mutation (both paths named)"
hasnt "$out" "Uygulanmaz: düzeltme kod satırı değiştirmiyor" "a code-to-docs rename is not 'no code changed'"
has "$out" "- H1 \`docs/other.md\`" "a code-to-docs rename stays in scope as a fix hunk"
git checkout -q -b r4done "$HEAD1"

# ---- a cited line takes only the hunks near it; a far hunk in the same file stays in scope as unclaimed ----
git checkout -q -b precision "$REVIEWED"
sed -i.bak -e 's/^core line 5$/core line 5 far/' -e 's/^core line 50$/core line 50 near/' src/core/calc.py && rm -f src/core/*.bak
git commit -qam precision
out=$(r2 brief --slice "$T/DEMO-02.md" --review "$T/DEMO-02-review.md" --reviewed "$REVIEWED" --session s)
has "$out" 'Atıf: `src/core/calc.py:50` · Düzeltme: H2 (atıf satırında)' "a finding cited at a line takes only the hunk near it"
has "$out" '- H1 `src/core/calc.py`' "the far hunk of the same file stays in scope as unclaimed"
git checkout -q r4done

# ---- C1 check ----
cd "$T" || exit 2
printf '%s\n' "$(cat "$T/brief.md")" > "$T/DEMO-02-review-r2.md"
out=$(r2 check "$T/DEMO-02-review-r2.md"); rc=$?
check "$rc" 0 "a generated brief passes check"
has "$out" "R2-CHECK PASS round=2 scope=narrow session=same warn=0" "check summary line"
w() { printf '# DEMO-02 — hedefli yeniden inceleme (r2)\n\n%s\n\nKarar: **PASS**\n' "$1" > "$T/DEMO-02-review-r2.md"; r2 check "$T/DEMO-02-review-r2.md"; }
out=$(w "Reviewer session: same — s1"); check "$?" 1 "check: no scope line FAILs"
has "$out" "R2_SCOPE_MISSING" "check names the missing scope line"
out=$(w "$(printf 'Review scope: full\nReviewer session: same — s1')"); check "$?" 1 "check: full without a reason FAILs"
has "$out" "R2_FULL_NO_REASON" "check names full without a reason"
out=$(w "$(printf 'Review scope: full — because it felt right\nReviewer session: same — s1')"); check "$?" 1 "check: full with an unlisted reason FAILs"
out=$(w "$(printf 'Review scope: full — tenant: shared list query\nReviewer session: same — s1')"); check "$?" 0 "check: full with a listed reason passes"
out=$(w "$(printf 'Review scope: narrow\nReviewer session: same — s1')"); check "$?" 1 "check: narrow without its reason FAILs"
out=$(w "$(printf 'Review scope: <narrow | full> — <gerekçe>\nReviewer session: same — s1')"); check "$?" 1 "check: the unfilled template line FAILs"
out=$(w "Review scope: narrow — default"); check "$?" 1 "check: no session line FAILs"
has "$out" "R2_SESSION_MISSING" "check names the missing session line"
out=$(w "$(printf 'Review scope: narrow — default\nReviewer session: fresh')"); check "$?" 1 "check: fresh session without the note FAILs"
has "$out" "R2_FRESH_NO_NOTE" "check names the missing session-gone note"
out=$(w "$(printf 'Review scope: narrow — default\nReviewer session: fresh — session gone: crash at 14:02')"); check "$?" 0 "check: fresh session with the note passes"
out=$(w "$(printf 'Review scope: narrow — default\nReviewer session: same — s1\n\n```\nGATE PASS 1a2b3c4 full pass=5 fail=0 skip=0 900s\n```')"); rc=$?
check "$rc" 0 "check: a full-suite signal only warns"
has "$out" "WARN R2_FULL_SUITE line 7: gate summary line (full)" "check warns on a gate summary line inside a review round"
# dogfood: the brief quotes fix hunks as ```diff blocks; a gate summary string inside a quoted hunk is code, not a run
out=$(w "$(printf 'Review scope: narrow — default\nReviewer session: same — s1\n\n`````diff\n+ printf %%s \x27GATE PASS 1a2b3c4 full pass=5 fail=0 skip=0 900s\x27\n`````')"); rc=$?
check "$rc" 0 "check: a quoted diff hunk passes"
has "$out" "warn=0" "check: a gate summary string inside a \`\`\`diff hunk does not warn"
# R1/R2 (Codex r1): full reason as a whole token, written reasons, fences by marker and length, conflicts
out=$(w "$(printf 'Review scope: full — money2\nReviewer session: same — s1')"); check "$?" 1 "check: 'money2' is not the reason 'money'"
out=$(w "$(printf 'Review scope: full — money: refund rounding\nReviewer session: same — s1')"); check "$?" 0 "check: 'money:' with an explanation passes"
out=$(w "$(printf 'Review scope: full — money (money path rule: src/billing/x.py)\nReviewer session: same — s1')"); check "$?" 0 "check: the generated full line passes"
out=$(w "$(printf 'Review scope: narrow — —\nReviewer session: same — s1')"); check "$?" 1 "check: a dash is not a narrow reason"
out=$(w "$(printf 'Review scope: narrow — default\nReviewer session: fresh — session gone: —')"); check "$?" 1 "check: a dash is not a session-gone note"
out=$(w "$(printf '~~~markdown\n```\nReview scope: narrow — default\nReviewer session: same — s1\n```\n~~~')"); check "$?" 1 "check: fields only inside a tilde fence with inner backtick fences FAIL"
has "$out" "R2_SCOPE_MISSING" "check: a field inside a fence does not count"
out=$(w "$(printf 'Review scope: narrow — default\nReviewer session: same — s1\n\n````\n```\nReview scope: full — redesign\n```\n````')"); check "$?" 0 "check: a fenced example with another scope line is ignored"
out=$(w "$(printf 'Review scope: narrow — default\nReview scope: full — money\nReviewer session: same — s1')"); check "$?" 1 "check: two different scope lines conflict"
has "$out" "R2_SCOPE_CONFLICT" "check names the conflict"
printf '{ "stack": "t", "placeholders": { "test_command": "run-all-tests" } }\n' > "$T/profile.json"
w "$(printf 'Review scope: narrow — default\nReviewer session: same — s1\nRan `run-all-tests --only calc` and then `run-all-tests`')" >/dev/null
out=$(r2 check --profile "$T/profile.json" "$T/DEMO-02-review-r2.md")
has "$out" "bare test_command" "check warns on the profile's bare test command"
has "$out" "warn=1" "a filtered test command does not warn"
printf '# DEMO-02 bağımsız inceleme\nKarar: **PASS**\n' > "$T/DEMO-02-review.md"
out=$(r2 check "$T/DEMO-02-review.md"); check "$?" 0 "check: round 1 needs no scope or session line"
has "$out" "round=1 scope=- session=-" "round 1 summary"
r2 check "$T/missing.md" >/dev/null 2>&1; check "$?" 2 "check: unreadable report is exit 2"

# ---- R1/R2 parity (metrics.py counts what review-r2.py check accepts) and R3 (empty selector) ----
python3 -I - "$HERE" <<'PY2'
import importlib.util, os, sys
here = sys.argv[1]; sys.path.insert(0, here)
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(here, file))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod
r2, metrics = load("r2", "review-r2.py"), load("metrics", "metrics.py")
S = "Reviewer session: same — s\n"
cases = ["Review scope: narrow — default\n", "Review scope: narrow — —\n", "Review scope: narrow\n",
         "Review scope: full — money2\n", "Review scope: full — money: x\n", "Review scope: full — tenant (list)\n",
         "Review scope: full\n", "Review scope: wide — x\n", "", "~~~\nReview scope: narrow — x\n~~~\n",
         "~~~\n```\n```\nReview scope: narrow — x\n~~~\n", "```\nReview scope: narrow — x\n````\n",
         "~~~\n```\nReview scope: narrow — x\n```\n~~~\n",
         "Review scope: narrow — a\nReview scope: narrow — b\n", "Review scope: <narrow | full> — <gerekçe>\n"]
bad = [c for c in cases if r2.scope_fields(c + S)[0] != metrics.r2_scope("X-review-r2.md", c + S)]
for c in bad: print("parity", repr(c), r2.scope_fields(c + S)[0], metrics.r2_scope("X-review-r2.md", c + S))
sys.exit(1 if bad else 0)
PY2
check "$?" 0 "metrics.py and review-r2.py classify the same scope lines"
python3 -I - "$HERE" <<'PY3'
import sys; sys.path.insert(0, sys.argv[1])
import route
cfg = route.routing_config(None, None)
cfg["test_map"] = [{"paths": r"^src/(?:([^/]+)/)?[^/]+\.py$", "tests": ["\\1"]}]
cfg["test_map_fallback"] = ["tests/"]
tests, mapping, unmapped = route.affected_tests(cfg, ["src/core.py", "src/core/a.py"])
ok3 = unmapped == ["src/core.py"] and tests == ["core", "tests/"] and "" not in tests
if not ok3: print("R3", tests, mapping, unmapped)
sys.exit(0 if ok3 else 1)
PY3
check "$?" 0 "an empty expanded test selector is no mapping: the file is unmapped and adds the fallback"

# ---- Codex r2: four mutations only the reviewer's own probes caught (session conflict, a shorter closing fence in
#      metrics.py, a backtick in a backtick fence's info string, whole-file attachment) — explicit expected values ----
py4=$(python3 -I - "$HERE" <<'PY4'
import importlib.util, os, sys
here = sys.argv[1]; sys.path.insert(0, here)
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(here, file))
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod
r2, metrics = load("r2", "review-r2.py"), load("metrics", "metrics.py")
OK = "Review scope: narrow — a\nReviewer session: same — s\n"
cases = [  # name, report text, failure code check must print (or None), scope both parsers must return
    ("two different session lines conflict", OK + "Reviewer session: fresh — session gone: crashed\n",
     "R2_SESSION_CONFLICT", "narrow"),
    ("a shorter inner fence does not close a longer one (scope line inside stays fenced)",
     OK + "````text\n```\nReview scope: full — money2\n```\n````\n", None, "narrow"),
    ("a longer closing fence of the same character closes it", "```text\nReview scope: full — money2\n`````\n" + OK,
     None, "narrow"),
    ("a backtick in a backtick fence's info string opens no fence", "```bad`info\n" + OK, None, "narrow"),
]
for name, text, code, scope in cases:
    got_scope, _session, fails = r2.scope_fields(text)
    got_code = next((f.split()[0] for f in fails), None)
    good = got_scope == scope and metrics.r2_scope("X-review-r2.md", text) == scope and got_code == code
    print(f"{int(good)}\tscope parsers: {name}")
H = [{"id": "H1", "a": "src/a.py", "b": "src/a.py", "old": (1, 1)},
     {"id": "H2", "a": "src/a.py", "b": "src/a.py", "old": (50, 1)}]
for name, loc, want, note in [
        ("a cited line with no hunk near it takes the whole file", ("src/a.py", 100, 100), ["H1", "H2"],
         "atıf satırında parça yok"),
        ("a file-only citation takes the whole file", ("src/a.py", None, None), ["H1", "H2"], "atıf dosyasında"),
        ("a cited line with a hunk near it takes only that hunk", ("src/a.py", 52, 52), ["H2"], "atıf satırında")]:
    f = [{"locs": [loc]}]
    r2.attach(f, H)
    print(f"{int(f[0]['hunks'] == want and f[0]['match'].startswith(note))}\tattach: {name}")
PY4
); check "$?" 0 "reviewer-probe cases ran"
check "$(printf '%s\n' "$py4" | grep -c .)" 7 "reviewer-probe cases: all seven reported"
while IFS="$(printf '\t')" read -r res name; do check "$res" 1 "$name"; done <<EOF
$py4
EOF

# ---- M1 metrics ----
mkdir -p "$T/m" && cd "$T/m" || exit 2
printf '# M-01 — x\n\nDurum: KAPANDI\nİnceleme sınıfı: TAM (gerekçe: para)\n' > M-01.md
printf '# M-01 r1\nKarar: **REVISE**\n' > M-01-review.md
printf '# M-01 — hedefli yeniden inceleme (r2)\n\nReview scope: full — money\nReviewer session: same — s\n\nKarar: **PASS**\n' > M-01-review-r2.md
printf '# M-02 — x\n\nDurum: KAPANDI\n' > M-02.md
printf '# M-02 r1\nKarar: **REVISE**\n' > M-02-review.md
printf '# M-02 r2\n\nKarar: **PASS**\n' > M-02-review-r2.md
out=$(python3 -I "$HERE/metrics.py" --no-git "$T/m")
printf '%s\n' "$out" | grep -q '^| M-01 | .* | full:money |$' && check 1 1 "metrics: r2 scope column full:money" || check 0 1 "metrics: r2 scope column full:money"
printf '%s\n' "$out" | grep -q '^| M-02 | .* | eksik |$' && check 1 1 "metrics: r2 without the scope line is 'eksik'" || check 0 1 "metrics: r2 without the scope line is 'eksik'"
has "$out" "narrow 0 · full 1 (money 1) · satırı eksik/geçersiz 1" "metrics: r2 scope summary line"

# ---- one reason list: review-r2.py, metrics.py and the template agree ----
python3 -I - "$HERE" <<'PY'
import importlib.util, os, re, sys
here = sys.argv[1]
def load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(here, file))
    mod = importlib.util.module_from_spec(spec); sys.path.insert(0, here); spec.loader.exec_module(mod); return mod
r2, metrics = load("r2", "review-r2.py"), load("metrics", "metrics.py")
tpl = open(os.path.join(here, "..", "..", "templates", "slice", "review-r2.md"), encoding="utf-8").read()
listed = re.findall(r"`([a-z-]+)`", tpl.split("yalnız şu gerekçelerden biriyle:", 1)[1].split(";", 1)[0])
sys.exit(0 if list(r2.REASONS) == list(metrics.R2_REASONS) == listed else 1)
PY
check "$?" 0 "the reason list is the same in review-r2.py, metrics.py and the template"

echo "review-r2: ok=$ok fail=$bad"
[ "$bad" -eq 0 ]
