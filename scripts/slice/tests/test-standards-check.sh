#!/bin/bash
# Self-test for the core standards-check.sh: how it finds the stack profile. An explicit --profile or a
# "stack_profile" in slice-method.json that does not resolve to a readable file is a usage error (exit 2), never a
# silent run without the profile's tool-error patterns (ACEF-FIX-02, R5 of PR #1).
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # scripts/slice
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-stdc.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
cd "$T" && git init -q -b main && git config user.email t@t && git config user.name t
mkdir -p src scripts/standards
printf '{ "scope": ["src"], "line_checks": [ { "id": "T1", "mode": "added", "pattern": "TODO-NEVER", "paths": ["src"], "label": "x" } ], "counters": [] }\n' > scripts/standards/rules.json
: > scripts/standards/baseline.txt
printf 'ok\n' > src/a.txt
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": {}, "standards": { "tool_error_patterns": ["boom"] } }\n' > profile.json
smj() { printf '{ "method_version": "0.1.0", "project": "t", "slices_dir": "docs/slices"%s }\n' "$1" > slice-method.json; }
smj ''
git add -A && git commit -qm base
sc() { env -u SLICE_STACK_PROFILE STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$@" >/dev/null 2>&1; }
sc "$T"; check "$?" 0 "no stack_profile -> runs (profile is optional)"
smj ', "stack_profile": "profile.json"'
sc "$T"; check "$?" 0 "stack_profile that exists -> runs"
smj ', "stack_profile": "no/such/profile.json"'
sc "$T"; check "$?" 2 "stack_profile that does not exist -> exit 2"
out=$(env -u SLICE_STACK_PROFILE STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T" 2>&1 >/dev/null)
printf '%s\n' "$out" | grep -q 'no/such/profile.json' && check 1 1 "exit 2 names the missing path" || check 0 1 "exit 2 names the missing path"
smj ', "stack_profile": ""'
sc "$T"; check "$?" 2 "empty stack_profile -> exit 2"
smj ', "stack_profile": 7'
sc "$T"; check "$?" 2 "non-string stack_profile -> exit 2"
smj ', "stack_profile": "src"'
sc "$T"; check "$?" 2 "stack_profile that is a directory -> exit 2"
smj ''
sc --profile "$T/missing.json" "$T"; check "$?" 2 "--profile that does not exist -> exit 2"
SLICE_STACK_PROFILE="$T/missing.json" STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T" >/dev/null 2>&1
check "$?" 2 "SLICE_STACK_PROFILE that does not exist -> exit 2"
echo "test-standards-check: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
