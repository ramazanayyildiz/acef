#!/bin/bash
# Self-test for gate.sh: PASS, FAIL, full_only SKIP, {port} without GATE_PORT -> INCOMPLETE (exit 3), dirty refusal,
# {{placeholder}} expansion from a stack profile (--profile and "stack-profile"), undefined placeholder refused.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-gate.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
cd "$T" && git init -q -b main && git config user.email t@t && git config user.name t
printf '.tmp/\n' > .gitignore
cat > slice-method.json <<'J'
{ "method_version": "0.1.0", "project": "t", "slices_dir": "docs/slices",
  "gate": { "commands": [ { "name": "true", "run": "test -d {tree}" }, { "name": "heavy", "run": "false", "full_only": true } ] } }
J
git add -A && git commit -qm base
out=$("$HERE/gate.sh" "$T"); rc=$?; check "$rc" 0 "light gate passes, full_only skipped"
printf '%s\n' "$out" | tail -n 1 | grep -q '^GATE PASS ' && check 1 1 "summary line" || check 0 1 "summary line"
"$HERE/gate.sh" --full "$T" >/dev/null; check "$?" 1 "--full runs failing heavy command"
"$HERE/gate.sh" >/dev/null 2>&1; check "$?" 2 "no tree argument refused"
python3 -c "import json;c=json.load(open('slice-method.json'));c['gate']['commands'].append({'name':'smoke','run':'echo {port}'});json.dump(c,open('slice-method.json','w'))"
git commit -qam port
env -u GATE_PORT "$HERE/gate.sh" "$T" >/dev/null; check "$?" 3 "missing GATE_PORT -> INCOMPLETE"
GATE_PORT=8130 "$HERE/gate.sh" "$T" >/dev/null; check "$?" 0 "GATE_PORT given -> PASS"
echo x >> slice-method.json
"$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 2 "dirty tree refused"
git checkout -q slice-method.json
# ---- stack profile placeholders (ACEF-NEUTRAL-01) ----
mkdir -p "$T.prof" && trap 'rm -rf "$T" "$T.prof"' EXIT
printf '{ "stack": "t", "placeholders": { "test_command": "test -d {tree}", "static_analysis": "false" } }\n' > "$T.prof/profile.json"
cat > slice-method.json <<'J'
{ "method_version": "0.1.0", "project": "t", "slices_dir": "docs/slices",
  "gate": { "commands": [ { "name": "tests", "run": "{{test_command}}" } ] } }
J
git commit -qam profile
env -u SLICE_STACK_PROFILE "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 2 "{{test_command}} without a profile refused"
"$HERE/gate.sh" --profile "$T.prof/profile.json" "$T" >/dev/null; check "$?" 0 "--profile expands {{test_command}} (+ {tree})"
SLICE_STACK_PROFILE="$T.prof/profile.json" "$HERE/gate.sh" "$T" >/dev/null; check "$?" 0 "SLICE_STACK_PROFILE expands {{test_command}}"
python3 -c "import json;c=json.load(open('slice-method.json'));c['stack-profile']='$T.prof/profile.json';c['gate']['commands'].append({'name':'stan','run':'{{static_analysis}}'});json.dump(c,open('slice-method.json','w'))"
git commit -qam stack-profile
"$HERE/gate.sh" "$T" >/dev/null; check "$?" 1 "stack-profile in slice-method.json is read ({{static_analysis}} -> false)"
echo "test-gate: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
