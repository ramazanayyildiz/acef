#!/bin/bash
# Self-test for the core review call scripts/slice/codex-review.sh (stack-neutral; moved from the adapter in R1/F8).
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
echo "test-codex-review: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
