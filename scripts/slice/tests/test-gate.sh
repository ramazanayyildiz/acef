#!/bin/bash
# Self-test for gate.sh: PASS, FAIL, full_only SKIP, {port} without GATE_PORT -> INCOMPLETE (exit 3), dirty refusal.
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
echo "test-gate: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
