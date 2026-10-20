#!/bin/bash
# Self-test for the Laravel adapter wiring: profile.json fills the four core placeholders, stacks/laravel/gate.sh
# expands them through the core gate in a throwaway app, and the example slice-method.json names the profile.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # stacks/laravel
ROOT=$(cd "$HERE/../.." && pwd -P)           # acef root
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-prof.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
python3 -I - "$HERE/profile.json" "$ROOT/schemas/stack-profile.schema.json" <<'PY'
import json, sys
p = json.load(open(sys.argv[1], encoding="utf-8")); s = json.load(open(sys.argv[2], encoding="utf-8"))
need = s["properties"]["placeholders"]["required"]
missing = [k for k in need if not isinstance(p["placeholders"].get(k), str) or not p["placeholders"][k]]
extra = [k for k in p if k not in s["properties"]]
sys.exit(1 if missing or extra or p["stack"] != "laravel" else 0)
PY
check "$?" 0 "profile.json fills test_command, static_analysis, boundary_check, standards_check"
python3 -I -c 'import json,sys; c=json.load(open(sys.argv[1])); sys.exit(0 if c.get("stack_profile") else 1)' "$HERE/examples/slice-method.example.json"
check "$?" 0 "example slice-method.json sets stack_profile"
# throwaway app: fake phpunit/phpstan so the placeholders run without a real Laravel install
cd "$T" && git init -q -b main && git config user.email t@t && git config user.name t
printf '.tmp/\n' > .gitignore
mkdir -p vendor/bin && printf '<?php exit(0);\n' > vendor/bin/phpunit && printf '<?php exit(1);\n' > vendor/bin/phpstan
cat > slice-method.json <<'J'
{ "method_version": "0.1.0", "project": "t", "slices_dir": "docs/slices",
  "gate": { "commands": [ { "name": "tests", "run": "{{test_command}}" }, { "name": "stan", "run": "{{static_analysis}}", "full_only": true } ] } }
J
git add .gitignore slice-method.json vendor && git commit -qm base
env -u SLICE_STACK_PROFILE "$HERE/gate.sh" "$T" >/dev/null; check "$?" 0 "laravel gate expands {{test_command}} -> php vendor/bin/phpunit"
env -u SLICE_STACK_PROFILE "$HERE/gate.sh" --full "$T" >/dev/null; check "$?" 1 "laravel gate expands {{static_analysis}} (fake phpstan exits 1)"
echo "test-profile: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
