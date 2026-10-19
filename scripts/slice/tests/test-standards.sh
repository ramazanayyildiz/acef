#!/bin/bash
# Self-test for standards-check.sh: a new violation must FAIL, an untouched legacy violation must only WARN,
# a counter above baseline must FAIL. Works in a throwaway git repo under $TMPDIR.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-std.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
cd "$T" && git init -q -b main && git config user.email t@t && git config user.name t
mkdir -p app/Livewire scripts/standards
cat > scripts/standards/rules.json <<'J'
{ "scope": ["app"],
  "line_checks": [ { "id": "GATE-LW1", "mode": "added", "pattern": "DB::transaction", "paths": ["app/Livewire"], "label": "x" } ],
  "counters": [ { "id": "GATE-APP", "pattern": "(^|[^A-Za-z0-9_])app\\(", "paths": ["app"], "label": "app(" } ] }
J
printf 'GATE-APP=1\n' > scripts/standards/baseline.txt
printf '<?php\nDB::transaction(fn() => 1);\n$x = app(Foo::class);\n' > app/Livewire/Legacy.php
git add -A && git commit -qm base
git checkout -qb work
printf '<?php\n// touched\n' > app/Livewire/Other.php; git add -A; git commit -qm touch
out=$(STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T"); rc=$?
check "$rc" 0 "legacy violation only WARNs"
printf '%s\n' "$out" | grep -q '^WARN GATE-LW1 app/Livewire/Legacy.php:2' && check 1 1 "legacy line reported as WARN" || check 0 1 "legacy line reported as WARN"
printf '<?php\nDB::transaction(fn() => 2);\n' > app/Livewire/New.php
out=$(STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T"); rc=$?
check "$rc" 1 "new violation FAILs (untracked file)"
rm app/Livewire/New.php
printf '<?php\n$y = app(Bar::class);\n' > app/Livewire/More.php
out=$(STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T"); rc=$?
check "$rc" 1 "counter above baseline FAILs"
out=$("$HERE/standards-check.sh" --print-baseline "$T"); check "$out" "GATE-APP=2" "--print-baseline measures"
# ---- command counters: a missing tool must FAIL, never count 0 (METHOD-01 review F2) ----
rm -f app/Livewire/More.php
printf 'GATE-APP=1\nGATE-STAN=5\n' > scripts/standards/baseline.txt
git add -A; git commit -qm stan-baseline
stan_rules() { # <json object for the command counter>
    printf '{ "scope": ["app"], "counters": [ { "id": "GATE-APP", "pattern": "(^|[^A-Za-z0-9_])app[(]", "paths": ["app"], "label": "app(" } ],\n  "command_counters": [ %s ] }\n' "$1" > scripts/standards/rules.json
}
stan_rules '{ "id": "GATE-STAN", "run": "php vendor/bin/phpstan analyse --error-format=raw", "count_regex": "\\.php:[0-9]+:", "ok_exit": [0, 1], "requires": ["vendor/bin/phpstan"], "label": "stan" }'
out=$(STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T"); rc=$?
check "$rc" 1 "phpstan missing (requires) -> rc=1"
printf '%s\n' "$out" | grep -q '^FAIL GATE-STAN required tool missing: vendor/bin/phpstan' && check 1 1 "missing tool named in FAIL line" || check 0 1 "missing tool named in FAIL line"
stan_rules '{ "id": "GATE-STAN", "run": "php vendor/bin/phpstan analyse --error-format=raw", "count_regex": "\\.php:[0-9]+:", "ok_exit": [0, 1], "label": "stan" }'
STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T" >/dev/null; check "$?" 1 "phpstan missing without requires (php: Could not open input file) -> rc=1"
stan_rules '{ "id": "GATE-STAN", "run": "no-such-tool-xyz analyse", "count_regex": "x", "label": "stan" }'
STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T" >/dev/null; check "$?" 1 "command not found -> rc=1"
stan_rules '{ "id": "GATE-STAN", "run": "sh -c \"echo a.php:1:e; exit 1\"", "count_regex": "\\.php:[0-9]+:", "label": "stan" }'
STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T" >/dev/null; check "$?" 1 "exit 1 not accepted by default ok_exit [0]"
mkdir -p vendor/bin && printf '#!/bin/sh\necho "app/A.php:3:error one"\necho "app/B.php:9:error two"\nexit 1\n' > vendor/bin/phpstan && chmod +x vendor/bin/phpstan
stan_rules '{ "id": "GATE-STAN", "run": "vendor/bin/phpstan analyse", "count_regex": "\\.php:[0-9]+:", "ok_exit": [0, 1], "requires": ["vendor/bin/phpstan"], "label": "stan" }'
out=$(STANDARDS_BASE_REF=main "$HERE/standards-check.sh" "$T"); rc=$?
check "$rc" 0 "tool present, 2 errors <= baseline 5 -> PASS"
printf '%s\n' "$out" | grep -q 'GATE-STAN count 2 (baseline 5' && check 1 1 "tool counter measured" || check 0 1 "tool counter measured"

echo "test-standards: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
