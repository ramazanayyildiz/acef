#!/bin/bash
# Core regex/tool-error regressions; no stack toolchain or external service.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-std-errors.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
cd "$T" && git init -q -b main && git config user.email t@t && git config user.name t
mkdir -p scripts/standards
printf 'ordinary text\n' > sample.txt
printf 'BAD=0\n' > scripts/standards/baseline.txt
git add sample.txt scripts/standards/baseline.txt && git commit -qm base
rules() { printf '%s\n' "$1" > scripts/standards/rules.json; }
run_case() { # <want rc> <label> [args...]
    local want=$1 label=$2; shift 2
    out=$(STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$@" "$T" 2>&1); rc=$?
    check "$rc" "$want" "$label"
    if [ "$want" != 0 ]; then
        printf '%s\n' "$out" | grep -q '^STANDARDS PASS' && check PASS error "$label: never PASS" || check error error "$label: never PASS"
    fi
}
rules '{"counters":[{"id":"BAD","pattern":"[","paths":["*.txt"],"label":"invalid regex"}]}'
run_case 1 "invalid counter ERE fails"
run_case 2 "invalid counter cannot print baseline zero" --print-baseline
rules '{"scope":["*.txt"],"line_checks":[{"id":"BAD","mode":"any","pattern":"[","paths":["*.txt"]}]}'
run_case 1 "invalid line-check ERE fails"
rules '{"counters":[{"id":"BAD","pattern":"absent","paths":["*.txt"],"label":"no match"}]}'
run_case 0 "valid counter with no matches stays zero"
rules '{"scope":["*.txt"],"line_checks":[{"id":"BAD","mode":"any","pattern":"absent","paths":["*.txt"]}]}'
run_case 0 "valid line-check with no matches passes"
rules '{"command_counters":[{"id":"BAD","run":"printf match","count_regex":"[","label":"bad count"}]}'
run_case 1 "invalid command count_regex fails"
rules '{"command_counters":[{"id":"BAD","run":"printf match","count_regex":"match","exclude_regex":"[","label":"bad exclusion"}]}'
run_case 1 "invalid command exclude_regex fails"
rules '{"command_counters":[{"id":"BAD","run":"printf match","count_regex":"absent","label":"no match"}]}'
run_case 0 "valid command regex with no matches passes"
printf '{"standards":{"tool_error_patterns":["["]}}\n' > profile.json
run_case 2 "invalid profile tool-error ERE refused" --profile "$T/profile.json"
echo "test-standards-errors: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
