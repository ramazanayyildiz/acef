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
    echo "  Migration name .............................................. Batch / Status"
    while read -r n b; do
      if [ "$b" -gt 0 ]; then echo "  $n ..................................... [$b] Ran"; else echo "  $n ..................................... Pending"; fi
    done < "$S";;
  migrate)
    touch "$S.table"; m=$(awk '$2>m{m=$2} END{print m+0}' "$S")
    awk -v nb=$((m+1)) '{ if ($2==0) $2=nb; print }' "$S" > "$S.new" && mv "$S.new" "$S";;
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
roundtrip() { # <state lines> <table exists 0|1> -> rc; log in $T/log
    printf '%s' "$1" > "$T/state"; rm -f "$T/state.table" "$T/log"; [ "$2" = 1 ] && touch "$T/state.table"
    ( cd "$T/app" && PATH="$T/bin:$PATH" FAKE_STATE="$T/state" FAKE_LOG="$T/log" sh -c "$RUN" ) >/dev/null 2>&1
}
rb() { grep '^migrate:rollback' "$T/log" 2>/dev/null | tr '\n' ';'; }
roundtrip $'old_a 1\nold_b 1\nold_c 2\nnew_x 0\n' 1; rc=$?
check "$rc" 0 "earlier batches + 1 pending -> round trip passes"
check "$(rb)" "migrate:rollback --step=1;" "rolls back only the 1 migration it applied (--step=1), not batch 2"
roundtrip $'old_a 1\nnew_x 0\nnew_y 0\n' 1
check "$(rb)" "migrate:rollback --step=2;" "2 pending -> --step=2"
roundtrip $'new_x 0\nnew_y 0\nnew_z 0\n' 0; rc=$?
check "$rc" 0 "no migrations table yet -> passes"
check "$(rb)" "migrate:rollback --step=3;" "no migrations table yet -> --step=3 (everything this run applied)"
roundtrip $'old_a 1\nold_b 2\n' 1; rc=$?
[ "$rc" -ne 0 ]; check "$?" 0 "nothing pending -> non-zero (the round trip did not happen)"
check "$(rb)" "" "nothing pending -> no rollback at all"
echo "test-migrate-roundtrip: ok=$ok fail=$bad"; [ "$bad" -eq 0 ]
