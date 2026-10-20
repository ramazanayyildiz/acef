#!/bin/bash
# gate.sh [--full] [--allow-dirty] [--config <slice-method.json>] [--profile <profile.json>] <tree>
#
# Stack-neutral slice gate (core). Runs the command list a project declares in slice-method.json ("gate.commands")
# inside <tree>, in order, and prints ONE summary line at the end. Adapted from the source project's gate (REB in
# docs/slice-lane/SOURCES.md): same exit codes, same "never run without an explicit tree" rule, same dirty-tree refusal.
#
# Per command: "PASS|FAIL|SKIP <name> <seconds>s" (+ last 20 output lines on FAIL). Output of every command goes to
#   ${GATE_LOG_DIR:-<tree>/.tmp/gate}/<name>.log
# Last line: GATE PASS|FAIL|INCOMPLETE <sha7>[+dirty] <light|full> pass=<n> fail=<n> skip=<n> <seconds>s
# Exit: 0 all PASS, 1 at least one FAIL, 2 usage/prerequisite, 3 no FAIL but something SKIPPED (INCOMPLETE; never success).
# Clean tree (unless "require_clean_tree": false or --allow-dirty, which tags the summary +dirty): no tracked change and
# no untracked file that .gitignore does not cover ("??" in git status), submodules included whatever their "ignore"
# setting. Only the gate's own log dir is exempt.
#
# Placeholders in "run": {{<key>}} (stack profile, expanded first), then {tree} (absolute tree path) and {port}
# (GATE_PORT, required only if a command uses it).
# Stack profile (stacks/<stack>/profile.json, "placeholders": {key: command}): --profile, else env SLICE_STACK_PROFILE,
# else "stack_profile" in slice-method.json (relative to the config file's directory). A {{key}} that no profile
# defines (or defines empty), a key that is not lower snake_case, malformed braces ({{{key}}}, unbalanced {{ or }}),
# a control character (NUL included) in a run or a profile value, a {{…}} left after expansion, a bad or duplicate
# name, or an empty run in ANY command is a usage error (exit 2) before any command runs, never an empty command.
# A command with "full_only": true runs only with --full; without --full it is reported as "SKIP <name> (full only)"
# and does NOT make the gate INCOMPLETE (it was not asked for). A command whose {port} is needed but GATE_PORT is unset
# is SKIPPED and makes the gate INCOMPLETE.
# Requires: bash, git, python3 (reads JSON with -I, no third-party modules).
set -u

die2() { printf '%s\n' "$*" >&2; exit 2; }
usage() { die2 "usage: gate.sh [--full] [--allow-dirty] [--config <slice-method.json>] [--profile <profile.json>] <tree>   (env: GATE_PORT, GATE_LOG_DIR, SLICE_STACK_PROFILE)"; }

FULL=0; ALLOW_DIRTY=0; CONFIG=""; PROFILE=${SLICE_STACK_PROFILE:-}; TREE=""
while [ $# -gt 0 ]; do
    case "$1" in
        --full) FULL=1; shift;;
        --allow-dirty) ALLOW_DIRTY=1; shift;;
        --config) [ $# -ge 2 ] || usage; CONFIG=$2; shift 2;;
        --profile) [ $# -ge 2 ] || usage; PROFILE=$2; shift 2;;
        -h|--help) usage;;
        -*) printf 'unknown option: %s\n' "$1" >&2; usage;;
        *) [ -z "$TREE" ] || usage; TREE=$1; shift;;
    esac
done
[ -n "$TREE" ] || die2 "gate.sh needs an explicit tree argument (your own worktree). It never defaults to the main tree."
[ -d "$TREE" ] || die2 "tree not found: $TREE"
TREE=$(cd "$TREE" && pwd -P)
[ "$(git -C "$TREE" rev-parse --show-toplevel </dev/null 2>/dev/null)" = "$TREE" ] || die2 "$TREE is not the root of a git working tree"
CONFIG=${CONFIG:-$TREE/slice-method.json}
[ -f "$CONFIG" ] || die2 "config not found: $CONFIG"
command -v python3 >/dev/null 2>&1 || die2 "python3 not found"

if [ -n "${GATE_PORT:-}" ]; then
    case "$GATE_PORT" in ''|*[!0-9]*) die2 "GATE_PORT must be a number: $GATE_PORT";; esac
fi

# Read config -> TSV lines: name<TAB>full_only<TAB>timeout<TAB>require_clean<TAB>run  (run is last: may contain tabs? refused)
[ -z "$PROFILE" ] || [ -f "$PROFILE" ] || die2 "stack profile not found: $PROFILE"
# The whole command list is validated and every placeholder resolved BEFORE anything runs: on any error the parser
# prints only one "ERR …" line and the gate exits 2 without executing a command (R1/F1 of PR #1).
PARSED=$(python3 -I - "$CONFIG" "$PROFILE" <<'PY'
import json, os, re, sys
def err(msg):
    print(f"ERR {msg}"); sys.exit(0)
try:
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception as e:
    err(f"config is not valid JSON: {e}")
if not isinstance(cfg, dict):
    err("config must be a JSON object")
prof_path = sys.argv[2]
if not prof_path and "stack_profile" in cfg:
    if not isinstance(cfg["stack_profile"], str) or not cfg["stack_profile"]:
        err("stack_profile must be a non-empty path")
    prof_path = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), cfg["stack_profile"])
holders = {}
if prof_path:
    try:
        prof = json.load(open(prof_path, encoding="utf-8"))
    except Exception as e:
        err(f"stack profile {prof_path} unreadable: {e}")
    if not isinstance(prof, dict) or not isinstance(prof.get("placeholders"), dict):
        err(f"stack profile {prof_path} has no placeholders object")
    holders = prof["placeholders"]
KEY = re.compile(r"(?<!\{)\{\{([a-z0-9_]+)\}\}(?!\})")
CTRL = re.compile(r"[\x00-\x1f\x7f]")
def expand(r, i):
    if CTRL.search(r):
        err(f"gate.commands[{i}] run contains a control character")
    rest = KEY.sub("", r)
    if "{{" in rest or "}}" in rest:
        err(f"gate.commands[{i}] has malformed placeholder braces (only {{{{lower_snake_key}}}} is allowed)")
    missing = []
    def sub(m):
        v = holders.get(m.group(1))
        if not isinstance(v, str) or not v.strip():
            missing.append(m.group(1))
            return ""
        if CTRL.search(v):
            missing.append(m.group(1) + " (control character in value)")
            return ""
        return v
    out = KEY.sub(sub, r)
    if missing:
        err(f"gate.commands[{i}] uses {{{{{missing[0]}}}}} but the stack profile does not define it (or it is empty)")
    left = re.search(r"\{\{[^}]*\}\}|\{\{|\}\}", out)
    if left:
        err(f"gate.commands[{i}] has an unresolved placeholder {left.group(0)!r} after expansion (keys are lower snake_case; profile values are not expanded again)")
    return out
g = cfg.get("gate")
if not isinstance(g, dict) or not isinstance(g.get("commands"), list) or not g["commands"]:
    err("gate.commands missing or empty")
clean = "1" if g.get("require_clean_tree", True) else "0"
seen, rows = set(), []
for i, c in enumerate(g["commands"]):
    if not isinstance(c, dict) or not isinstance(c.get("name"), str) or not isinstance(c.get("run"), str):
        err(f"gate.commands[{i}] needs string name and run")
    n = c["name"]
    if not n or any(ch in n for ch in " \t\n/") or n in seen:
        err(f"gate.commands[{i}] bad or duplicate name: {n!r}")
    r = expand(c["run"], i)
    if not r.strip():
        err(f"gate.commands[{i}] run is empty")
    if "\t" in r or "\n" in r:
        err(f"gate.commands[{i}] run must be one line without tabs")
    seen.add(n)
    t = c.get("timeout_s", 0)
    rows.append("\t".join([n, "1" if c.get("full_only") else "0", str(int(t) if isinstance(t, int) else 0), clean, r]))
print("\n".join(rows))
PY
)
ERRLINE=$(printf '%s\n' "$PARSED" | grep -m1 '^ERR ' || true)
[ -z "$ERRLINE" ] || die2 "${ERRLINE#ERR }"
[ -n "$PARSED" ] || die2 "gate.commands could not be read"

REQUIRE_CLEAN=$(printf '%s\n' "$PARSED" | head -n 1 | cut -f4)
LOGDIR=${GATE_LOG_DIR:-$TREE/.tmp/gate}
mkdir -p "$LOGDIR" || die2 "cannot create log dir: $LOGDIR"
LOGDIR=$(cd "$LOGDIR" && pwd -P)
# Clean = no tracked change AND no untracked, non-ignored file ("??"). The gate's own log dir is the only exclusion.
set -- .
case "$LOGDIR/" in "$TREE"/?*) set -- . ":(exclude,top,literal)${LOGDIR#"$TREE"/}";; esac
DIRTYTAG=""
DIRTY=$(git -C "$TREE" status --porcelain --untracked-files=all --ignore-submodules=none -- "$@" </dev/null)
if [ -n "$DIRTY" ]; then
    if [ "$REQUIRE_CLEAN" = 1 ] && [ "$ALLOW_DIRTY" != 1 ]; then
        printf 'dirty tree (changed or untracked files); commit, remove or .gitignore them, or pass --allow-dirty to run anyway:\n' >&2
        printf '%s\n' "$DIRTY" | head -n 20 >&2; exit 2
    fi
    DIRTYTAG="+dirty"
fi
SHA7=$(git -C "$TREE" rev-parse --short=7 HEAD </dev/null)

run_with_timeout() { # <seconds> <cmd>; 0 seconds = no timeout
    if [ "$1" -gt 0 ] && command -v timeout >/dev/null 2>&1; then timeout "$1" sh -c "$2"
    elif [ "$1" -gt 0 ] && command -v gtimeout >/dev/null 2>&1; then gtimeout "$1" sh -c "$2"
    else sh -c "$2"; fi
}

PASSN=0; FAILN=0; SKIPN=0; START=$(date +%s)
while IFS="$(printf '\t')" read -r NAME FULLONLY TMO _CLEAN RUN; do
    [ -n "$NAME" ] || continue
    if [ "$FULLONLY" = 1 ] && [ "$FULL" != 1 ]; then printf 'SKIP %s (full only)\n' "$NAME"; continue; fi
    case "$RUN" in
        *"{port}"*) if [ -z "${GATE_PORT:-}" ]; then printf 'SKIP %s (needs GATE_PORT)\n' "$NAME"; SKIPN=$((SKIPN + 1)); continue; fi;;
    esac
    CMD=$(printf '%s' "$RUN" | sed "s#{tree}#$TREE#g; s#{port}#${GATE_PORT:-}#g")
    T0=$(date +%s)
    ( cd "$TREE" && run_with_timeout "$TMO" "$CMD" ) >"$LOGDIR/$NAME.log" 2>&1 </dev/null
    RC=$?
    DT=$(( $(date +%s) - T0 ))
    if [ "$RC" -eq 0 ]; then printf 'PASS %s %ss\n' "$NAME" "$DT"; PASSN=$((PASSN + 1))
    else
        printf 'FAIL %s %ss exit=%s (log %s)\n' "$NAME" "$DT" "$RC" "$LOGDIR/$NAME.log"
        tail -n 20 "$LOGDIR/$NAME.log" | sed 's/^/    /'
        FAILN=$((FAILN + 1))
    fi
done <<EOF2
$PARSED
EOF2

MODE=light; [ "$FULL" = 1 ] && MODE=full
TOTAL=$(( $(date +%s) - START ))
if [ "$FAILN" -gt 0 ]; then VERDICT=FAIL; RC=1
elif [ "$SKIPN" -gt 0 ]; then VERDICT=INCOMPLETE; RC=3
else VERDICT=PASS; RC=0; fi
printf 'GATE %s %s%s %s pass=%s fail=%s skip=%s %ss\n' "$VERDICT" "$SHA7" "$DIRTYTAG" "$MODE" "$PASSN" "$FAILN" "$SKIPN" "$TOTAL"
exit "$RC"
