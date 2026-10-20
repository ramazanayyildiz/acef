#!/bin/bash
# ACEF-FIX-03: string booleans are refused by the schemas AND at runtime.
#   A tiny stdlib validator (type, required, properties, additionalProperties, items, minLength, minimum) checks the shipped
#   slice-method examples and stack profiles against schemas/slice-method.schema.json and schemas/stack-profile.schema.json,
#   then shows that "false" (string) in a boolean field is rejected while real booleans and "allow_empty" are accepted.
#   metrics.py refuses a string boolean in the stack profile's "metrics" block (exit 2) instead of reading "false" as true.
set -u
ROOT=$(cd "$(dirname "$0")/../../.." && pwd -P)
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-types.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
# v <schema> <json file> [python statements on d]: exit 0 valid, 1 invalid (first error on stderr)
v() { python3 -I - "$@" <<'PY'
import json, sys
schema = json.load(open(sys.argv[1], encoding="utf-8")); d = json.load(open(sys.argv[2], encoding="utf-8"))
if len(sys.argv) > 3: exec(sys.argv[3])
T = {"object": dict, "array": list, "string": str, "boolean": bool}
def ok_type(t, x):
    if t == "integer": return isinstance(x, int) and not isinstance(x, bool)
    if t == "number": return isinstance(x, (int, float)) and not isinstance(x, bool)
    return isinstance(x, T[t])
def val(s, x, p):
    t = s.get("type")
    if t and not ok_type(t, x): return f"{p}: expected {t}, got {type(x).__name__} {x!r}"
    if isinstance(x, dict):
        for r in s.get("required", []):
            if r not in x: return f"{p}: missing {r}"
        props, ap = s.get("properties", {}), s.get("additionalProperties", True)
        for k, y in x.items():
            if k in props: e = val(props[k], y, f"{p}.{k}")
            elif ap is False: e = f"{p}: unexpected {k}"
            elif isinstance(ap, dict): e = val(ap, y, f"{p}.{k}")
            else: e = None
            if e: return e
    if isinstance(x, list) and "items" in s:
        for i, y in enumerate(x):
            e = val(s["items"], y, f"{p}[{i}]")
            if e: return e
    if isinstance(x, str) and len(x) < s.get("minLength", 0): return f"{p}: shorter than minLength"
    if ok_type("number", x) and "minimum" in s and x < s["minimum"]: return f"{p}: below minimum"
    return None
e = val(schema, d, "$")
if e: print(e, file=sys.stderr); sys.exit(1)
PY
}
SM=$ROOT/schemas/slice-method.schema.json; SP=$ROOT/schemas/stack-profile.schema.json
EX=$ROOT/docs/slice-lane/examples/slice-method.example.json
for f in "$EX" "$ROOT"/stacks/*/examples/slice-method.example.json; do v "$SM" "$f"; check "$?" 0 "${f#"$ROOT"/} matches the slice-method schema"; done
for f in "$ROOT"/stacks/*/profile.json; do v "$SP" "$f"; check "$?" 0 "${f#"$ROOT"/} matches the stack-profile schema"; done
v "$SM" "$EX" "d['gate']['commands'][0]['full_only']='false'" 2>/dev/null; check "$?" 1 "schema: full_only \"false\" (string) rejected"
v "$SM" "$EX" "d['gate']['require_clean_tree']='false'" 2>/dev/null; check "$?" 1 "schema: require_clean_tree \"false\" (string) rejected"
v "$SM" "$EX" "d['gate']['commands'][0]['timeout_s']='60'" 2>/dev/null; check "$?" 1 "schema: timeout_s \"60\" (string) rejected"
v "$SM" "$EX" "d['gate']['commands'][0]['allow_empty']=True"; check "$?" 0 "schema: allow_empty true accepted"
v "$SM" "$EX" "d['gate']['commands'][0]['allow_empty']='true'" 2>/dev/null; check "$?" 1 "schema: allow_empty \"true\" (string) rejected"
P0=$ROOT/stacks/laravel/profile.json
v "$SP" "$P0" "d['gate']={'zero_tests_patterns':['^0 specs run\$']}"; check "$?" 0 "schema: profile gate.zero_tests_patterns accepted"
v "$SP" "$P0" "d['gate']={'zero_tests_patterns':'No tests'}" 2>/dev/null; check "$?" 1 "schema: profile gate.zero_tests_patterns as a string rejected"
v "$SP" "$P0" "d['metrics']['evidence_dir_strip_phase_prefix']='false'" 2>/dev/null; check "$?" 1 "schema: profile metrics.evidence_dir_strip_phase_prefix \"false\" (string) rejected"
# runtime: metrics.py
FX=$ROOT/scripts/slice/tests/fixtures/slices
prof() { printf '{ "stack": "t", "profile_version": "1.0.0", "placeholders": {}, "metrics": { "evidence_dir_strip_phase_prefix": %s } }\n' "$1" > "$T/p.json"; }
prof '"false"'; python3 -I "$ROOT/scripts/slice/metrics.py" --no-git "$FX" --profile "$T/p.json" >/dev/null 2>&1; check "$?" 2 "metrics.py: evidence_dir_strip_phase_prefix \"false\" (string) -> exit 2"
prof 'false'; python3 -I "$ROOT/scripts/slice/metrics.py" --no-git "$FX" --profile "$T/p.json" >/dev/null 2>&1; check "$?" 0 "metrics.py: evidence_dir_strip_phase_prefix false -> runs"
echo "test-schema-types: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
