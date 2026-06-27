#!/usr/bin/env sh
# ACEF process gate — pre-commit hook
#
# Checks that the active ACEF run satisfies the lean-evidence requirement before
# each commit.  Silently passes when no ACEF delivery run is in progress
# (ACEF_ACTIVE_RUN.json absent), so the hook is a no-op in non-ACEF repos.
#
# Installed via: scripts/install-acef-bmad-guard --repo <path>
# Source: claude-plugins/acef-bmad-guard/hooks/acef-precommit-gate.sh

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
ACTIVE_RUN="$REPO_ROOT/docs/ai/ACEF_ACTIVE_RUN.json"
BIN="$REPO_ROOT/.acef/bin"
VALIDATOR="$BIN/acef-process-validator"

# Skip when no ACEF delivery session is active.
[ -f "$ACTIVE_RUN" ] || exit 0

# Skip gracefully if the local validator binary is not installed yet.
[ -x "$VALIDATOR" ] || {
  echo "ACEF pre-commit: validator not found at $VALIDATOR — run install-acef-tools --repo . to install" >&2
  exit 0
}

"$VALIDATOR" --check lean-evidence --repo "$REPO_ROOT"
