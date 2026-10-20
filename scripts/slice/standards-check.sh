#!/bin/bash
# standards-check.sh [--print-baseline] [--rules <rules.json>] [--profile <stack profile.json>] <tree>
#
# Stack-neutral standards ratchet (core). Engine ported from the source projects' ratchets (CRM#44 and REB TOOL-04 in
# docs/slice-lane/SOURCES.md); the rules live in a JSON file so any app can adopt the engine unchanged. Stack rules come
# from the adapter (stacks/<stack>/standards/rules.example.json).
# Read-only: writes nothing in <tree>.
#
# Rules file (default <tree>/scripts/standards/rules.json; example: stacks/<stack>/standards/rules.example.json):
#   scope         pathspecs for the added-line diff
#   line_checks   [{id, mode: added|any|warn, pattern (ERE), paths[], label}]
#       added  FAIL only when the match is on a line added/changed since the merge base; WARN on untouched lines.
#       any    FAIL wherever it is (rules already at zero).   warn  always WARN.
#   counters      [{id, pattern (ERE), paths[], label}]        repo-wide count of matching lines (git grep -c)
#   command_counters [{id, run, count_regex, exclude_regex?, ok_exit?[], requires?[], label}]
#                 runs `sh -c run` in <tree>, counts output lines matching count_regex (minus exclude_regex).
#                 Use for linters/type checkers whose per-file pass/fail would fail every PR on legacy code.
#                 A missing tool is a FAIL, never a count of 0 (v0.1.1): ok_exit defaults to [0]; a path listed in
#                 "requires" (relative to <tree>, e.g. the tool's binary) must exist; exit 126/127 and output saying
#                 "command not found" or "No such file or directory" are tool errors, plus the stack profile's
#                 "standards": {"tool_error_patterns": [ERE, …]} (a runtime's own "file not found" wording).
#                 Tools that exit 1 when they find something (type checkers) must say so with "ok_exit": [0, 1] AND
#                 list their binary in "requires".
# Stack profile: --profile, else env SLICE_STACK_PROFILE, else "stack_profile" in <tree>/slice-method.json (optional;
#   a path that is given but is not a readable file is exit 2, never a silent run without the profile).
# Counters and command_counters are frozen in the baseline file ("ID=<n>" lines, default
# <tree>/scripts/standards/baseline.txt). Above baseline = FAIL. Counters only go down.
# Comment lines (//, *, #, /*, {{--, <!--) are skipped by line checks (not by counters).
#
# Finding lines: "FAIL|WARN <ID> <file>:<line> <text>" (counters: description instead of file:line); "NOTE …" lines.
# Last line: STANDARDS PASS|FAIL fail=<n> warn=<n>
# --print-baseline: measure counters only, print "ID=n" lines (the MERGER writes baseline.txt from this; branches
#   write the expected delta to a per-slice notes file instead — REB TOOL-06: shared lines conflicted on every merge).
# Exit: 0 PASS, 1 FAIL, 2 usage/prerequisite.
# An invalid ERE in a rule (pattern, count_regex, exclude_regex) is exit 2 naming the rule, checked before anything is
# measured (ACEF-FIX-03); a git grep error at run time still makes that rule FAIL, never a zero count.
# env: STANDARDS_BASE_REF (default origin/main, else main), STANDARDS_BASELINE, STANDARDS_RULES.
# macOS /bin/bash 3.2 compatible. git grep ERE has no \b or \s: write explicit classes.
set -u
set -f

c_err() { printf '%s\n' "$*" >&2; }
die2() { c_err "$*"; exit 2; }

PRINT=0; RULES=${STANDARDS_RULES:-}; PROFILE=${SLICE_STACK_PROFILE:-}; TREE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --print-baseline) PRINT=1; shift;;
        --rules) [ $# -ge 2 ] || die2 "--rules needs a path"; RULES=$2; shift 2;;
        --profile) [ $# -ge 2 ] || die2 "--profile needs a path"; PROFILE=$2; shift 2;;
        -*) die2 "usage: standards-check.sh [--print-baseline] [--rules <rules.json>] [--profile <profile.json>] <tree>";;
        *) [ -z "$TREE" ] || die2 "usage: standards-check.sh [--print-baseline] [--rules <rules.json>] [--profile <profile.json>] <tree>"; TREE=$1; shift;;
    esac
done
[ -n "$TREE" ] || die2 "usage: standards-check.sh [--print-baseline] [--rules <rules.json>] [--profile <profile.json>] <tree>"
[ -d "$TREE" ] || die2 "tree not found: $TREE"
TREE=$(cd "$TREE" && pwd -P)
[ "$(git -C "$TREE" rev-parse --show-toplevel </dev/null 2>/dev/null)" = "$TREE" ] || die2 "$TREE is not the root of a git working tree"
RULES=${RULES:-$TREE/scripts/standards/rules.json}
[ -f "$RULES" ] || die2 "rules file not found: $RULES"
BASELINE=${STANDARDS_BASELINE:-$TREE/scripts/standards/baseline.txt}
[ "$PRINT" = 1 ] || [ -f "$BASELINE" ] || die2 "baseline file not found: $BASELINE"
command -v python3 >/dev/null 2>&1 || die2 "python3 not found"
[ -z "$PROFILE" ] || [ -f "$PROFILE" ] || die2 "stack profile not found: $PROFILE"
# tool-error wording: generic shell messages + the stack profile's own patterns
TOOLERR=$(python3 -I - "$PROFILE" "$TREE/slice-method.json" <<'PY'
import json, os, sys
pats = ["command not found", "No such file or directory"]
prof = sys.argv[1]
if not prof and os.path.isfile(sys.argv[2]):
    try:
        cfg = json.load(open(sys.argv[2], encoding="utf-8"))
    except Exception:
        cfg = None   # slice-method.json itself is the gate's business; here it only points at the profile
    if isinstance(cfg, dict) and "stack_profile" in cfg:
        sp = cfg["stack_profile"]
        if not isinstance(sp, str) or not sp:
            print("ERR stack_profile in slice-method.json must be a non-empty path"); sys.exit(0)
        prof = os.path.join(os.path.dirname(sys.argv[2]), sp)
        if not os.path.isfile(prof):
            print(f"ERR stack profile not found: {prof} (stack_profile in slice-method.json)"); sys.exit(0)
if prof:
    try:
        extra = (json.load(open(prof, encoding="utf-8")).get("standards") or {}).get("tool_error_patterns") or []
    except Exception as e:
        print(f"ERR stack profile unreadable: {e}"); sys.exit(0)
    import subprocess
    for k, p in enumerate(extra):   # each on its own: a joined "a|b" can hide an invalid entry ("[" + "]")
        if not isinstance(p, str) or not p or "\n" in p:
            print(f"ERR stack profile standards.tool_error_patterns[{k}] must be a non-empty one-line string"); sys.exit(0)
        if subprocess.run(["grep", "-E", "-e", p], input=b"", capture_output=True).returncode > 1:
            print(f"ERR tool_error_patterns[{k}]: invalid ERE {p!r}"); sys.exit(0)
        pats.append(p)
print("|".join(pats))
PY
)
case "$TOOLERR" in ERR*) die2 "${TOOLERR#ERR }";; esac

WORK=$(mktemp -d "${TMPDIR:-/tmp}/standards-check.XXXXXX") || die2 "cannot create a temp directory"
trap 'rm -rf "$WORK"' EXIT
valid_ere() { grep -E -e "$1" /dev/null 2>"$WORK/grep-error"; [ "$?" -le 1 ]; }
grep_error() { head -n 1 "$WORK/grep-error" | tr '\t\r\n' '   '; }
valid_ere "$TOOLERR" || die2 "tool_error_patterns: invalid ERE: $(grep_error)"

# ---- rules -> TSV files (python, no third-party modules) ----
ERR=$(python3 -I - "$RULES" "$WORK" <<'PY'
import json, sys, re
rules_path, work = sys.argv[1], sys.argv[2]
try:
    r = json.load(open(rules_path, encoding="utf-8"))
except Exception as e:
    print(f"rules file is not valid JSON: {e}"); sys.exit(0)
def bad(s): return (not isinstance(s, str)) or "\t" in s or "\n" in s
idre = re.compile(r"^[A-Z0-9][A-Z0-9_-]*$")
ids = set()
def need_id(x, where):
    i = x.get("id")
    if not isinstance(i, str) or not idre.match(i) or i in ids:
        raise ValueError(f"{where}: bad or duplicate id {i!r}")
    ids.add(i); return i
try:
    scope = r.get("scope", [])
    if not isinstance(scope, list) or any(bad(p) or " " in p for p in scope): raise ValueError("scope must be a list of pathspecs without spaces")
    with open(f"{work}/scope", "w") as f: f.write(" ".join(scope))
    with open(f"{work}/lines.tsv", "w") as f:
        for k, x in enumerate(r.get("line_checks", [])):
            i = need_id(x, f"line_checks[{k}]")
            m = x.get("mode")
            if m not in ("added", "any", "warn"): raise ValueError(f"{i}: mode must be added|any|warn")
            p, paths = x.get("pattern"), x.get("paths", [])
            if bad(p) or not paths or any(bad(q) or " " in q for q in paths): raise ValueError(f"{i}: pattern/paths invalid")
            f.write("\t".join([i, m, p, " ".join(paths)]) + "\n")
    with open(f"{work}/counters.tsv", "w") as f:
        for k, x in enumerate(r.get("counters", [])):
            i = need_id(x, f"counters[{k}]")
            p, paths, lab = x.get("pattern"), x.get("paths", []), x.get("label", "")
            if bad(p) or bad(lab) or not paths or any(bad(q) or " " in q for q in paths): raise ValueError(f"{i}: pattern/paths/label invalid")
            f.write("\t".join([i, p, " ".join(paths), lab]) + "\n")
    with open(f"{work}/cmds.tsv", "w") as f:
        for k, x in enumerate(r.get("command_counters", [])):
            i = need_id(x, f"command_counters[{k}]")
            run, cre, xre, lab = x.get("run"), x.get("count_regex"), x.get("exclude_regex", ""), x.get("label", "")
            ok = x.get("ok_exit", [0])
            req = x.get("requires", [])
            if not isinstance(req, list) or any(bad(q) or " " in q or q.startswith("/") or ".." in q for q in req):
                raise ValueError(f"{i}: requires must be a list of tree-relative paths without spaces")
            if bad(run) or bad(cre) or bad(xre) or bad(lab) or not isinstance(ok, list) or not all(isinstance(v, int) for v in ok):
                raise ValueError(f"{i}: run/count_regex/exclude_regex/ok_exit invalid")
            f.write("\t".join([i, run, cre, xre or "^$NEVER^", " ".join(str(v) for v in ok), lab, " ".join(req)]) + "\n")
except ValueError as e:
    print(str(e))
PY
)
[ -z "$ERR" ] || die2 "rules: $ERR"
TAB=$(printf '\t')
# every rule pattern must compile before anything is measured (exit 2 names the rule)
re_ok() { valid_ere "$3" || die2 "rules: $1: invalid $2 (ERE) '$3': $(grep_error)"; }
while IFS="$TAB" read -r ID _M PAT _P; do [ -z "$ID" ] || re_ok "$ID" pattern "$PAT"; done <"$WORK/lines.tsv"
while IFS="$TAB" read -r ID PAT _P _L; do [ -z "$ID" ] || re_ok "$ID" pattern "$PAT"; done <"$WORK/counters.tsv"
while IFS="$TAB" read -r ID _R CRE XRE _O _L _Q; do
    [ -n "$ID" ] || continue; re_ok "$ID" count_regex "$CRE"; re_ok "$ID" exclude_regex "$XRE"
done <"$WORK/cmds.tsv"

BASE_REF=${STANDARDS_BASE_REF:-}
if [ -n "$BASE_REF" ]; then
    git -C "$TREE" rev-parse --verify --quiet "$BASE_REF^{commit}" </dev/null >/dev/null 2>&1 || die2 "STANDARDS_BASE_REF does not resolve: $BASE_REF"
elif git -C "$TREE" rev-parse --verify --quiet "refs/remotes/origin/main^{commit}" </dev/null >/dev/null 2>&1; then BASE_REF=origin/main
else BASE_REF=main; fi
MB=$(git -C "$TREE" merge-base "$BASE_REF" HEAD </dev/null 2>/dev/null) || MB=""
[ "$PRINT" = 1 ] || [ -n "$MB" ] || die2 "no merge base between $BASE_REF and HEAD (set STANDARDS_BASE_REF)"

FAILN=0; WARNN=0
emit() { printf '%s %s %s\n' "$1" "$2" "$3"; if [ "$1" = FAIL ]; then FAILN=$((FAILN + 1)); else WARNN=$((WARNN + 1)); fi; }
note() { printf 'NOTE %s\n' "$*"; }
G() { git -C "$TREE" grep --untracked "$@" </dev/null 2>"$WORK/grep-error"; }
base_of() { grep -E "^$1=[0-9]+([[:space:]]+#.*)?$" "$BASELINE" | tail -n 1 | sed 's/^[^=]*=//; s/[^0-9].*//'; }

# ---- counters ----
: >"$WORK/measured"
while IFS="$TAB" read -r ID PAT PATHS LABEL; do
    [ -n "$ID" ] || continue
    # shellcheck disable=SC2086
    HITS=$(G -cE -e "$PAT" -- $PATHS); RC=$?
    if [ "$RC" -gt 1 ]; then
        printf '%s\tERR\tgit grep error (exit %s): %s\n' "$ID" "$RC" "$(grep_error)" >>"$WORK/measured"
    else
        N=$(printf '%s\n' "$HITS" | awk -F: '{ s += $NF } END { print s + 0 }')
        printf '%s\t%s\t%s\n' "$ID" "$N" "$LABEL" >>"$WORK/measured"
    fi
done <"$WORK/counters.tsv"
while IFS="$TAB" read -r ID RUN CRE XRE OKS LABEL REQS; do
    [ -n "$ID" ] || continue
    if ! valid_ere "$CRE"; then
        printf '%s\tERR\tinvalid count_regex: %s\n' "$ID" "$(grep_error)" >>"$WORK/measured"; continue
    fi
    if ! valid_ere "$XRE"; then
        printf '%s\tERR\tinvalid exclude_regex: %s\n' "$ID" "$(grep_error)" >>"$WORK/measured"; continue
    fi
    MISSING=""
    for r in $REQS; do [ -e "$TREE/$r" ] || MISSING="$MISSING $r"; done
    if [ -n "$MISSING" ]; then
        printf '%s\t%s\t%s\n' "$ID" "ERR" "required tool missing:$MISSING" >>"$WORK/measured"; continue
    fi
    OUT=$(cd "$TREE" && sh -c "$RUN" </dev/null 2>&1); RC=$?
    OKRC=0; for v in $OKS; do [ "$RC" = "$v" ] && OKRC=1; done
    printf '%s\n' "$OUT" | grep -Eq -- "$TOOLERR" 2>"$WORK/grep-error"; TOOLRC=$?
    if [ "$TOOLRC" -gt 1 ]; then
        printf '%s\tERR\ttool-error grep failed: %s\n' "$ID" "$(grep_error)" >>"$WORK/measured"
    elif [ "$RC" = 126 ] || [ "$RC" = 127 ] || [ "$TOOLRC" = 0 ]; then
        printf '%s\t%s\t%s\n' "$ID" "ERR" "tool error (exit $RC): $(printf '%s' "$OUT" | grep -v '^[[:space:]]*$' | head -n 1 | cut -c1-120)" >>"$WORK/measured"
    elif [ "$OKRC" = 1 ]; then
        printf '%s\n' "$OUT" | grep -E -- "$CRE" >"$WORK/matches" 2>"$WORK/grep-error"; GREPRC=$?
        if [ "$GREPRC" -gt 1 ]; then
            printf '%s\tERR\tcount_regex grep failed: %s\n' "$ID" "$(grep_error)" >>"$WORK/measured"; continue
        fi
        N=$(grep -Evc -- "$XRE" "$WORK/matches" 2>"$WORK/grep-error"); GREPRC=$?
        if [ "$GREPRC" -gt 1 ]; then
            printf '%s\tERR\texclude_regex grep failed: %s\n' "$ID" "$(grep_error)" >>"$WORK/measured"; continue
        fi
        printf '%s\t%s\t%s\n' "$ID" "$N" "$LABEL" >>"$WORK/measured"
    else
        printf '%s\t%s\t%s\n' "$ID" "ERR" "command exited $RC: $(printf '%s' "$OUT" | grep -v '^[[:space:]]*$' | tail -n 1 | cut -c1-120)" >>"$WORK/measured"
    fi
done <"$WORK/cmds.tsv"

if [ "$PRINT" = 1 ]; then
    while IFS="$TAB" read -r ID N LABEL; do
        [ "$N" != ERR ] || die2 "$ID could not be measured: $LABEL"
        printf '%s=%s\n' "$ID" "$N"
    done <"$WORK/measured"
    exit 0
fi

# ---- added lines since the merge base (PR #44 parser: explicit prefixes, hunk count guards parse failures) ----
SCOPE=$(cat "$WORK/scope")
ADDED=$WORK/added; UNTRACKED=$WORK/untracked
: >"$ADDED"; : >"$UNTRACKED"
# shellcheck disable=SC2086
git -C "$TREE" diff -U0 -M --no-color --no-ext-diff --src-prefix=a/ --dst-prefix=b/ --diff-filter=AMR "$MB" -- $SCOPE </dev/null 2>/dev/null | awk -v out="$ADDED" -v hunks="$WORK/hunks" '
    BEGIN { h = 0 }
    END { print h > hunks }
    /^\+\+\+ b\// { f = substr($0, 7); next }
    /^@@ / { h++; if (match($0, /\+[0-9]+(,[0-9]+)?/)) { s = substr($0, RSTART + 1, RLENGTH - 1); n = split(s, a, ","); cnt = (n > 1) ? a[2] : 1; for (i = 0; i < cnt; i++) print f ":" (a[1] + i) > out } }'
# shellcheck disable=SC2086
_diff_files=$(git -C "$TREE" diff --name-only --no-ext-diff --diff-filter=AMR "$MB" -- $SCOPE </dev/null 2>/dev/null | grep -c .)
[ "$_diff_files" -eq 0 ] || [ "$(cat "$WORK/hunks" 2>/dev/null || echo 0)" -gt 0 ] || die2 "added-line diff produced no hunks for $_diff_files changed file(s); check git diff config"
# shellcheck disable=SC2086
git -C "$TREE" ls-files --others --exclude-standard -- $SCOPE </dev/null >"$UNTRACKED" 2>/dev/null
is_added() { grep -Fxq -- "$1:$2" "$ADDED" || grep -Fxq -- "$1" "$UNTRACKED"; }
note "BASE ref=$BASE_REF merge-base=$(git -C "$TREE" rev-parse --short=8 "$MB" </dev/null) changed-files=$( { cut -d: -f1 "$ADDED"; cat "$UNTRACKED"; } | sort -u | grep -c .)"

# ---- line checks ----
while IFS="$TAB" read -r ID MODE PAT PATHS; do
    [ -n "$ID" ] || continue
    # shellcheck disable=SC2086
    HITS=$(G -nE -e "$PAT" -- $PATHS); RC=$?
    if [ "$RC" -gt 1 ]; then emit FAIL "$ID" "git grep error (exit $RC): $(grep_error)"; continue; fi
    while IFS= read -r l; do
        [ -n "$l" ] || continue
        file=${l%%:*}; rest=${l#*:}; lineno=${rest%%:*}; text=${rest#*:}
        if printf '%s' "$text" | grep -Eq '^[[:space:]]*(\*|//|#|/\*|\{\{--|<!--)'; then continue; fi
        level=WARN
        case "$MODE" in any) level=FAIL;; added) is_added "$file" "$lineno" && level=FAIL;; esac
        emit "$level" "$ID" "$file:$lineno $(printf '%s' "$text" | tr -s '[:space:]' ' ' | cut -c1-110)"
    done <<EOF2
$HITS
EOF2
done <"$WORK/lines.tsv"

# ---- counter verdicts ----
while IFS="$TAB" read -r ID N LABEL; do
    [ -n "$ID" ] || continue
    if [ "$N" = ERR ]; then emit FAIL "$ID" "$LABEL"; continue; fi
    BASE=$(base_of "$ID")
    case "$BASE" in ''|*[!0-9]*) emit FAIL "$ID" "baseline missing or malformed in $BASELINE (measured $N)"; continue;; esac
    if [ "$N" -gt "$BASE" ]; then emit FAIL "$ID" "count $N > baseline $BASE ($LABEL)"
    else
        [ "$N" -eq 0 ] || emit WARN "$ID" "count $N (baseline $BASE; $LABEL)"
        [ "$N" -ge "$BASE" ] || note "$ID can be lowered: $BASE -> $N (merger updates the baseline)"
    fi
done <"$WORK/measured"

if [ "$FAILN" -eq 0 ]; then echo "STANDARDS PASS fail=$FAILN warn=$WARNN"; exit 0; fi
echo "STANDARDS FAIL fail=$FAILN warn=$WARNN"; exit 1
