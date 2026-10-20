#!/bin/bash
# method_version in slice-method.schema.json accepts semver with optional prerelease/build, rejects partial versions;
# every shipped slice-method example must satisfy the schema's pattern.
set -u
ROOT=$(cd "$(dirname "$0")/../../.." && pwd -P)
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
m() { python3 -I - "$ROOT/schemas/slice-method.schema.json" "$1" <<'PY'
import json, re, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))["properties"]["method_version"]["pattern"]
sys.exit(0 if re.search(p, sys.argv[2]) else 1)
PY
}
for v in 0.1.1 3.0.0-beta 3.0.0-beta.1 3.0.0+build.5 3.0.0-rc.1+sha.abc; do m "$v"; check "$?" 0 "accepts $v"; done
for v in 3.0 3 v3.0.0 3.0.0- 3.0.0-beta_1 ""; do m "$v"; check "$?" 1 "rejects '$v'"; done
for f in docs/slice-lane/examples/slice-method.example.json stacks/*/examples/slice-method.example.json; do
    v=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["method_version"])' "$ROOT/$f")
    m "$v"; check "$?" 0 "$f method_version '$v' matches schema"
    check "$v" "3.0.0-beta" "$f ships 3.0.0-beta"
done
echo "$ok ok, $bad failed"; [ "$bad" -eq 0 ]
