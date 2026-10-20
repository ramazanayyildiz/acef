#!/bin/bash
# Self-test for gate.sh: PASS, FAIL, full_only SKIP, {port} without GATE_PORT -> INCOMPLETE (exit 3), dirty refusal,
# untracked non-ignored files refused (ACEF-FIX-02), {{placeholder}} expansion from a stack profile (--profile and "stack_profile"), undefined placeholder refused.
# ACEF-FIX-03: a gate that ran no command is FAIL, never PASS; a command whose output says zero tests ran is FAIL unless
# it carries "allow_empty": true (a JSON boolean); the profile's gate.zero_tests_patterns extend the core pattern.
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
# ---- ACEF-FIX-02: untracked, non-ignored files make the tree dirty ----
echo x > stray.txt
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 2 "untracked file refused"
out=$(GATE_PORT=41001 "$HERE/gate.sh" --allow-dirty "$T" 2>/dev/null); check "$?" 0 "--allow-dirty runs with an untracked file"
printf '%s\n' "$out" | tail -n 1 | grep -q '^GATE PASS [0-9a-f]\{7\}+dirty ' && check 1 1 "untracked file tags the summary +dirty" || check 0 1 "untracked file tags the summary +dirty"
rm stray.txt
mkdir -p .tmp/other && echo x > .tmp/other/ignored.txt
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 0 "ignored untracked file is not dirty"
git rm -q --cached .gitignore && rm .gitignore && git commit -qm "no gitignore" && rm -rf .tmp
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 0 "first run without .gitignore passes"
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 0 "second run: the gate's own logs (.tmp/gate) do not make the tree dirty"
echo x > .tmp/stray.txt
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 2 "untracked file next to the gate's log dir is still refused"
rm -rf .tmp && printf '.tmp/\n' > .gitignore && git add .gitignore && git commit -qm "gitignore back"
# R1 (PR #3 review): a submodule's "ignore" setting must not hide untracked content from the dirty check
mkdir "$T.sub" && ( cd "$T.sub" && git init -q -b main && git config user.email t@t && git config user.name t && echo s > s.txt && git add -A && git commit -qm s )
git -c protocol.file.allow=always submodule add -q "$T.sub" sub >/dev/null 2>&1
git config -f .gitmodules submodule.sub.ignore all && git add -A && git commit -qm sub
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 0 "clean tree with a submodule passes"
echo x > sub/stray.txt
GATE_PORT=41001 "$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 2 "untracked file inside a submodule with ignore=all refused"
rm sub/stray.txt && git rm -q -f sub && rm -rf .git/modules/sub "$T.sub" && git commit -qm "no sub"
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
# ---- R2 (Codex): control characters and malformed braces ----
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "touch %s/ran", "nul": "\\u0000", "ctl": "true\\u0007" } }\n' "$T.prof" > "$T.prof/c.json"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{nul}}'}]"
gate_case 2 "profile value that is a NUL byte -> exit 2" --profile "$T.prof/c.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{ctl}}'}]"
gate_case 2 "profile value with a control character -> exit 2" --profile "$T.prof/c.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'{{{test_command}}}'}]"
gate_case 2 "triple braces {{{key}}} -> exit 2" --profile "$T.prof/c.json" "$T"
smj "c['gate']['commands']=[{'name':'a','run':'{{test_command}}'},{'name':'b','run':'echo {{test_command}}}'}]"
gate_case 2 "unbalanced closing braces -> exit 2" --profile "$T.prof/c.json" "$T"
# ---- Control fields must match the schema, never Python truthiness/coercion ----
for value in "'false'" 0 None '[]'; do
    smj "c['gate']={'commands':[{'name':'a','run':'touch $T.prof/ran'},{'name':'must-fail','run':'false','full_only':$value}]}"
    gate_case 2 "non-boolean full_only $value refused before execution" "$T"
done
for value in "'false'" 0 None; do
    smj "c['gate']={'require_clean_tree':$value,'commands':[{'name':'a','run':'touch $T.prof/ran'}]}"
    gate_case 2 "non-boolean require_clean_tree $value refused" "$T"
done
for value in "'5'" True 0 -1 1.5 None; do
    smj "c['gate']={'commands':[{'name':'a','run':'touch $T.prof/ran'},{'name':'b','run':'true','timeout_s':$value}]}"
    gate_case 2 "invalid timeout_s $value refused before execution" "$T"
done
for value in "'Bad'" "'.'" "'x\\r'" "'x\\x00'" 7; do
    smj "c['gate']={'commands':[{'name':'a','run':'touch $T.prof/ran'},{'name':$value,'run':'true'}]}"
    gate_case 2 "invalid name $value refused before execution" "$T"
done
smj "c['gate']={'commands':[{'name':'a','run':'touch $T.prof/ran','full_ony':True}]}"
gate_case 2 "misspelled command control field refused" "$T"
smj "c['gate']={'require_clean_tre':True,'commands':[{'name':'a','run':'touch $T.prof/ran'}]}"
gate_case 2 "misspelled gate control field refused" "$T"
smj "c['gate']={'require_clean_tree':False,'commands':[{'name':'must-fail','run':'false','full_only':False,'timeout_s':1}]}"
gate_case 1 "valid false boolean runs failing command" "$T"
# ---- ACEF-FIX-03: zero commands ran / zero tests executed ----
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "touch %s/ran" } }\n' "$T.prof" > "$T.prof/z.json"
smj "c['gate']={'commands':[{'name':'tests','run':'{{test_command}}','full_only':True}]}"
out=$(env -u SLICE_STACK_PROFILE "$HERE/gate.sh" --profile "$T.prof/z.json" "$T" 2>&1); rc=$?
check "$rc" 1 "light gate whose every command is full_only (nothing ran) -> FAIL exit 1 (was GATE PASS pass=0)"
printf '%s\n' "$out" | tail -n 1 | grep -q '^GATE FAIL .* pass=0 fail=0 ' && check 1 1 "summary says GATE FAIL pass=0 fail=0" || check 0 1 "summary says GATE FAIL pass=0 fail=0"
smj "c['gate']={'commands':[{'name':'tests','run':'echo No tests executed!'}]}"
out=$("$HERE/gate.sh" "$T" 2>&1); rc=$?
check "$rc" 1 "command printing 'No tests executed!' with exit 0 -> FAIL"
printf '%s\n' "$out" | grep -q '^FAIL tests .*zero tests' && check 1 1 "FAIL line says zero tests" || check 0 1 "FAIL line says zero tests"
smj "c['gate']={'commands':[{'name':'tests','run':'echo No tests executed!','allow_empty':True}]}"
"$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 0 "same command with allow_empty: true -> PASS"
smj "c['gate']={'commands':[{'name':'tests','run':'{{test_command}}','allow_empty':'true'}]}"
gate_case 2 "allow_empty given as the string \"true\" -> exit 2" --profile "$T.prof/z.json" "$T"
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "echo 0 specs run" }, "gate": { "zero_tests_patterns": ["^0 specs run$"] } }\n' > "$T.prof/zt.json"
smj "c['gate']={'commands':[{'name':'tests','run':'{{test_command}}'}]}"
"$HERE/gate.sh" --profile "$T.prof/zt.json" "$T" >/dev/null 2>&1; check "$?" 1 "stack profile gate.zero_tests_patterns match -> FAIL"
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "touch %s/ran" }, "gate": { "zero_tests_patterns": ["foo("] } }\n' "$T.prof" > "$T.prof/zbad.json"
gate_case 2 "invalid zero_tests_patterns regex -> exit 2" --profile "$T.prof/zbad.json" "$T"
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "touch %s/ran" }, "gate": { "zero_tests_patterns": "No tests" } }\n' "$T.prof" > "$T.prof/zstr.json"
gate_case 2 "zero_tests_patterns that is not a list -> exit 2" --profile "$T.prof/zstr.json" "$T"
# ---- R1 of PR #4: combined zero-tests ERE, lone {port} skip, ANSI inside the phrase ----
printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": { "test_command": "touch %s/ran" }, "gate": { "zero_tests_patterns": ["(zero) \\\\1"] } }\n' "$T.prof" > "$T.prof/zback.json"
smj "c['gate']={'commands':[{'name':'tests','run':'{{test_command}}'}]}"
gate_case 2 "patterns valid alone but invalid combined (backreference) -> exit 2 (was: zero-tests check off, GATE PASS)" --profile "$T.prof/zback.json" "$T"
smj "c['gate']={'commands':[{'name':'smoke','run':'echo {port}'}]}"
out=$(env -u GATE_PORT "$HERE/gate.sh" "$T" 2>&1); rc=$?
check "$rc" 3 "only command skipped for a missing GATE_PORT -> INCOMPLETE exit 3 (documented skip)"
printf '%s\n' "$out" | tail -n 1 | grep -q '^GATE INCOMPLETE .* pass=0 fail=0 skip=1 ' && check 1 1 "summary says GATE INCOMPLETE skip=1" || check 0 1 "summary says GATE INCOMPLETE skip=1"
smj "c['gate']={'commands':[{'name':'tests','run':'printf \"No tests \\\\033[33mexecuted!\\\\033[0m\\\\n\"'}]}"
"$HERE/gate.sh" "$T" >/dev/null 2>&1; check "$?" 1 "ANSI colour inside 'No tests executed!' -> still FAIL"
# shipped core example + every shipped adapter profile without browser_smoke (light and --full)
python3 -c "import json,sys;c=json.load(open(sys.argv[1]));c.pop('stack_profile',None);c.pop('stack_profile',None);json.dump(c,open('slice-method.json','w'))" "$ROOT/docs/slice-lane/examples/slice-method.example.json"
git commit -qam shipped >/dev/null
for sp in "$ROOT"/stacks/*/profile.json; do   # every shipped adapter profile, minus one key the core example uses
    st=$(basename "$(dirname "$sp")")
    python3 -c "import json,sys;p=json.load(open(sys.argv[1]));p['placeholders'].pop('browser_smoke',None);json.dump(p,open(sys.argv[2],'w'))" "$sp" "$T.prof/$st-no-smoke.json"
    gate_case 2 "core example + shipped $st profile minus browser_smoke -> exit 2" --profile "$T.prof/$st-no-smoke.json" "$T"
    gate_case 2 "same with --full -> exit 2" --full --profile "$T.prof/$st-no-smoke.json" "$T"
done
printf '{ "stack": "node-example", "profile_version": "1.0.0", "placeholders": { "test_command": "npm test --silent", "boundary_check": "true", "standards_check": "scripts/standards-check.sh {tree}", "browser_smoke": "npm run smoke" } }\n' > "$T.prof/node-no-stan.json"
gate_case 2 "core example + node profile minus static_analysis -> exit 2" --profile "$T.prof/node-no-stan.json" "$T"
echo "test-gate: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
