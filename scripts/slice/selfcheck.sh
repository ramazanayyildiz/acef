#!/bin/bash
# selfcheck.sh — the package's own gate. Exit 0 only when every check passes.
#   bash -n on every script · php -l on every PHP file · python compile (no __pycache__ written in the repo)
#   every JSON file parses · templates carry their placeholders and required sections · slice.md <= 150 lines
#   self-tests (gate, standards, boundaries) · metrics.py runs on the bundled fixture and finds the expected verdicts
set -u
ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)   # acef repo root (this file: scripts/slice/selfcheck.sh)
cd "$ROOT" || exit 2
ok=0; bad=0
pass() { printf 'ok   %s\n' "$1"; ok=$((ok + 1)); }
fail() { printf 'FAIL %s\n' "$1"; bad=$((bad + 1)); }

for f in scripts/slice/*.sh scripts/slice/tests/*.sh; do bash -n "$f" 2>/dev/null && pass "bash -n $f" || fail "bash -n $f"; done
for f in scripts/slice/*.php; do php -l "$f" >/dev/null 2>&1 && pass "php -l $f" || fail "php -l $f"; done
for f in scripts/slice/*.py; do
    python3 -I -c 'import sys; compile(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1], "exec")' "$f" && pass "python compile $f" || fail "python compile $f"
done
while IFS= read -r f; do
    python3 -I -c 'import json,sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$f" 2>/dev/null && pass "json $f" || fail "json $f"
done <<EOF2
$(ls schemas/slice-*.json docs/slice-lane/examples/*.json scripts/slice/standards/*.json 2>/dev/null)
EOF2

need() { # <file> <literal>...
    local f=$1; shift
    for s in "$@"; do grep -Fq -- "$s" "$f" && pass "$f has '$s'" || fail "$f missing '$s'"; done
}
need templates/slice/slice.md '<SLICE-ID>' '## Standart uyumu' 'Kullanım taraması' '## Boyut ve derinlik' '## İzinli dosyalar' '### Ekler (koordinatör, tarihli)' '## Kabul maddeleri' 'Mutasyonlar' '## Kapanış notu'
n=$(wc -l <templates/slice/slice.md | tr -d ' '); [ "$n" -le 150 ] && pass "templates/slice/slice.md $n <= 150 lines" || fail "templates/slice/slice.md $n > 150 lines"
need templates/slice/dev-report.md '<SLICE-ID>' '## Kırmızı-önce kanıtı' '## İnceleme öncesi öz-denetim' '## Mutasyonlar'
need templates/slice/review-brief.md '<SLICE-ID>' 'review-checklist.md' 'iddiaları doğrula' '<paket-öneki>::' 'TAM eki' 'needs_validation' 'Etiket adayı' 'her kural için 3–5 mutasyon' 'para ve göç dilimlerinde ZORUNLU' 'LICENSES/security-audit-MIT.txt'
[ -f LICENSES/security-audit-MIT.txt ] && grep -q 'Copyright (c) 2025-2026 Cloudflare, Inc.' LICENSES/security-audit-MIT.txt && pass "LICENSES/security-audit-MIT.txt present" || fail "LICENSES/security-audit-MIT.txt missing"
need docs/slice-lane/SOURCES.md 'LICENSES/security-audit-MIT.txt' '/Users/ramazanayyildiz/CODE/Ram/live-learning'
need templates/slice/review-checklist.md '## A —' '## B —' '## C —' '## D —' '## E —' 'scrollWidth <= 390' 'B28' 'B40' 'B7'
need templates/slice/review-r2.md '<SLICE-ID>' 'Ayrı oturum' 'git diff <önceki-sha> <yeni-sha>'
need templates/slice/closing-note.md 'Süre-geliştirme-dk:' 'Süre-inceleme-dk:' 'REVISE-turu:' 'Kaçan-hata:' 'Etiket adayı:'
need templates/slice/invariants-skeleton.md '**Kural**' '**Kaynak**' '**Nasıl sınanır**' '**Sabitleyen testler**' 'I<n>'
need templates/slice/locks.md '<SLICE-ID>'
need templates/slice/module-CLAUDE.md '<Modül>' '## Hard rules' '## Error codes'
need templates/slice/exploration-tour.md 'FINDINGS: <n>' '390×844'

for t in scripts/slice/tests/test-*.sh; do
    out=$("$t" 2>&1) && pass "$t" || { fail "$t"; printf '%s\n' "$out" | grep -v '^ok ' | sed 's/^/    /'; }
done

out=$(python3 -I scripts/slice/metrics.py --no-git scripts/slice/tests/fixtures/slices --backlog scripts/slice/tests/fixtures/slices/backlog.md --label fixture 2>&1); rc=$?
[ "$rc" -eq 0 ] && pass "metrics.py fixture exit 0" || fail "metrics.py fixture exit $rc"
printf '%s\n' "$out" | grep -q '^| DEMO-01 | KAPANDI | TAM | var | 2 | 1 | REVISE | PASS | 40 (not) | 25 (not) | yok |$' && pass "metrics.py DEMO-01 row" || fail "metrics.py DEMO-01 row"
printf '%s\n' "$out" | grep -q '^| P01-DEMO-02 | .* | 2 | 1 | PASS | REVISE (son inceleme) |' && pass "metrics.py evidence reviews + prompt skipped" || fail "metrics.py evidence reviews"
printf '%s\n' "$out" | grep -q 'aday: B1' && pass "metrics.py escaped candidate" || fail "metrics.py escaped candidate"
REVIEW_MODEL=x scripts/slice/codex-review.sh --dry-run templates/slice/review-brief.md /dev/null | grep -q -- "-s read-only" && pass "codex-review.sh dry-run read-only" || fail "codex-review.sh dry-run"
env -u REVIEW_MODEL SLICE_METHOD_CONFIG=/nonexistent scripts/slice/codex-review.sh --dry-run templates/slice/review-brief.md /dev/null >/dev/null 2>&1; [ $? -eq 2 ] && pass "codex-review.sh refuses without model" || fail "codex-review.sh model required"

echo "SELFCHECK $([ "$bad" -eq 0 ] && echo PASS || echo FAIL) ok=$ok fail=$bad"
[ "$bad" -eq 0 ]
