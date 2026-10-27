#!/bin/bash
# Self-test for ui-copy-hints.py (method/PRODUCT_LANGUAGE.md): it only warns.
#   U1 exit 0 with hints AND without hints; exit 2 only on usage errors
#   U2 the profile's "Kafa karıştırabilecek terimler" list drives the term hints (a term removed from it -> no hint)
#   U3 --profile limits terms to one profile; placeholders "<…>" in the list are ignored
#   U4 long explanatory strings are reported; markdown/docs paths are skipped; test files are labelled
#   U5 Turkish dotted/dotless I and word-start matching (suffixes count)
#   U6 --base mode reads the git diff and the profile path from slice-method.json "user_profiles"
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # scripts/slice
S="$HERE/ui-copy-hints.py"
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-copy.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
has() { printf '%s\n' "$1" | grep -qF -- "$2" && check 1 1 "$3" || check 0 1 "$3"; }
hasnt() { printf '%s\n' "$1" | grep -qF -- "$2" && check 1 0 "$3" || check 0 0 "$3"; }

cat > "$T/users.md" <<'EOF'
# Kullanıcı profilleri — demo

## Profil: Saha satış

### Kafa karıştırabilecek terimler

- kaynak dayanaklı
- teyitsiz
- UNKNOWN
- <ör. placeholder>

### Cihaz ve bağlam

- telefon

## Profil: Muhasebe

### Kafa karıştırabilecek terimler

- mutabakat kaydı
EOF

cat > "$T/a.diff" <<'EOF'
diff --git a/ui/quote.html b/ui/quote.html
--- a/ui/quote.html
+++ b/ui/quote.html
@@ -10,0 +11,4 @@
+<p class="note">Bu fiyat kaynak dayanaklı bir tahmindir.</p>
+<span>Teyitsizdir</span>
+<span>Durum: unknown</span>
+<h2>Teklif gönder</h2>
diff --git a/ui/list.jsx b/ui/list.jsx
--- a/ui/list.jsx
+++ b/ui/list.jsx
@@ -1,0 +2,2 @@
+const help = "Bu ekran, inceleme turlarında istenen biçimde, kaynak iddiası, çıkarım, kontrollü test ve gerçek yürütme ayrı ayrı gösterilecek şekilde düzenlenmiştir ve her alan için ayrıca açıklama verilmiştir.";
+const label = "Mutabakat kaydı bekliyor";
diff --git a/docs/notes.md b/docs/notes.md
--- a/docs/notes.md
+++ b/docs/notes.md
@@ -1,0 +2,1 @@
+"teyitsiz" burada belge içinde geçer
diff --git a/tests/QuoteTest.js b/tests/QuoteTest.js
--- a/tests/QuoteTest.js
+++ b/tests/QuoteTest.js
@@ -5,0 +6,1 @@
+expect(page).toContain("teyitsiz veri");
EOF

out=$(python3 -I "$S" --diff "$T/a.diff" --profiles "$T/users.md"); rc=$?
check "$rc" 0 "U1 exit 0 with hints"
has "$out" 'WARN ui/quote.html:11 term "kaynak dayanaklı" (Saha satış)' "U2 term from the profile list, file:line"
has "$out" 'WARN ui/quote.html:12 term "teyitsiz"' "U5 'Teyitsizdir' matches 'teyitsiz' (case + suffix)"
has "$out" 'WARN ui/quote.html:13 term "UNKNOWN"' "U5 'unknown' matches 'UNKNOWN'"
hasnt "$out" 'ui/quote.html:14' "U1 plain user text gets no hint"
has "$out" 'WARN ui/list.jsx:3 term "mutabakat kaydı" (Muhasebe)' "U2 second profile's terms are read"
has "$out" 'WARN ui/list.jsx:2 long text' "U4 long explanatory string reported"
hasnt "$out" 'docs/notes.md' "U4 markdown/docs paths skipped"
has "$out" 'WARN tests/QuoteTest.js:6 (test) term "teyitsiz"' "U4 test file hint is labelled (test)"
hasnt "$out" 'placeholder' "U3 placeholder bullets ignored"
hasnt "$out" 'telefon' "U2 bullets outside the terms heading are not terms"
has "$out" 'UI-COPY-HINTS: 6 hint(s)' "summary counts hints"

out=$(python3 -I "$S" --diff "$T/a.diff" --profiles "$T/users.md" --profile Muhasebe); rc=$?
check "$rc" 0 "U3 --profile exit 0"
hasnt "$out" 'teyitsiz' "U3 --profile Muhasebe drops the other profile's terms"
has "$out" 'term "mutabakat kaydı"' "U3 --profile Muhasebe keeps its own terms"

grep -v 'teyitsiz' "$T/users.md" > "$T/users2.md"
out=$(python3 -I "$S" --diff "$T/a.diff" --profiles "$T/users2.md")
hasnt "$out" 'term "teyitsiz"' "U2 term removed from the list -> no hint"

printf '+++ b/ui/x.html\n@@ -1,0 +1,1 @@\n+<p>Teklif gönder</p>\n' > "$T/clean.diff"
out=$(python3 -I "$S" --diff "$T/clean.diff" --profiles "$T/users.md"); rc=$?
check "$rc" 0 "U1 exit 0 without hints"
has "$out" 'UI-COPY-HINTS: 0 hint(s)' "U1 zero hints reported"

printf '+++ b/ui/x.html\n@@ -1,0 +1,1 @@\n+<p>İŞLEM KAYDI</p>\n' > "$T/tr.diff"
printf '## Profil: P\n### Kafa karıştırabilecek terimler\n- işlem kaydı\n' > "$T/tr.md"
out=$(python3 -I "$S" --diff "$T/tr.diff" --profiles "$T/tr.md")
has "$out" 'term "işlem kaydı"' "U5 'İŞLEM KAYDI' matches 'işlem kaydı' (dotted/dotless I)"

python3 -I "$S" --profiles "$T/users.md" >/dev/null 2>&1; check "$?" 2 "U1 no --base/--diff -> exit 2"
python3 -I "$S" --diff "$T/a.diff" --profiles "$T/missing.md" >/dev/null 2>&1; check "$?" 2 "U1 missing --profiles file -> exit 2"
python3 -I "$S" --diff "$T/a.diff" --bogus x >/dev/null 2>&1; check "$?" 2 "U1 unknown argument -> exit 2"

# U6 git mode + slice-method.json "user_profiles"
R="$T/repo"; mkdir -p "$R/ui" "$R/docs/product"
cd "$R" && git init -q -b main && git config user.email t@t && git config user.name t
cp "$T/users.md" docs/product/users.md
printf '{ "user_profiles": "docs/product/users.md" }\n' > slice-method.json
printf '<h1>Teklifler</h1>\n' > ui/a.html; git add -A >/dev/null; git commit -qm base
printf '<h1>Teklifler</h1>\n<small>UNKNOWN kaynak</small>\n' > ui/a.html; git commit -qam change
out=$(python3 -I "$S" --repo "$R" --base HEAD~1); rc=$?
check "$rc" 0 "U6 git mode exit 0"
has "$out" 'WARN ui/a.html:2 term "UNKNOWN"' "U6 profile path read from slice-method.json"
python3 -I "$S" --repo "$R" --base no-such-ref >/dev/null 2>&1; check "$?" 2 "U6 bad ref -> exit 2"
rm slice-method.json
out=$(python3 -I "$S" --repo "$R" --base HEAD~1); rc=$?
check "$rc" 0 "U6 no profile file -> still exit 0"
has "$out" 'note: no user profile file' "U6 no profile file -> note"

echo "ui-copy-hints: ok=$ok fail=$bad"
[ "$bad" -eq 0 ]
