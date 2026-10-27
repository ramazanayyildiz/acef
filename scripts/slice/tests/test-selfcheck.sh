#!/bin/bash
# Self-test for selfcheck.sh (R1 of PR #1): it runs on a COPY of the lane so mutations never touch the repo.
#   F2  a stack whose prerequisites are missing is SKIPPED (core still checked); --stack <name> forces it (then FAIL)
#   F3  the neutrality scan covers scripts/slice and the words php, phpstan, blade, eloquent, artisan, composer, livewire
#   F4–F6  source backlog ids (B7/B27/B28/B40), the CACHE_DRIVER example and the source ports are rejected in the core
#   F10 every {{key}} named in the adoption guide is used by a core template or the core example
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # scripts/slice
ROOT=$(cd "$HERE/../.." && pwd -P)
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-self.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
fresh() { # new copy of the lane in $T/r
    rm -rf "$T/r"; mkdir -p "$T/r/method" "$T/r/docs"
    cp "$ROOT/method/SLICE_LANE.md" "$ROOT/method/PRODUCT_LANGUAGE.md" "$ROOT/method/TEST_PIPELINE.md" "$T/r/method/"
    cp -R "$ROOT/templates" "$ROOT/schemas" "$ROOT/stacks" "$ROOT/LICENSES" "$T/r/"
    mkdir -p "$T/r/scripts"; cp -R "$ROOT/scripts/slice" "$T/r/scripts/"
    cp -R "$ROOT/docs/slice-lane" "$T/r/docs/"
    rm -f "$T/r/scripts/slice/tests/test-selfcheck.sh"   # no recursion
}
expect_scan_fail() { # <file> <text> <label>: rc != 0 AND the scan reports "<file>:<line>:" with the injected text
    fresh; printf '\n%s\n' "$2" >> "$T/r/$1"
    out=$(bash "$T/r/scripts/slice/selfcheck.sh" --scan-only 2>&1); rc=$?
    [ "$rc" -ne 0 ] && printf '%s\n' "$out" | grep -F -- "$1:" | grep -qF -- "$2" && check 1 1 "$3" || check 0 1 "$3 (rc=$rc)"
}
fresh
bash "$T/r/scripts/slice/selfcheck.sh" --scan-only >/dev/null 2>&1; check "$?" 0 "unmodified copy passes the scan"
for w in php phpstan blade eloquent artisan composer livewire laravel; do
    expect_scan_fail templates/slice/slice.md "uses $w here" "'$w' in a core template is rejected"
done
for w in php phpstan livewire laravel; do
    expect_scan_fail scripts/slice/gate.sh "# runs $w" "'$w' in a core script is rejected"
done
expect_scan_fail templates/slice/review-checklist.md "| X | host include (B28) |" "source backlog id B28 rejected"
expect_scan_fail templates/slice/review-checklist.md "| X | env drift CACHE_DRIVER |" "CACHE_DRIVER example rejected"
expect_scan_fail docs/slice-lane/examples/slice-method.example.json '"preview_port": 8127' "source port 8127 rejected"
expect_scan_fail docs/slice-lane/adoption.md 'optional `{{test_filter}}`' "adoption names a {{key}} no core file uses"
# ACEF-FIX-03: TEST-RUN.md is scanned except its "## Bootstrap example (Laravel)" section
expect_scan_fail docs/slice-lane/TEST-RUN.md "## Drills
run composer here" "a stack tool in TEST-RUN.md outside the bootstrap section is rejected"
awk '/^## Bootstrap example \(Laravel\)/{print "uses phpunit and artisan here"} {print}' "$T/r/docs/slice-lane/TEST-RUN.md" > "$T/r/x.tmp" && mv "$T/r/x.tmp" "$T/r/docs/slice-lane/TEST-RUN.md"
bash "$T/r/scripts/slice/selfcheck.sh" --scan-only >/dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && check 1 1 "stack words just before the bootstrap heading are rejected" || check 0 1 "stack words just before the bootstrap heading are rejected"
fresh; printf '\nphpunit artisan composer\n' >> "$T/r/docs/slice-lane/TEST-RUN.md"
bash "$T/r/scripts/slice/selfcheck.sh" --scan-only >/dev/null 2>&1; check "$?" 0 "stack words inside the bootstrap section (last section) are allowed"
# R7 (Codex): exclusions are paths, not basenames
fresh; mkdir -p "$T/r/templates/slice/x"; printf 'uses laravel and php\n' > "$T/r/templates/slice/x/adoption.md"
out=$(bash "$T/r/scripts/slice/selfcheck.sh" --scan-only 2>&1); rc=$?
[ "$rc" -ne 0 ] && printf '%s\n' "$out" | grep -qF 'templates/slice/x/adoption.md:' && check 1 1 "a planted templates/slice/x/adoption.md is scanned" || check 0 1 "a planted templates/slice/x/adoption.md is scanned (rc=$rc)"
fresh; printf 'uses laravel\n' > "$T/r/scripts/slice/tests/fixtures/selfcheck.sh"
bash "$T/r/scripts/slice/selfcheck.sh" --scan-only >/dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && check 1 1 "a planted fixtures/selfcheck.sh is scanned" || check 0 1 "a planted fixtures/selfcheck.sh is scanned"
# F2: php present but broken (exit 127) -> the laravel adapter is skipped, the core still runs and passes
mkdir -p "$T/shim"; printf '#!/bin/sh\nexit 127\n' > "$T/shim/php"; chmod +x "$T/shim/php"
fresh
out=$(PATH="$T/shim:$PATH" bash "$T/r/scripts/slice/selfcheck.sh" 2>&1); rc=$?
check "$rc" 0 "no working php: SELFCHECK PASS (adapter skipped)"
printf '%s\n' "$out" | grep -q '^SKIP stack laravel' && check 1 1 "skip line names the stack" || check 0 1 "skip line names the stack"
printf '%s\n' "$out" | grep -q 'scripts/slice/tests/test-gate.sh' && check 1 1 "core tests still run" || check 0 1 "core tests still run"
PATH="$T/shim:$PATH" bash "$T/r/scripts/slice/selfcheck.sh" --stack laravel >/dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && check 1 1 "--stack laravel without php fails" || check 0 1 "--stack laravel without php fails"
# R3 (Codex): --stack with a trailing slash still forces the stack; an unknown stack is a usage error
PATH="$T/shim:$PATH" bash "$T/r/scripts/slice/selfcheck.sh" --stack laravel/ >/dev/null 2>&1; rc=$?
[ "$rc" -ne 0 ] && check 1 1 "--stack laravel/ (trailing slash) forces the stack -> fails without php" || check 0 1 "--stack laravel/ (trailing slash) forces the stack -> fails without php"
bash "$T/r/scripts/slice/selfcheck.sh" --stack no-such-stack >/dev/null 2>&1; check "$?" 2 "--stack <unknown> -> exit 2"
bash "$T/r/scripts/slice/selfcheck.sh" --stack ../stacks/laravel >/dev/null 2>&1; check "$?" 2 "--stack with a path -> exit 2"
echo "test-selfcheck: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
