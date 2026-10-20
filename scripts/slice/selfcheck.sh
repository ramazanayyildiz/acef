#!/bin/bash
# selfcheck.sh [--scan-only] [--stack <name>]... — the Slice lane's own gate. Exit 0 only when every check that ran passed.
#
# Core checks (always): bash -n and python compile of scripts/slice · every core JSON parses · templates carry their
#   placeholders and required sections · slice.md <= 150 lines · core self-tests (scripts/slice/tests) · metrics.py
#   on the bundled fixture · the neutrality scan (below).
# Stack checks, per adapter stacks/<name>/ (bash -n, JSON, php -l or other syntax checks, stacks/<name>/tests): run only
#   when every command in its profile.json "selfcheck": {"requires": [...]} answers "<cmd> --version" with exit 0;
#   otherwise the adapter prints "SKIP stack <name> (missing: …)" and does not fail the run. --stack <name> forces the
#   adapter's checks (a missing prerequisite then FAILS). A Node-only machine therefore passes without php.
# Neutrality scan: the core (method/SLICE_LANE.md, templates/slice, schemas, docs/slice-lane, scripts/slice) names no
#   stack, tool of a stack, or source project — words: source project names, laravel, livewire, php, phpunit, phpstan,
#   blade, eloquent, octane, artisan, composer — and carries no source-project identifiers (backlog ids B7/B27/B28/B40,
#   the CACHE_DRIVER/CACHE_STORE example, source ports 8127–8139). Allowed: docs/slice-lane/SOURCES.md (provenance),
#   the adoption guide's "## Laravel profile" section, this file and its own test. Every {{key}} the adoption guide
#   names must be used by a core template or the core example. --scan-only runs just the scan.
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)   # acef repo root (this file: scripts/slice/selfcheck.sh)
cd "$ROOT" || exit 2
SCAN_ONLY=0; FORCE=" "
while [ $# -gt 0 ]; do
    case "$1" in
        --scan-only) SCAN_ONLY=1; shift;;
        --stack) [ $# -ge 2 ] || { echo "usage: selfcheck.sh [--scan-only] [--stack <name>]..." >&2; exit 2; }
                 [ -d "stacks/$2" ] || { echo "no such stack: stacks/$2" >&2; exit 2; }
                 FORCE="$FORCE$2 "; shift 2;;
        *) echo "usage: selfcheck.sh [--scan-only] [--stack <name>]..." >&2; exit 2;;
    esac
done
ok=0; bad=0
pass() { printf 'ok   %s\n' "$1"; ok=$((ok + 1)); }
fail() { printf 'FAIL %s\n' "$1"; bad=$((bad + 1)); }

# ---------------------------------------------------------------- neutrality scan (core)
WORDS='jakomeet|b2press|rebuild|unusualspace|us-crm|laravel|livewire|(^|[^a-z])php([^a-z]|$)|phpunit|phpstan|blade|eloquent|octane|artisan|composer'
IDS='(^|[^A-Za-z0-9-])B(7|27|28|40)([^0-9]|$)|CACHE_DRIVER|CACHE_STORE|(^|[^0-9])81(2[7-9]|3[0-9])([^0-9]|$)'
CORE="method/SLICE_LANE.md templates/slice schemas docs/slice-lane scripts/slice"
# shellcheck disable=SC2086
LEAKS=$(grep -rnIiE "$WORDS|$IDS" $CORE --exclude=SOURCES.md --exclude=adoption.md --exclude=selfcheck.sh --exclude=test-selfcheck.sh)
ADOPT=$(awk -v f=docs/slice-lane/adoption.md '/^## /{s=($0=="## Laravel profile")} !s{print f ":" NR ":" $0}' docs/slice-lane/adoption.md \
    | grep -iE "$WORDS|$IDS")
[ -z "$LEAKS$ADOPT" ] && pass "core names no stack, stack tool, or source project" || {
    fail "core names a stack, stack tool, or source project"; printf '%s\n' "$LEAKS" "$ADOPT" | sed '/^$/d; s/^/    /'; }
UNUSED=""
for k in $(grep -oE '\{\{[a-z0-9_]+\}\}' docs/slice-lane/adoption.md | sort -u); do
    grep -rqF -- "$k" templates/slice docs/slice-lane/examples || UNUSED="$UNUSED$(grep -nF -- "$k" docs/slice-lane/adoption.md | sed 's#^#docs/slice-lane/adoption.md:#')
"
done
[ -z "$UNUSED" ] && pass "adoption guide names only placeholders the core uses" || {
    fail "adoption guide names a placeholder no core template or example uses"; printf '%s' "$UNUSED" | sed 's/^/    /'; }
if [ "$SCAN_ONLY" = 1 ]; then
    echo "SELFCHECK $([ "$bad" -eq 0 ] && echo PASS || echo FAIL) ok=$ok fail=$bad (scan only)"
    [ "$bad" -eq 0 ]; exit $?
fi

# ---------------------------------------------------------------- core checks
for f in scripts/slice/*.sh scripts/slice/tests/*.sh; do
    [ -f "$f" ] || continue
    bash -n "$f" 2>/dev/null && pass "bash -n $f" || fail "bash -n $f"
done
for f in scripts/slice/*.py; do
    python3 -I -c 'import sys; compile(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1], "exec")' "$f" && pass "python compile $f" || fail "python compile $f"
done
json_ok() { python3 -I -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$1" 2>/dev/null && pass "json $1" || fail "json $1"; }
for f in schemas/slice-*.json schemas/stack-profile.schema.json docs/slice-lane/examples/*.json; do [ -f "$f" ] && json_ok "$f"; done

need() { # <file> <literal>...
    local f=$1; shift
    for s in "$@"; do grep -Fq -- "$s" "$f" && pass "$f has '$s'" || fail "$f missing '$s'"; done
}
need templates/slice/slice.md '<SLICE-ID>' '## Standart uyumu' 'Kullanım taraması' '## Boyut ve derinlik' '## İzinli dosyalar' '### Ekler (koordinatör, tarihli)' '## Kabul maddeleri' 'Mutasyonlar' '## Kapanış notu'
n=$(wc -l <templates/slice/slice.md | tr -d ' '); [ "$n" -le 150 ] && pass "templates/slice/slice.md $n <= 150 lines" || fail "templates/slice/slice.md $n > 150 lines"
need templates/slice/dev-report.md '<SLICE-ID>' '## Kırmızı-önce kanıtı' '## İnceleme öncesi öz-denetim' '## Mutasyonlar'
need templates/slice/review-brief.md '<SLICE-ID>' 'review-checklist.md' 'iddiaları doğrula' '<paket-öneki>' 'TAM eki' 'needs_validation' 'Etiket adayı' 'her kural için 3–5 mutasyon' 'para ve göç dilimlerinde ZORUNLU' 'LICENSES/security-audit-MIT.txt'
[ -f LICENSES/security-audit-MIT.txt ] && grep -q 'Copyright (c) 2025-2026 Cloudflare, Inc.' LICENSES/security-audit-MIT.txt && pass "LICENSES/security-audit-MIT.txt present" || fail "LICENSES/security-audit-MIT.txt missing"
need docs/slice-lane/SOURCES.md 'LICENSES/security-audit-MIT.txt' '/Users/ramazanayyildiz/CODE/Ram/live-learning' 'Adoption status at import'
need templates/slice/review-checklist.md '## A —' '## B —' '## C —' '## D —' '## E —' 'scrollWidth <= 390'
need templates/slice/review-r2.md '<SLICE-ID>' 'Ayrı oturum' 'git diff <önceki-sha> <yeni-sha>'
need templates/slice/closing-note.md 'Süre-geliştirme-dk:' 'Süre-inceleme-dk:' 'REVISE-turu:' 'Kaçan-hata:' 'Etiket adayı:'
need templates/slice/invariants-skeleton.md '**Kural**' '**Kaynak**' '**Nasıl sınanır**' '**Sabitleyen testler**' 'I<n>'
need templates/slice/locks.md '<SLICE-ID>'
need templates/slice/module-CLAUDE.md '<Modül>' '## Hard rules' '## Error codes' '{{boundary_check}}'
need templates/slice/slice.md '{{test_command}}' '{{static_analysis}}' '{{boundary_check}}' '{{standards_check}}'
need schemas/slice-method.schema.json '"stack_profile"'
need docs/slice-lane/adoption.md '## Adopt in a new stack' '## Laravel profile'
need templates/slice/exploration-tour.md 'FINDINGS: <n>' '390×844'

run_test() { local out; out=$("$1" 2>&1) && pass "$1" || { fail "$1"; printf '%s\n' "$out" | grep -v '^ok ' | sed 's/^/    /'; }; }
for t in scripts/slice/tests/test-*.sh; do [ -f "$t" ] && run_test "$t"; done

out=$(python3 -I scripts/slice/metrics.py --no-git scripts/slice/tests/fixtures/slices --backlog scripts/slice/tests/fixtures/slices/backlog.md --label fixture 2>&1); rc=$?
[ "$rc" -eq 0 ] && pass "metrics.py fixture exit 0" || fail "metrics.py fixture exit $rc"
printf '%s\n' "$out" | grep -q '^| DEMO-01 | KAPANDI | TAM | var | 2 | 1 | REVISE | PASS | 40 (not) | 25 (not) | yok |$' && pass "metrics.py DEMO-01 row" || fail "metrics.py DEMO-01 row"
printf '%s\n' "$out" | grep -q '^| P01-DEMO-02 | .* | 2 | 1 | PASS | REVISE (son inceleme) |' && pass "metrics.py evidence reviews + prompt skipped" || fail "metrics.py evidence reviews"
printf '%s\n' "$out" | grep -q 'aday: B1' && pass "metrics.py escaped candidate" || fail "metrics.py escaped candidate"

# ---------------------------------------------------------------- stack checks (per adapter)
for d in stacks/*/; do
    s=$(basename "$d"); [ -f "$d/profile.json" ] || { fail "stacks/$s has no profile.json"; continue; }
    REQ=$(python3 -I -c 'import json,sys; print(" ".join(((json.load(open(sys.argv[1], encoding="utf-8")).get("selfcheck") or {}).get("requires")) or []))' "$d/profile.json" 2>/dev/null) \
        || { fail "stacks/$s/profile.json unreadable"; continue; }
    MISSING=""
    for c in $REQ; do command -v "$c" >/dev/null 2>&1 && "$c" --version >/dev/null 2>&1 </dev/null || MISSING="$MISSING $c"; done
    case "$FORCE" in *" $s "*) FORCED=1;; *) FORCED=0;; esac
    if [ -n "$MISSING" ] && [ "$FORCED" = 0 ]; then
        printf 'SKIP stack %s (missing:%s; pass --stack %s to force)\n' "$s" "$MISSING" "$s"; continue
    fi
    [ -z "$MISSING" ] || fail "stack $s forced but prerequisites missing:$MISSING"
    for f in "$d"*.sh "$d"tests/*.sh; do [ -f "$f" ] || continue; bash -n "$f" 2>/dev/null && pass "bash -n ${f#./}" || fail "bash -n ${f#./}"; done
    for f in "$d"*.json "$d"examples/*.json "$d"standards/*.json; do [ -f "$f" ] && json_ok "${f#./}"; done
    for f in "$d"*.php; do [ -f "$f" ] || continue; php -l "$f" >/dev/null 2>&1 && pass "php -l ${f#./}" || fail "php -l ${f#./}"; done
    for t in "$d"tests/test-*.sh; do [ -f "$t" ] && run_test "${t#./}"; done
done

echo "SELFCHECK $([ "$bad" -eq 0 ] && echo PASS || echo FAIL) ok=$ok fail=$bad"
[ "$bad" -eq 0 ]
