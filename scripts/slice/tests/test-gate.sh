#!/bin/bash
# Self-test for gate.sh: PASS, FAIL, full_only SKIP, {port} without GATE_PORT -> INCOMPLETE (exit 3), dirty refusal,
# {{placeholder}} expansion from a stack profile (--profile and "stack-profile"), undefined placeholder refused.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)
ROOT=$(cd "$HERE/../.." && pwd -P)
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
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null; check "$?" 0 "GATE_PORT given -> PASS"
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
python3 -c "import json;c=json.load(open('slice-method.json'));c['stack_profile']='$T.prof/profile.json';c['gate']['commands'].append({'name':'stan','run':'{{static_analysis}}'});json.dump(c,open('slice-method.json','w'))"
git commit -qam stack_profile
"$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 1 "stack_profile in slice-method.json is read ({{static_analysis}} -> false)"

# ---- R1 (PR #1 review): every command is resolved before anything runs ----
# gate_case <want rc> <label> <gate args...>: rc must match AND no command may have run (no PASS/FAIL line, no marker)
gate_case() {
    local want=$1 label=$2; shift 2
    rm -f "$T.prof/ran"
    out=$(env -u SLICE_STACK_PROFILE "$HERE/gate.sh" "$@" 2>&1); rc=$?
    check "$rc" "$want" "$label"
    if [ "$want" = 2 ]; then
        if printf '%s\n' "$out" | grep -Eq '^(PASS|FAIL) ' || [ -e "$T.prof/ran" ]; then check ran none "$label: nothing executed"
        else check none none "$label: nothing executed"; fi
    fi
}
smj() { # <python statements on c> : rewrite slice-method.json and commit
    python3 -c "import json;c=json.load(open('slice-method.json'));$1;json.dump(c,open('slice-method.json','w'))"
    git commit -qam "case" >/dev/null
}
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "touch %s/ran", "static_analysis": "true", "boundary_check": "", "standards_check": "true", "nested": "echo {{test_command}}" } }\n' "$T.prof" > "$T.prof/p.json"
smj "c.pop('stack_profile',None);c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{no_such_key}}'}]"
gate_case 2 "undefined placeholder at index 1 -> exit 2" --profile "$T.prof/p.json" "$T"
printf '%s\n' "$out" | grep -q 'no_such_key' && check 1 1 "exit 2 names the missing key" || check 0 1 "exit 2 names the missing key"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{boundary_check}}'}]"
gate_case 2 "empty placeholder value at index 1 -> exit 2" --profile "$T.prof/p.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'a','run':'true'}]"
gate_case 2 "duplicate name at index 1 -> exit 2" --profile "$T.prof/p.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{noSuch}}','full_only':True}]"
gate_case 2 "full_only command with undefined placeholder -> exit 2 even in light mode" --profile "$T.prof/p.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{testCommand}}'}]"
gate_case 2 "camelCase {{testCommand}} -> exit 2" --profile "$T.prof/p.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{test-command}}'}]"
gate_case 2 "kebab {{test-command}} -> exit 2" --profile "$T.prof/p.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{nested}}'}]"
gate_case 2 "profile value with a leftover {{…}} -> exit 2" --profile "$T.prof/p.json" "$T"
# shipped core example + shipped Laravel profile without browser_smoke (light and --full)
python3 -c "import json,sys;c=json.load(open(sys.argv[1]));c.pop('stack_profile',None);c.pop('stack-profile',None);json.dump(c,open('slice-method.json','w'))" "$ROOT/docs/slice-lane/examples/slice-method.example.json"
git commit -qam shipped >/dev/null
python3 -c "import json,sys;p=json.load(open(sys.argv[1]));del p['placeholders']['browser_smoke'];json.dump(p,open(sys.argv[2],'w'))" "$ROOT/stacks/laravel/profile.json" "$T.prof/laravel-no-smoke.json"
gate_case 2 "core example + laravel profile minus browser_smoke -> exit 2" --profile "$T.prof/laravel-no-smoke.json" "$T"
gate_case 2 "same with --full -> exit 2" --full --profile "$T.prof/laravel-no-smoke.json" "$T"
printf '{ "stack": "node-example", "profile_version": "1.0.0", "placeholders": { "test_command": "npm test --silent", "boundary_check": "true", "standards_check": "scripts/standards-check.sh {tree}", "browser_smoke": "npm run smoke" } }\n' > "$T.prof/node-no-stan.json"
gate_case 2 "core example + node profile minus static_analysis -> exit 2" --profile "$T.prof/node-no-stan.json" "$T"
echo "test-gate: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
