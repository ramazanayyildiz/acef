#!/bin/bash
# stacks/laravel/gate.sh [gate.sh options] <tree>
#
# Laravel adapter entry point for the stack-neutral core gate (scripts/slice/gate.sh). It only adds
# --profile <this dir>/profile.json, so {{test_command}}, {{static_analysis}}, {{boundary_check}}, {{standards_check}}
# (and the other keys in profile.json) expand to the Laravel commands. Every option, placeholder rule, output line and
# exit code is the core gate's: 0 PASS, 1 FAIL, 2 usage/prerequisite, 3 INCOMPLETE.
# A later --profile on the command line, or SLICE_STACK_PROFILE, wins over this default.
# In an application the core gate is usually copied as scripts/gate.sh and slice-method.json carries
# "stack_profile": "scripts/stack-profile.json" instead; this wrapper is for running from an acef checkout.
# Env: SLICE_CORE_GATE (default <acef>/scripts/slice/gate.sh).
set -u
HERE=$(cd "$(dirname "$0")" && pwd -P)
CORE=${SLICE_CORE_GATE:-$HERE/../../scripts/slice/gate.sh}
[ -f "$CORE" ] || { printf 'core gate not found: %s (set SLICE_CORE_GATE)\n' "$CORE" >&2; exit 2; }
if [ -n "${SLICE_STACK_PROFILE:-}" ]; then exec bash "$CORE" "$@"; fi
exec bash "$CORE" --profile "$HERE/profile.json" "$@"
