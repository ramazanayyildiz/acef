#!/bin/bash
# codex-review.sh [--dry-run] [--workdir <review worktree>] <brief.md> <out.md>
#
# Reviewer invocation pattern for an independent review by a different model family (TAM class).
# Stack-neutral core script (any stack copies it to <app>/scripts/). Simplified from the source project's review
# wrapper (REB in docs/slice-lane/SOURCES.md): the model is REQUIRED (no default model, so a report always
# names what reviewed it), the sandbox is read-only, the brief goes in on stdin only, and a missing verdict is a TOOL
# ERROR, never a pass. The brief is built from templates/review-brief.md (+ review-checklist.md).
#
# Model: env REVIEW_MODEL, else "review.codex_model" from ${SLICE_METHOD_CONFIG:-./slice-method.json}.
# Command (what actually runs):
#   codex exec --skip-git-repo-check -c 'model="<M>"' -s read-only [-C <workdir>] -o <fresh temp file> - < <brief.md>
# Every run writes to a fresh temp file next to <out.md>; only a non-empty report replaces <out.md>, so a report left
# by an earlier run is never read as this run's verdict. Empty or missing output = TOOL ERROR, <out.md> untouched.
# Verdict line: the FIRST line whose label is Karar/Verdict/Decision (any case, optionally **bold**) must be exactly
#   <label>: PASS | <label>: REVISE   (value upper-case, optionally **bold**: "Karar: **PASS**", "**Verdict:** REVISE")
# Anything else on that line ("NOT PASS", "PASSED", the unfilled "PASS | REVISE") is NONE -> TOOL ERROR.
# Env: CODEX_BIN (default codex), REVIEW_TIMEOUT seconds (default 3600; needs timeout/gtimeout to be enforced).
# Exit: 0 verdict PASS, 1 verdict REVISE, 2 usage/prerequisite, 3 TOOL ERROR (codex failed, no output, or no valid
#   verdict line).
# Last line: CODEX-REVIEW model=<M> verdict=<PASS|REVISE|NONE> exit=<codex rc> <seconds>s out=<out.md>
# A read-only sandbox cannot run mutations or a browser: pair it with a second reviewer (Claude session) for those,
# as the source project did ("Codex source+mutation proposals, Sonnet/Opus browser walk").
set -u
die2() { printf '%s\n' "$*" >&2; exit 2; }
usage() { die2 "usage: REVIEW_MODEL=<model> codex-review.sh [--dry-run] [--workdir <dir>] <brief.md> <out.md>"; }
DRY=0; WD=""; BRIEF=""; OUT=""
while [ $# -gt 0 ]; do
    case "$1" in
        --dry-run) DRY=1; shift;;
        --workdir) [ $# -ge 2 ] || usage; WD=$2; shift 2;;
        -*) usage;;
        *) if [ -z "$BRIEF" ]; then BRIEF=$1; elif [ -z "$OUT" ]; then OUT=$1; else usage; fi; shift;;
    esac
done
[ -n "$BRIEF" ] && [ -n "$OUT" ] || usage
[ -f "$BRIEF" ] && [ -s "$BRIEF" ] || die2 "brief missing or empty: $BRIEF"
[ -z "$WD" ] || [ -d "$WD" ] || die2 "workdir not found: $WD"
MODEL=${REVIEW_MODEL:-}
if [ -z "$MODEL" ]; then
    CFG=${SLICE_METHOD_CONFIG:-./slice-method.json}
    if [ -f "$CFG" ] && command -v python3 >/dev/null 2>&1; then
        MODEL=$(python3 -I -c 'import json,sys; print((json.load(open(sys.argv[1])).get("review") or {}).get("codex_model") or "")' "$CFG" 2>/dev/null)
    fi
fi
[ -n "$MODEL" ] || die2 "no model: set REVIEW_MODEL or review.codex_model in slice-method.json (there is no default on purpose)"
case "$MODEL" in *[!A-Za-z0-9._:-]*) die2 "model name has unexpected characters: $MODEL";; esac
CODEX=${CODEX_BIN:-codex}
TMO=${REVIEW_TIMEOUT:-3600}
set -- exec --skip-git-repo-check -c "model=\"$MODEL\"" -s read-only
[ -z "$WD" ] || set -- "$@" -C "$WD"
if [ "$DRY" = 1 ]; then
    printf '%s' "$CODEX"; printf ' %q' "$@" -o; printf ' <fresh-temp-file> -'; printf ' < %q   (then moved to %q)\n' "$BRIEF" "$OUT"; exit 0
fi
command -v "$CODEX" >/dev/null 2>&1 || die2 "codex binary not found: $CODEX"
[ -d "$(dirname "$OUT")" ] || die2 "output directory not found: $(dirname "$OUT")"
OUTDIR=$(cd "$(dirname "$OUT")" && pwd -P)   # absolute: codex -C <workdir> must not re-anchor a relative -o path
TMP=$(mktemp "$OUTDIR/.codex-review.XXXXXX") || die2 "cannot create a temp file in $OUTDIR"
trap 'rm -f "$TMP"' EXIT
set -- "$@" -o "$TMP" -
T0=$(date +%s)
if command -v timeout >/dev/null 2>&1; then timeout "$TMO" "$CODEX" "$@" <"$BRIEF"; RC=$?
elif command -v gtimeout >/dev/null 2>&1; then gtimeout "$TMO" "$CODEX" "$@" <"$BRIEF"; RC=$?
else "$CODEX" "$@" <"$BRIEF"; RC=$?; fi
DT=$(( $(date +%s) - T0 ))
VERDICT=NONE
if [ -s "$TMP" ]; then
    mv -f "$TMP" "$OUT" || { printf 'cannot write %s\n' "$OUT" >&2; exit 3; }
    LINE=$(grep -m1 -iE '^(\*\*)?(karar|verdict|decision)(\*\*)?[[:space:]]*:' "$OUT" | tr -d '\r' || true)
    if printf '%s\n' "$LINE" | grep -qE '^(\*\*)?[A-Za-z]+(\*\*)?[[:space:]]*:[[:space:]]*(\*\*)?[[:space:]]*(PASS|REVISE)[[:space:]]*(\*\*)?[[:space:]]*$'; then
        case "$LINE" in *REVISE*) VERDICT=REVISE;; *) VERDICT=PASS;; esac
    fi
else
    printf 'no output from the model this run; %s left untouched\n' "$OUT" >&2
fi
printf 'CODEX-REVIEW model=%s verdict=%s exit=%s %ss out=%s\n' "$MODEL" "$VERDICT" "$RC" "$DT" "$OUT"
[ "$RC" -eq 0 ] || exit 3
case "$VERDICT" in PASS) exit 0;; REVISE) exit 1;; *) exit 3;; esac
