#!/bin/bash
# Self-test for tour.py check (owner decision 2026-11-05; method/SLICE_LANE.md step 3b). Every case starts from a valid
# record and changes one thing, so each FAIL comes from the rule it names.
#   N  not applicable: a reason the current review confirmed passes; no reason, an unavailable environment, no
#      confirmation, or a confirmation only in an earlier round fails
#   A  applicable: a good report passes, before acceptance (slice says "required", the review names the report) and at
#      closeout (closing note names it); a missing or empty report fails; the current review must name the same report
#   V  the current review round's verdict must read PASS (REVISE, none, or disagreeing lines fail)
#   S  the tree checked is HEAD (no --head): a code change after the tour candidate fails unless an impact note names
#      the current HEAD (in the current review or the closing note); an obsolete note fails; docs/evidence-only
#      changes pass with a printed note
#   D  every finding has a disposition in the current round; earlier rounds count only after "Tour dispositions:
#      carried forward"; FINDINGS: n matches the table; a replacement report named by the current round passes
#   BL an open blocker fails; a fixed (sha) or rejected blocker passes; malformed rows (placeholder or unknown blok,
#      missing or blank çözüm) fail, and a malformed later row never restores an earlier valid one
#   E  a screenshot/trace a finding row names must exist
#   C  incomplete coverage, a missing binding line, a web tour without 390 fail
#   F  a backtick fence whose info string has a backtick is not a fence (CommonMark)
#   U  usage errors exit 2 (including the removed --head)
#   M  metrics.py: the fixture's tour (required, completed, dispositions with carry-forward, minutes, escapes with
#      measured/unknown counts); fenced examples do not count; unmeasured escapes are "doğrulanmadı", not 0
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
echo one > src/app.js && git add src && git commit -qm base
BASE=$(git rev-parse HEAD)
echo two >> src/app.js && git commit -qam candidate
CAND=$(git rev-parse HEAD)
SL=docs/slices/DEMO-03.md; RV=docs/slices/DEMO-03-review.md; RP=docs/slices/evidence/DEMO-03/tour/report.md
RV2=docs/slices/DEMO-03-review-r2.md

report() { # [coverage] [viewports] [findings-n]
touch docs/slices/evidence/DEMO-03/tour/t1.png docs/slices/evidence/DEMO-03/tour/t2.png
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
| T2 | high | 1280 | form | save twice | one record | two records | \`t2.png\` |

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
review() { # <T2 row> [extra line] [verdict]
cat > "$RV" <<EOF
# DEMO-03 bağımsız inceleme
Karar: **${3:-PASS}**
Tour report: $RP
${2:-}

| Tur bulgusu | Durum | Blok | Çözüm |
|---|---|---|---|
| T1 | confirmed | hayır | backlog B9 |
$1
EOF
}
r2() { # <body lines...>: a round-2 review written by the same reviewer
printf '%s\n' "# DEMO-03 (r2)" "$@" > "$RV2"
}
GOOD_T2="| T2 | confirmed | evet | düzeltildi ${CAND:0:9} |"
fresh() { rm -f "$RV2"; report; slice "$RP"; review "$GOOD_T2"; }
TBL='| Tur bulgusu | Durum | Blok | Çözüm |'

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
out=$(tour check "$SL" 2>&1); check "$?" 1 "A5 review does not name the report -> FAIL"; has "$out" "does not name the tour report" "A5 names the reason"
fresh; slice "docs/slices/evidence/OTHER/report.md"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A6 closing note and review name different reports -> FAIL"; has "$out" "different" "A6 names the reason"
fresh; printf '%s\n' '```' "Tour: $RP" '```' >> "$SL"; sed -i.bak "s#^- Tour: .*#- Tour: not applicable: <gerekçe>#" "$SL"
out=$(tour check "$SL" 2>&1); check "$?" 1 "A7 a Tour line inside a fence is ignored (the placeholder above it counts)"

# ---- V current verdict ----
fresh; review "$GOOD_T2" "" REVISE
out=$(tour check "$SL" 2>&1); check "$?" 1 "V1 current verdict REVISE -> FAIL"; has "$out" "verdict is REVISE" "V1 names the reason"
fresh; sed -i.bak '/^Karar:/d' "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "V2 no verdict line -> FAIL"; has "$out" "no verdict" "V2 names the reason"
fresh; printf 'Karar: **REVISE**\n' >> "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "V3 disagreeing verdict lines -> FAIL"; has "$out" "disagree" "V3 names the reason"
fresh; review "$GOOD_T2" "" "PASS | REVISE"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "V4 an unfilled verdict -> FAIL"

# ---- N not applicable ----
fresh; slice "not applicable: copy-only refactor, no decision impact"; review "$GOOD_T2" "Tour exemption: confirmed — copy-only refactor"
sed -i.bak '/^Tour report:/d' "$RV"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "N1 not applicable with a reason the reviewer confirmed -> PASS"
r2 "Karar: **PASS**" "Review scope: narrow — fix only"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N6 exemption confirmed only in an earlier round -> FAIL"; has "$out" "not confirmed" "N6 names the reason"
rm -f "$RV2"; sed -i.bak '/^Tour exemption:/d' "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N2 exemption without reviewer confirmation -> FAIL"; has "$out" "not confirmed" "N2 names the reason"
fresh; slice "not applicable: "; review "$GOOD_T2" "Tour exemption: confirmed — none"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N3 exemption without a reason -> FAIL"; has "$out" "without a reason" "N3 names the reason"
fresh; slice "not applicable: test environment unavailable"; review "$GOOD_T2" "Tour exemption: confirmed — env down"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N4 unavailable environment is not an exemption -> FAIL"; has "$out" "incomplete coverage" "N4 names the reason"
fresh; sed -i.bak '/^- Tour:/d; /^Tour:/d' "$SL"
out=$(tour check "$SL" 2>&1); check "$?" 1 "N5 no Tour line -> FAIL"; has "$out" "no Tour line" "N5 names the reason"

# ---- S the checked tree (HEAD) vs the tour candidate ----
fresh; echo three >> src/app.js && git commit -qam later; LATER=$(git rev-parse HEAD)
out=$(tour check "$SL" 2>&1); check "$?" 1 "S1 a code change after the tour candidate, no note -> FAIL"; has "$out" "stale" "S1 names the reason"
review "$GOOD_T2" "Tour impact: ${LATER:0:10} — adds line 3 of src/app.js, not on the toured form"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "S2 impact note naming HEAD in the current review -> PASS"
review "$GOOD_T2" "Tour impact: ${CAND:0:10} — obsolete assessment"
out=$(tour check "$SL" 2>&1); check "$?" 1 "S3 impact note naming another sha (not HEAD) -> FAIL"; has "$out" "stale" "S3 names the reason"
review "$GOOD_T2"; tour check "$SL" --head "$CAND" >/dev/null 2>&1; check "$?" 2 "S3b --head <old sha> is no longer an option -> 2"
review "$GOOD_T2"; printf -- '- Tour impact: %s — coordinator closeout: line 3 only\n' "${LATER:0:10}" >> "$SL"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "S5 impact note naming HEAD in the closing note -> PASS"
git reset -q --hard "$CAND"
fresh; mkdir -p docs/notes && echo x > docs/notes/a.md && git add docs/notes && git commit -qm docsonly
out=$(tour check "$SL" 2>&1); check "$?" 0 "S4 only docs/evidence changed after the candidate -> PASS"
has "$out" "only docs/evidence paths" "S4 prints the auto-pass note"
git reset -q --hard "$CAND"

# ---- D dispositions ----
fresh; review "$GOOD_T2"; sed -i.bak '/^| T1 /d' "$RV"
out=$(tour check "$SL" 2>&1); check "$?" 1 "D1 finding without a disposition -> FAIL"; has "$out" "T1 has no disposition" "D1 names the finding"
fresh; review "| T2 | maybe | hayır | — |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "D2 unknown disposition -> FAIL"; has "$out" "T2" "D2 names the finding"
fresh; report complete "1280×800, 390×844" 3
out=$(tour check "$SL" 2>&1); check "$?" 1 "D3 FINDINGS: n differs from the table -> FAIL"; has "$out" "FINDINGS" "D3 names the reason"
fresh; review "| T2 | confirmed | evet | açık |"; r2 "$TBL" "|---|---|---|---|" "| T2 | rejected | evet | — |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "D4 an r2 without verdict and report reference does not pass"; has "$out" "no verdict" "D4 names the verdict"
has "$out" "does not name the tour report" "D4 names the report reference"
r2 "Karar: **PASS**" "Tour report: $RP" "$TBL" "|---|---|---|---|" "| T2 | rejected | evet | — |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "D5 r2 without carry-forward: T1 is not in the current round -> FAIL"; has "$out" "T1 has no disposition" "D5 names the finding"
r2 "Karar: **PASS**" "Tour report: $RP" "Tour dispositions: carried forward from r1" "$TBL" "|---|---|---|---|" "| T2 | rejected | evet | — |"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "D6 r2 with verdict, report and explicit carry-forward -> PASS (T2 overridden)"
cp "$RP" "${RP%report.md}report-r2.md"; slice "${RP%report.md}report-r2.md"
r2 "Karar: **PASS**" "Tour report: ${RP%report.md}report-r2.md" "Tour dispositions: carried forward from r1" "$TBL" "|---|---|---|---|" "| T2 | rejected | evet | — |"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "D7 a replacement report named by the current round passes (r1 named the old one)"
fresh; tour check "$SL" --review "$RV" --review "$RV" >/dev/null 2>&1; check "$?" 0 "D8 explicit --review list: the last one is the current round"

# ---- BL blockers and row shape ----
fresh; review "| T2 | confirmed | evet | açık |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "BL1 open blocker -> FAIL"; has "$out" "T2 is an unresolved blocker" "BL1 names the finding"
fresh; review "| T2 | needs_validation | evet | açık |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "BL2 needs_validation blocker stays blocking -> FAIL"
fresh; review "| T2 | rejected | evet | — |"
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "BL3 rejected blocker -> PASS"
fresh; review "| T2 | confirmed | evet | düzeltildi |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "BL4 'fixed' without a sha is not resolved -> FAIL"
fresh; review "| T2 | confirmed | <yes/no> | açık |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "BL5 placeholder blok -> FAIL"; has "$out" "T2 disposition row malformed" "BL5 names the row"
fresh; review "| T2 | confirmed | maybe | açık |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "BL6 unknown blok value -> FAIL"
fresh; review "| T2 | confirmed | hayır |  |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "BL7 blank çözüm -> FAIL"
fresh; review "| T2 | confirmed | hayır | <çözüm> |"
tour check "$SL" >/dev/null 2>&1; check "$?" 1 "BL8 placeholder çözüm -> FAIL"
fresh; r2 "Karar: **PASS**" "Tour report: $RP" "Tour dispositions: carried forward from r1" "$TBL" "|---|---|---|---|" "| T2 | confirmed | evet |"
out=$(tour check "$SL" 2>&1); check "$?" 1 "BL9 a malformed later row does not restore the earlier resolved one -> FAIL"; has "$out" "T2 disposition row malformed" "BL9 names the row"

# ---- E referenced evidence ----
fresh; rm docs/slices/evidence/DEMO-03/tour/t2.png
out=$(tour check "$SL" 2>&1); check "$?" 1 "E1 a screenshot a finding names is missing -> FAIL"; has "$out" "T2 evidence missing: t2.png" "E1 names the artifact"

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

# ---- F fences ----
fresh; python3 -I - "$RV" <<'PY'
import sys; p = sys.argv[1]; s = open(p, encoding="utf-8").read()
open(p, "w", encoding="utf-8").write(s.replace("Tour report:", "```bad`info\nTour report:", 1))
PY
tour check "$SL" >/dev/null 2>&1; check "$?" 0 "F1 a backtick fence opener with a backtick in its info string is not a fence"

# ---- U usage ----
tour >/dev/null 2>&1; check "$?" 2 "U1 no command -> 2"
tour check >/dev/null 2>&1; check "$?" 2 "U2 no file -> 2"
tour check "$T/nope.md" >/dev/null 2>&1; check "$?" 2 "U3 unreadable file -> 2"
fresh; tour check "$SL" --bogus x >/dev/null 2>&1; check "$?" 2 "U4 unknown option -> 2"

# ---- M metrics ----
FX="$HERE/tests/fixtures/slices"
out=$(python3 -I "$HERE/metrics.py" --no-git "$FX" --label fixture 2>&1); check "$?" 0 "M1 metrics.py on the fixture exits 0"
has "$out" "Tour alanı olan 1 · gerekli 1 · muaf 0 · tamamlanan (rapor var, Coverage: complete) 1" "M2 required and completed tours"
has "$out" "bulgu confirmed 1 · needs_validation 0 · rejected/tekrar 1" "M3 dispositions, the r2 round overrides r1 (carried forward)"
has "$out" "kurulum 4/1, tur 9/1, triyaj 3/1" "M4 setup/tour/triage minutes from Tur-dk"
has "$out" "sonradan kaçan hata bildiren turlu dilim 0/1 ölçülen (bilinmeyen 0)" "M5 later escapes: slices reporting / measured, unknown"
MS="$T/ms"; mkdir -p "$MS/evidence/XM-01/tour"
cat > "$MS/XM-01.md" <<'EOF'
# XM-01 — fixture
Durum: KAPANDI

## Kapanış notu (koordinatör, 2026-11-05)
- Karar: PASS
- Tour: evidence/XM-01/tour/report.md · Tur-dk: kurulum ölçülmedi · tur ölçülmedi · triyaj ölçülmedi
EOF
printf '%s\n' "FINDINGS: 0" '```' "Coverage: complete" '```' "Coverage: incomplete — stopped" > "$MS/evidence/XM-01/tour/report.md"
printf '%s\n' "Karar: **PASS**" "Tour report: evidence/XM-01/tour/report.md" '~~~' "$TBL" "| T1 | confirmed | hayır | — |" '~~~' > "$MS/XM-01-review.md"
out=$(python3 -I "$HERE/metrics.py" --no-git "$MS" --label ms 2>&1); check "$?" 0 "M6 metrics.py on fenced examples exits 0"
has "$out" "tamamlanan (rapor var, Coverage: complete) 0" "M7 a fenced Coverage: complete does not count"
has "$out" "bulgu confirmed 0" "M8 a fenced disposition row does not count"
has "$out" "sonradan kaçan hata bildiren turlu dilim doğrulanmadı (ölçülen 0, bilinmeyen 1)" "M9 no Kaçan-hata field -> doğrulanmadı, not 0"

echo "test-tour: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
