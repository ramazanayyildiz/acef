#!/bin/bash
# migrate-roundtrip.sh [--database=<conn>] [--path=<path>]... [--realpath] [--force] [--schema-path=<file>]
#
# The Laravel adapter's {{migrate_roundtrip}} (review checklist C9). Copied into the app as
# scripts/migrate-roundtrip.sh (profile.json "files"); run from the app root.
#
# Runs `php artisan migrate`, then rolls back ONLY what that run applied: `php artisan migrate:rollback --step=<n>`,
# n = migrations whose batch is newer than the newest batch before the run (from `migrate:status`; no migrations table
# yet = batch 0). A bare `migrate:rollback` undoes the LAST BATCH, which is an earlier slice's batch when this run
# applied nothing — that is what this script exists to prevent. One `migrate` puts everything it applies in one new
# batch, and Laravel rolls back newest first, so the newest n rows are exactly this run's.
# Arguments (only these; anything else, including --step/--batch/--pretend/--seed, is exit 2 before any call):
#   --database=, --path=, --realpath  -> migrate:status, migrate, migrate:rollback (same connection and paths)
#   --force                           -> migrate, migrate:rollback
#   --schema-path=                    -> migrate
# Every artisan call gets --no-ansi (forced colour must not break the status parse).
# Zero "Ran" rows before the run (no migrations table, or an empty one): refused (exit 3) before `migrate` runs.
#   Laravel then loads a schema dump (database/schema/*-schema.*, --schema-path, or a configured path this script
#   cannot see) with its historical migration rows, which are not this run's and must never be rolled back.
# Needs the two-column `migrate:status` output ("... [<batch>] Ran" / "... Pending": Laravel 10+, later 9.x); the older
#   table output is refused (exit 1), never counted as 0.
# Exit: 0 migrated and rolled back n >= 1 migrations; 1 a step failed or output not understood; 2 bad argument;
#   3 the round trip did not happen: nothing was applied (the slice's migrations already ran on this database: run C9
#   on a database at the base branch's schema), zero Ran rows before the run, or the new rows span more than one batch.
# Env: PHP_BIN (default php).
set -u
PHP=${PHP_BIN:-php}
die2() { printf 'migrate-roundtrip: %s\n' "$*" >&2; exit 2; }
STATUS_ARGS=(); MIGRATE_ARGS=(); ROLLBACK_ARGS=()
for a in "$@"; do
    case "$a" in
        --database=?*|--path=?*|--realpath)
            STATUS_ARGS+=("$a"); MIGRATE_ARGS+=("$a"); ROLLBACK_ARGS+=("$a");;
        --force) MIGRATE_ARGS+=("$a"); ROLLBACK_ARGS+=("$a");;
        --schema-path=?*) MIGRATE_ARGS+=("$a");;
        --step*|--batch*) die2 "$a is not allowed: the script computes the rollback step itself";;
        *) die2 "unsupported argument: $a (allowed: --database=<conn> --path=<path> --realpath --force --schema-path=<file>)";;
    esac
done
artisan() { "$PHP" artisan "$1" --no-ansi "${@:2}"; }
STATUS=""
status() { # sets STATUS to "<batch>" per Ran row (one per line); return 2 = no migrations table yet
    local out rc
    out=$(artisan migrate:status ${STATUS_ARGS[@]+"${STATUS_ARGS[@]}"} 2>&1); rc=$?
    if [ "$rc" -ne 0 ]; then
        printf '%s\n' "$out" | grep -qi 'migration table not found' && { STATUS=""; return 2; }
        printf 'migrate:status failed (exit %s):\n%s\n' "$rc" "$out" >&2; return 1
    fi
    printf '%s\n' "$out" | grep -qE '(Ran|Pending)[[:space:]]*$|No migrations found' || {
        printf 'migrate:status output not understood (two-column output, Laravel 10+, expected):\n%s\n' "$out" >&2; return 1; }
    STATUS=$(printf '%s\n' "$out" | sed -nE 's/.*\[([0-9]+)\][[:space:]]+Ran[[:space:]]*$/\1/p')
}
maxof() { printf '%s\n' "$1" | awk 'BEGIN{m=0} $1+0>m{m=$1+0} END{print m}'; }
status; rc=$?
[ "$rc" -eq 1 ] && exit 1
if [ -z "$(printf '%s' "$STATUS" | sed '/^$/d')" ]; then
    echo "migrate_roundtrip: no migration has run on this database yet; migrate could load a schema dump whose historical rows would then be rolled back. Not running. Use a database at the base branch's schema." >&2
    exit 3
fi
BEFORE_MAX=$(maxof "$STATUS")
artisan migrate ${MIGRATE_ARGS[@]+"${MIGRATE_ARGS[@]}"} || { echo "migrate failed" >&2; exit 1; }
status || exit 1
NEW=$(printf '%s\n' "$STATUS" | awk -v b="$BEFORE_MAX" '$1+0>b' )
N=$(printf '%s\n' "$NEW" | grep -c . || true)
if [ "$N" -le 0 ]; then
    echo "migrate_roundtrip: migrate applied nothing (newest batch stays $BEFORE_MAX); nothing rolled back. C9 needs the slice's migrations pending." >&2
    exit 3
fi
if [ "$(printf '%s\n' "$NEW" | sort -u | grep -c .)" -ne 1 ]; then
    echo "migrate_roundtrip: $N new rows span more than one batch; not rolling back (inspect migrate:status)." >&2
    exit 3
fi
echo "migrate_roundtrip: migrate applied $N; rolling back exactly $N (--step=$N)"
artisan migrate:rollback ${ROLLBACK_ARGS[@]+"${ROLLBACK_ARGS[@]}"} --step="$N" || { echo "migrate:rollback --step=$N failed" >&2; exit 1; }
