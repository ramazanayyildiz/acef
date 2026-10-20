#!/bin/bash
# migrate-roundtrip.sh — the Laravel adapter's {{migrate_roundtrip}} (review checklist C9). Copied into the app as
# scripts/migrate-roundtrip.sh (profile.json "files"); run from the app root.
#
# Runs `php artisan migrate`, then rolls back ONLY what that run applied: `php artisan migrate:rollback --step=<n>`,
# n = "Ran" rows in `migrate:status` after minus before (no migrations table yet counts as 0). A bare
# `migrate:rollback` undoes the LAST BATCH, which is an earlier slice's batch when this run applied nothing — that
# is what this script exists to prevent. Laravel rolls back by batch, then name, newest first, and one `migrate`
# puts everything it applied in one new batch, so the newest n rows are exactly this run's.
# Needs the two-column `migrate:status` output ("... [<batch>] Ran" / "... Pending": Laravel 10+, later 9.x); the older
#   table output is refused (exit 1), never counted as 0.
# Exit: 0 migrated and rolled back n >= 1 migrations; 1 a step failed; 3 nothing was applied (the slice's migrations
#   already ran on this database: run C9 on a database at the base branch's schema) — no rollback, never a pass.
# Env: PHP_BIN (default php).
set -u
PHP=${PHP_BIN:-php}
ran() { # number of "Ran" rows; 0 when the migrations table does not exist yet
    local out rc
    out=$("$PHP" artisan migrate:status 2>&1); rc=$?
    if [ "$rc" -ne 0 ]; then
        printf '%s\n' "$out" | grep -qi 'migration table not found' && { echo 0; return 0; }
        printf 'migrate:status failed (exit %s):\n%s\n' "$rc" "$out" >&2; return 1
    fi
    printf '%s\n' "$out" | grep -qE '(Ran|Pending)[[:space:]]*$|No migrations found' || {
        printf 'migrate:status output not understood (two-column output, Laravel 10+, expected):\n%s\n' "$out" >&2; return 1; }
    printf '%s\n' "$out" | grep -cE '[[:space:]]Ran[[:space:]]*$' || true
}
BEFORE=$(ran) || exit 1
"$PHP" artisan migrate || { echo "migrate failed" >&2; exit 1; }
AFTER=$(ran) || exit 1
N=$((AFTER - BEFORE))
if [ "$N" -le 0 ]; then
    echo "migrate_roundtrip: migrate applied nothing (Ran $BEFORE -> $AFTER); nothing rolled back. C9 needs the slice's migrations pending." >&2
    exit 3
fi
echo "migrate_roundtrip: migrate applied $N; rolling back exactly $N (--step=$N)"
"$PHP" artisan migrate:rollback --step="$N" || { echo "migrate:rollback --step=$N failed" >&2; exit 1; }
