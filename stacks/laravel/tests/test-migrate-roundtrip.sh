#!/bin/bash
# Self-test for {{migrate_roundtrip}} (review checklist C9) in profile.json: it must roll back ONLY the migrations its
# own `migrate` applied (`migrate:rollback --step=<n>`), never an earlier batch; with nothing applied it must not roll
# back at all and must not report success. Runs the profile value with `sh -c` in a throwaway app that has the
# profile's "files" copied in, against a fake `php` (artisan migrate:status / migrate / migrate:rollback) — no
# database, no Laravel install. (ACEF-FIX-02)
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd -P)    # stacks/laravel
ROOT=$(cd "$HERE/../.." && pwd -P)           # acef root
T=$(mktemp -d "${TMPDIR:-/tmp}/sm-mig.XXXXXX"); trap 'rm -rf "$T"' EXIT
ok=0; bad=0
check() { if [ "$1" = "$2" ]; then echo "ok   $3"; ok=$((ok+1)); else echo "FAIL $3 (got $1, want $2)"; bad=$((bad+1)); fi; }
mkdir -p "$T/bin" "$T/app"
# fake php: state file "<name> <batch>" per line (batch 0 = pending); no state file = no migrations table yet
cat > "$T/bin/php" <<'F'
#!/bin/bash
S=$FAKE_STATE; L=$FAKE_LOG
[ "$1" = artisan ] || exit 64; shift
echo "$*" >> "$L"
case "$1" in
  migrate:status)
    [ -f "$S.table" ] || { echo "   ERROR  Migration table not found."; exit 1; }
    E=""; [ "${FAKE_ANSI:-0}" = 1 ] && case " $* " in *" --no-ansi "*) ;; *) E=$'\033[32m';; esac
    echo "  Migration name .............................................. Batch / Status"
    while read -r n b; do
      if [ "$b" -gt 0 ]; then echo "  $n ..................................... [$b] ${E}Ran${E:+$'\033[39m'}"; else echo "  $n ..................................... ${E}Pending${E:+$'\033[39m'}"; fi
    done < "$S";;
  migrate)
    touch "$S.table"; m=$(awk '$2>m{m=$2} END{print m+0}' "$S")
    awk -v nb=$((m+1)) -v sp="${FAKE_SPLIT:-0}" '{ if ($2==0) { $2=nb; if (sp) nb++ } print }' "$S" > "$S.new" && mv "$S.new" "$S";;
  migrate:rollback) :;;
  *) exit 64;;
esac
F
chmod +x "$T/bin/php"
# the app gets every adapter file the profile maps into it (e.g. a helper script under scripts/)
python3 -I - "$HERE/profile.json" "$ROOT" "$T/app" <<'PY'
import json, os, shutil, sys
p = json.load(open(sys.argv[1], encoding="utf-8"))
for src, dst in (p.get("files") or {}).items():
    if "<" in dst: continue
    os.makedirs(os.path.dirname(os.path.join(sys.argv[3], dst)) or ".", exist_ok=True)
    shutil.copy2(os.path.join(sys.argv[2], src), os.path.join(sys.argv[3], dst))
PY
RUN=$(python3 -I -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["placeholders"]["migrate_roundtrip"])' "$HERE/profile.json")
roundtrip() { # <state lines> <table exists 0|1> [args to the placeholder...] -> rc; log in $T/log
    local st=$1 tb=$2; shift 2
    printf '%s' "$st" > "$T/state"; rm -f "$T/state.table" "$T/log"; [ "$tb" = 1 ] && touch "$T/state.table"
    ( cd "$T/app" && PATH="$T/bin:$PATH" FAKE_STATE="$T/state" FAKE_LOG="$T/log" sh -c "$RUN \"\$@\"" sh "$@" ) >/dev/null 2>&1
}
rb() { grep '^migrate:rollback' "$T/log" 2>/dev/null | tr '\n' ';'; }
roundtrip $'old_a 1\nold_b 1\nold_c 2\nnew_x 0\n' 1; rc=$?
check "$rc" 0 "earlier batches + 1 pending -> round trip passes"
check "$(rb)" "migrate:rollback --no-ansi --step=1;" "rolls back only the 1 migration it applied (--step=1), not batch 2"
roundtrip $'old_a 1\nnew_x 0\nnew_y 0\n' 1
check "$(rb)" "migrate:rollback --no-ansi --step=2;" "2 pending -> --step=2"
roundtrip $'new_x 0\nnew_y 0\nnew_z 0\n' 0; rc=$?
check "$rc" 0 "no migrations table yet -> passes"
check "$(rb)" "migrate:rollback --no-ansi --step=3;" "no migrations table yet -> --step=3 (everything this run applied)"
roundtrip $'old_a 1\nold_b 2\n' 1; rc=$?
[ "$rc" -ne 0 ]; check "$?" 0 "nothing pending -> non-zero (the round trip did not happen)"
check "$(rb)" "" "nothing pending -> no rollback at all"
# ---- R1 (PR #3 review): arguments, forced colour, schema dump ----
roundtrip $'old_a 1\nnew_x 0\n' 1 --database=testing; rc=$?
check "$rc" 0 "--database=testing -> round trip passes"
n=$(grep -c . "$T/log"); m=$(grep -c -- '--database=testing' "$T/log")
check "$m" "$n" "--database=testing reaches every artisan call (status, migrate, rollback)"
check "$(rb)" "migrate:rollback --no-ansi --database=testing --step=1;" "rollback on the given connection, --step=1"
roundtrip $'old_a 1\nnew_x 0\n' 1 --database=testing --force --path=database/migrations/x; rc=$?
check "$rc" 0 "--force and --path pass through"
grep -q '^migrate --no-ansi --database=testing --force --path=database/migrations/x$' "$T/log"; check "$?" 0 "migrate gets --database, --force, --path"
grep -q '^migrate:rollback --no-ansi --database=testing --force --path=database/migrations/x --step=1$' "$T/log"; check "$?" 0 "rollback gets --database, --force, --path"
for arg in --step=2 --batch=1 --seed --pretend testing; do
    roundtrip $'old_a 1\nnew_x 0\n' 1 $arg; rc=$?
    check "$rc" 2 "argument $arg refused (exit 2)"
    [ -s "$T/log" ]; check "$?" 1 "argument $arg: no artisan call"
done
FAKE_ANSI=1 roundtrip $'old_a 1\nnew_x 0\n' 1; rc=$?
check "$rc" 0 "forced colour (no --no-ansi -> ANSI) still parses"
grep -v -- '--no-ansi' "$T/log" | grep -q .; check "$?" 1 "every artisan call has --no-ansi"
mkdir -p "$T/app/database/schema" && : > "$T/app/database/schema/mysql-schema.sql"
roundtrip $'new_x 0\n' 0; rc=$?
check "$rc" 3 "no migrations table + a schema dump -> exit 3 (dump rows would be counted)"
grep -q '^migrate\( \|$\)' "$T/log" 2>/dev/null; check "$?" 1 "schema dump case: migrate never runs"
roundtrip $'old_a 1\nnew_x 0\n' 1; check "$?" 0 "schema dump + existing migrations table -> normal round trip"
rm -rf "$T/app/database"
FAKE_SPLIT=1 roundtrip $'old_a 1\nnew_x 0\nnew_y 0\n' 1; rc=$?
check "$rc" 3 "new rows in more than one batch -> exit 3"
check "$(rb)" "" "new rows in more than one batch -> no rollback"
echo "test-migrate-roundtrip: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
