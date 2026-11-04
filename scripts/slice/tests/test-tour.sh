#!/bin/bash
# Self-test for tour.py check (owner decision 2026-11-05; method/SLICE_LANE.md step 3b). Every case starts from a valid
# record and changes one thing, so each FAIL comes from the rule it names.
#   N  not applicable: a reason the reviewer confirmed passes; no reason, an unavailable environment, or no reviewer
#      confirmation fails
#   A  applicable: a good report passes, before acceptance (slice says "required", the review names the report) and at
#      closeout (closing note names it); a missing or empty report fails; the review must name the same report
#   S  stale: the report's candidate differs from HEAD -> FAIL, unless the review carries a "Tour impact:" note
#   D  every finding has a disposition; FINDINGS: n matches the table
#   B  an open blocker fails; a fixed (sha) or rejected blocker passes
#   C  incomplete coverage, a missing binding line, a web tour without 390 fail
#   U  usage errors exit 2
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # scripts/slice
S="$HERE/tour.py"
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-tour.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
has() { printf '%s\n' "$1" | grep -qF -- "$2" && check 1 1 "$3" || check 0 1 "$3"; }
tour() { python3 -I "$S" "$@"; }

R="$T/repo"; mkdir -p "$R" && cd "$R" && git init -q -b main && git config user.email t@t && git config user.name t
mkdir -p docs/slices/evidence/DEMO-03/tour src
echo one > src/app.txt && git add src && git commit -qm base
BASE=$(git rev-parse HEAD)
echo two >> src/app.txt && git commit -qam candidate
CAND=$(git rev-parse HEAD)
SL=docs/slices/DEMO-03.md; RV=docs/slices/DEMO-03-review.md; RP=docs/slices/evidence/DEMO-03/tour/report.md

report() { # [coverage] [viewports] [findings-n]
cat > "$RP" <<EOF
GÖREV: TAMAMLANDI
FINDINGS: ${3:-2}
Mode: slice
Candidate: ${CAND:0:12} · Base: ${BASE:0:12}
Executor: tour-model · session t-1
Environment: lane worktree · port 18001 · db demo_testing_03
Persona: Ofis yöneticisi
Viewports: ${2:-1280×800, 390×844}
Off-happy-path: double submit on the save button
Coverage: ${1:-complete}

| id | önem | genişlik | yer | adımlar | beklenen | gerçek | ekran görüntüsü |
|---|---|---|---|---|---|---|---|
| T1 | low | 390 | list | open list | fits | overflows | t1.png |
| T2 | high | 1280 | form | save twice | one record | two records | t2.png |

## Not reached
yok
EOF
}
slice() { # <Tour value>
cat > "$SL" <<EOF
# DEMO-03 — fixture
Durum: KAPANDI
Tour: required — task completion changes

## Kapanış notu (koordinatör, 2026-11-05)
- Karar: PASS
- Tour: $1 · Tur-dk: kurulum 4 · tur 9 · triyaj 3
EOF
}
review() { # <T2 row> [extra line]
cat > "$RV" <<EOF
# DEMO-03 bağımsız inceleme
Karar: **PASS**
Tour report: $RP
${2:-}

| Tur bulgusu | Durum | Blok | Çözüm |
|---|---|---|---|
| T1 | confirmed | hayır | backlog B9 |
$1
EOF
}
GOOD_T2="| T2 | confirmed | evet | düzeltildi ${CAND:0:9} |"
fresh() { report; slice "$RP"; review "$GOOD_T2"; }

# ---- A applicable ----
fresh
out=$(tour check "$SL" 2>&1); check "$?" 0 "A1 applicable, good report, closeout -> PASS"
has "$out" "TOUR-CHECK PASS" "A1 summary line"
cat > "$SL" <<EOF
# DEMO-03 — fixture
Tour: required — task completion changes
EOF
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "A2 before acceptance: slice says required, the review names the report -> PASS"
fresh; rm "$RP"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A3 missing report -> FAIL"; has "$out" "report missing" "A3 names the reason"
fresh; : > "$RP"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A4 empty report -> FAIL"; has "$out" "report empty" "A4 names the reason"
fresh; sed -i.bak '/^Tour report:/d' "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A5 review does not name the report -> FAIL"; has "$out" "review does not name" "A5 names the reason"
fresh; slice "docs/slices/evidence/OTHER/report.md"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A6 closing note and review name different reports -> FAIL"; has "$out" "different" "A6 names the reason"
fresh; printf '%s\n' '```' "Tour: $RP" '```' >> "$SL"; sed -i.bak "s#^- Tour: .*#- Tour: not applicable: <gerekçe>#" "$SL"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A7 a Tour line inside a fence is ignored (the placeholder above it counts)"

# ---- N not applicable ----
fresh; slice "not applicable: copy-only refactor, no decision impact"; review "$GOOD_T2" "Tour exemption: confirmed — copy-only refactor"
sed -i.bak '/^Tour report:/d' "$RV"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "N1 not applicable with a reason the reviewer confirmed -> PASS"
sed -i.bak '/^Tour exemption:/d' "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N2 exemption without reviewer confirmation -> FAIL"; has "$out" "not confirmed" "N2 names the reason"
fresh; slice "not applicable: "; review "$GOOD_T2" "Tour exemption: confirmed — none"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N3 exemption without a reason -> FAIL"; has "$out" "without a reason" "N3 names the reason"
fresh; slice "not applicable: test environment unavailable"; review "$GOOD_T2" "Tour exemption: confirmed — env down"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N4 unavailable environment is not an exemption -> FAIL"; has "$out" "incomplete coverage" "N4 names the reason"
fresh; sed -i.bak '/^- Tour:/d; /^Tour:/d' "$SL"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N5 no Tour line -> FAIL"; has "$out" "no Tour line" "N5 names the reason"

# ---- S stale ----
fresh; echo three >> src/app.txt && git commit -qam later
out=$(tour check "$SL" 2>&1); check "$?" 1 "S1 report candidate is not HEAD -> FAIL"; has "$out" "stale" "S1 names the reason"
review "$GOOD_T2" "Tour impact: later commit touches only src/app.txt line 3, not the toured form"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "S2 stale with a Tour impact note -> PASS"
review "$GOOD_T2"
tour check "$SL" --head "$CAND" >/dev/null 2>&1; check "$?" 0 "S3 --head <reviewed sha> at closeout -> PASS"
git reset -q --hard "$CAND"

# ---- D dispositions ----
fresh; review "$GOOD_T2"; sed -i.bak '/^| T1 /d' "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "D1 finding without a disposition -> FAIL"; has "$out" "T1 has no disposition" "D1 names the finding"
fresh; review "| T2 | maybe | hayır | — |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "D2 unknown disposition -> FAIL"; has "$out" "T2" "D2 names the finding"
fresh; report complete "1280×800, 390×844" 3
out=$(tour check "$SL" 2>&1); check "$?" 1 "D3 FINDINGS: n differs from the table -> FAIL"; has "$out" "FINDINGS" "D3 names the reason"
fresh; cat > "$T/r2.md" <<EOF
# DEMO-03 (r2)
| Tur bulgusu | Durum | Blok | Çözüm |
|---|---|---|---|
| T2 | rejected | evet | — |
EOF
review "| T2 | confirmed | evet | açık |"
tour check "$SL" --review "$RV" --review "$T/r2.md" >/dev/null 2>&1; check "$?" 0 "D4 a later round's disposition overrides the earlier one"

# ---- B blockers ----
fresh; review "| T2 | confirmed | evet | açık |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "B1 open blocker -> FAIL"; has "$out" "T2 is an unresolved blocker" "B1 names the finding"
fresh; review "| T2 | needs_validation | evet | açık |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "B2 needs_validation blocker stays blocking -> FAIL"
fresh; review "| T2 | rejected | evet | — |"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "B3 rejected blocker -> PASS"
fresh; review "| T2 | confirmed | evet | düzeltildi |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "B4 'fixed' without a sha is not resolved -> FAIL"

# ---- C coverage and bindings ----
fresh; report "incomplete — stopped at 15 min before the adverse attempt"
out=$(tour check "$SL" 2>&1); check "$?" 1 "C1 incomplete coverage -> FAIL"; has "$out" "coverage incomplete" "C1 names the reason"
fresh; sed -i.bak '/^Persona:/d' "$RP"
out=$(tour check "$SL" 2>&1); check "$?" 1 "C2 missing persona line -> FAIL"; has "$out" "Persona" "C2 names the binding"
fresh; sed -i.bak 's/^Executor: .*/Executor: <model>/' "$RP"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "C3 a placeholder binding -> FAIL"
fresh; report complete "1280×800"
out=$(tour check "$SL" 2>&1); check "$?" 1 "C4 web tour without 390 -> FAIL"; has "$out" "390" "C4 names the reason"
fresh; report complete "native: phone simulator"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "C5 native viewport (simulator adapter) -> PASS"
fresh; sed -i.bak '/^## Not reached/,$d' "$RP"
out=$(tour check "$SL" 2>&1); check "$?" 1 "C6 no Not reached section -> FAIL"; has "$out" "Not reached" "C6 names the reason"

# ---- U usage ----
tour >/dev/null 2>&1; check "$?" 2 "U1 no command -> 2"
tour check >/dev/null 2>&1; check "$?" 2 "U2 no file -> 2"
tour check "$T/nope.md" >/dev/null 2>&1; check "$?" 2 "U3 unreadable file -> 2"
fresh; tour check "$SL" --bogus x >/dev/null 2>&1; check "$?" 2 "U4 unknown option -> 2"

echo "test-tour: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
