#!/usr/bin/env python3
"""
classify_risk.py — Take parse_class.py output and produce a formatted
Risk Profile document ready for test-generator consumption.

Usage:
    python classify_risk.py <parsed.json> [options]
    python classify_risk.py payment_parsed.json
    python classify_risk.py payment_parsed.json --out risk_profile.md
    python classify_risk.py payment_parsed.json --format json

Can also run parse_class automatically:
    python classify_risk.py --parse app/Services/PaymentService.php
    python classify_risk.py --parse app/Services/PaymentService.php --out risk_profile.md
"""

import json
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path


# ─── Tier config ──────────────────────────────────────────────────────────────

TIER_EMOJI = {
    "CRITICAL": "🚨",
    "HIGH":     "🔴",
    "MEDIUM":   "🟡",
    "LOW":      "🟢",
}

TIER_MIN_TESTS = {
    "CRITICAL": "all branches + all side effects + refactor flag",
    "HIGH":     "all branches + all side effects",
    "MEDIUM":   "4 minimum (happy + 2 failure + 1 edge)",
    "LOW":      "2 minimum (happy + 1 failure)",
}

DEPENDENCY_TYPE = {
    # Laravel facades / classes
    "Illuminate\\Database":     "DB",
    "Illuminate\\Queue":        "QUEUE",
    "Illuminate\\Events":       "EVENT",
    "Illuminate\\Mail":         "MAIL",
    "Illuminate\\Http\\Client": "HTTP",
    "Illuminate\\Cache":        "CACHE",
    "Illuminate\\Filesystem":   "FILESYSTEM",
    "Illuminate\\Notifications":"MAIL",
    "Stripe":                   "PAYMENT",
    "PayPal":                   "PAYMENT",
    # Generic
    "Repository":               "DB",
    "Service":                  "SERVICE",
    "Client":                   "HTTP",
    "Mailer":                   "MAIL",
    "Queue":                    "QUEUE",
    "Cache":                    "CACHE",
    "Storage":                  "FILESYSTEM",
    "Notification":             "MAIL",
}

WHAT_TO_FAKE = {
    "DB_WRITE":   "Use `RefreshDatabase` trait",
    "DB_READ":    "Use factories / seeders in setUp()",
    "QUEUE":      "`Queue::fake()` in setUp()",
    "EVENT":      "`Event::fake()` in setUp()",
    "MAIL":       "`Mail::fake()` in setUp()",
    "HTTP":       "`Http::fake([...])` in setUp()",
    "CACHE":      "`Cache::spy()` or in-memory cache driver",
    "FILESYSTEM": "`Storage::fake()` in setUp()",
    "SESSION":    "`$this->withSession([...])`",
    "PAYMENT":    "Mock payment gateway / inject mock client",
}


# ─── Risk Profile renderer ────────────────────────────────────────────────────

def render_markdown(data: dict) -> str:
    class_name = data["class_name"]
    fqn = data.get("fqn", class_name)
    file_path = data.get("file", "")
    class_tier = data.get("class_tier", "MEDIUM")
    methods = data.get("methods", [])
    global_se = data.get("global_side_effects", [])
    global_fakes = data.get("global_fakes_needed", [])
    constructor_deps = data.get("constructor_dependencies", [])

    lines = []

    # Header
    lines.append(f"# Risk Profile: {class_name}")
    lines.append(f"")
    lines.append(f"**File:** `{file_path}`  ")
    lines.append(f"**FQN:** `{fqn}`  ")
    lines.append(f"**Class tier:** {TIER_EMOJI[class_tier]} {class_tier}  ")
    lines.append(f"**Minimum tests:** {TIER_MIN_TESTS[class_tier]}")
    lines.append(f"")

    # Dependencies
    lines.append(f"## Dependencies")
    lines.append(f"")
    if constructor_deps:
        for dep in constructor_deps:
        # Classify the dependency
            dep_type = "SERVICE"
            for pattern, dtype in DEPENDENCY_TYPE.items():
                if pattern.lower() in dep.lower():
                    dep_type = dtype
                    break
            lines.append(f"- `{dep}` → **{dep_type}**")
    else:
        lines.append(f"- None detected (pure class or uses static calls)")
    lines.append(f"")

    # Global setUp block
    if global_fakes:
        lines.append(f"## Global setUp()")
        lines.append(f"")
        lines.append(f"The following fakes/mocks must be initialized **before all tests** in this class:")
        lines.append(f"")
        for se_type in global_se:
            fake = WHAT_TO_FAKE.get(se_type, f"mock {se_type}")
            lines.append(f"- `{se_type}` → {fake}")
        lines.append(f"")

    # Per-method risk profiles
    lines.append(f"## Method Risk Profiles")
    lines.append(f"")

    # Sort by complexity score descending
    sorted_methods = sorted(methods, key=lambda m: m["complexity_score"], reverse=True)

    for method in sorted_methods:
        name = method["name"]
        tier = method["complexity_tier"]
        score = method["complexity_score"]
        branches = method.get("branches", [])
        side_effects = method.get("side_effects", [])
        preconditions = method.get("preconditions", [])
        params = method.get("params", "")
        line = method.get("line_start", 0)

        lines.append(f"### `{name}({params})`")
        lines.append(f"")
        lines.append(f"**Tier:** {TIER_EMOJI[tier]} {tier} (score: {score})  ")
        lines.append(f"**Line:** {line}  ")
        lines.append(f"**Min tests:** {_min_tests_for_tier(tier, len(branches), len(side_effects))}")
        lines.append(f"")

        # Branches
        if branches:
            lines.append(f"**Branches** ({len(branches)}):")
            lines.append(f"")
            for b in branches:
                lines.append(f"- `[{b['id']}]` {b['type']} — {b['description']}")
            lines.append(f"")

        # Side effects
        if side_effects:
            lines.append(f"**Side Effects** ({len(side_effects)}):")
            lines.append(f"")
            for se in side_effects:
                lines.append(f"- `[{se['id']}]` **{se['type']}** — {se['description']}")
                lines.append(f"  Assert with: `{se['needs_fake']}`")
            lines.append(f"")

        # Preconditions
        if preconditions:
            lines.append(f"**Preconditions / Guards** ({len(preconditions)}):")
            lines.append(f"")
            for p in preconditions:
                lines.append(f"- `[{p['id']}]` {p['description']}")
            lines.append(f"")

        # Test checklist for this method
        lines.append(f"**Test checklist:**")
        lines.append(f"")
        checklist = _build_checklist(name, tier, branches, side_effects, preconditions)
        for item in checklist:
            lines.append(f"- [ ] {item}")
        lines.append(f"")

        if tier == "CRITICAL":
            lines.append(f"> ⚠️ **CRITICAL**: Consider refactoring before testing.")
            lines.append(f"> Extract sub-methods or use Extract Class to reduce complexity.")
            lines.append(f"")

        lines.append("---")
        lines.append(f"")

    # Summary table
    lines.append(f"## Summary Table")
    lines.append(f"")
    lines.append(f"| Method | Tier | Branches | Side Effects | Min Tests |")
    lines.append(f"|--------|------|----------|--------------|-----------|")
    for method in sorted_methods:
        emoji = TIER_EMOJI[method["complexity_tier"]]
        min_t = _min_tests_count(method["complexity_tier"],
                                  method["branch_count"],
                                  method["side_effect_count"])
        lines.append(
            f"| `{method['name']}` | {emoji} {method['complexity_tier']} "
            f"| {method['branch_count']} | {method['side_effect_count']} | {min_t} |"
        )
    lines.append(f"")

    return "\n".join(lines)


def _min_tests_for_tier(tier: str, branch_count: int, se_count: int) -> str:
    if tier == "CRITICAL":
        return f"{branch_count + se_count}+ (all branches + effects) — consider refactor"
    elif tier == "HIGH":
        return f"{max(branch_count + se_count, 4)} (all branches + effects)"
    elif tier == "MEDIUM":
        return "4 (happy + 2 failure + 1 edge)"
    return "2 (happy + 1 failure)"


def _min_tests_count(tier: str, branch_count: int, se_count: int) -> int:
    if tier in ("CRITICAL", "HIGH"):
        return max(branch_count + se_count, 4)
    elif tier == "MEDIUM":
        return 4
    return 2


def _build_checklist(name: str, tier: str, branches: list, side_effects: list, preconditions: list) -> list:
    items = []

    # Always: happy path
    items.append(f"`test_{name}_succeeds()` — happy path, assert return value")

    # Precondition violations
    for p in preconditions:
        items.append(f"`test_{name}_fails_when_precondition_violated()` — [{p['id']}]")

    # Per-branch
    for b in branches:
        if b["type"] in ("if", "elseif", "match", "switch"):
            items.append(f"`test_{name}_handles_{b['id']}_branch()` — [{b['id']}] {b['type']}")
        elif b["type"] in ("catch",):
            items.append(f"`test_{name}_handles_exception()` — [{b['id']}] exception path")
        elif b["type"] in ("throw", "assert"):
            items.append(f"`test_{name}_throws_when_invalid()` — [{b['id']}]")

    # Per-side-effect
    for se in side_effects:
        if se["type"] == "QUEUE":
            items.append(f"`test_{name}_dispatches_job()` — [{se['id']}] assert job pushed")
        elif se["type"] == "EVENT":
            items.append(f"`test_{name}_fires_event()` — [{se['id']}] assert event dispatched")
        elif se["type"] == "MAIL":
            items.append(f"`test_{name}_sends_mail()` — [{se['id']}] assert mail sent")
        elif se["type"] == "HTTP":
            items.append(f"`test_{name}_calls_external_api()` — [{se['id']}] assert HTTP called")
        elif se["type"] == "DB_WRITE":
            items.append(f"`test_{name}_persists_to_database()` — [{se['id']}] assertDatabaseHas")
        elif se["type"] == "FILESYSTEM":
            items.append(f"`test_{name}_stores_file()` — [{se['id']}] Storage::assertExists")

    # HIGH/CRITICAL: also test no-side-effect case (rollback/failure)
    if tier in ("HIGH", "CRITICAL") and side_effects:
        items.append(f"`test_{name}_does_not_persist_on_failure()` — assert side effects NOT triggered")

    return items


# ─── JSON renderer ────────────────────────────────────────────────────────────

def render_json(data: dict) -> dict:
    """Return a structured Risk Profile as JSON (for machine consumption)."""
    methods = data.get("methods", [])

    profile = {
        "class_name": data["class_name"],
        "fqn": data.get("fqn", ""),
        "file": data.get("file", ""),
        "class_tier": data.get("class_tier", "MEDIUM"),
        "global_side_effects": data.get("global_side_effects", []),
        "global_fakes_needed": data.get("global_fakes_needed", []),
        "constructor_dependencies": data.get("constructor_dependencies", []),
        "methods": [],
    }

    for m in sorted(methods, key=lambda x: x["complexity_score"], reverse=True):
        profile["methods"].append({
            "name": m["name"],
            "params": m.get("params", ""),
            "line_start": m.get("line_start", 0),
            "complexity_tier": m["complexity_tier"],
            "complexity_score": m["complexity_score"],
            "branch_count": m["branch_count"],
            "side_effect_count": m["side_effect_count"],
            "precondition_count": m["precondition_count"],
            "branches": m.get("branches", []),
            "side_effects": m.get("side_effects", []),
            "preconditions": m.get("preconditions", []),
            "min_tests": _min_tests_count(
                m["complexity_tier"],
                m["branch_count"],
                m["side_effect_count"]
            ),
            "test_checklist": _build_checklist(
                m["name"],
                m["complexity_tier"],
                m.get("branches", []),
                m.get("side_effects", []),
                m.get("preconditions", []),
            ),
        })

    return profile


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Produce a Risk Profile from parse_class.py output."
    )
    parser.add_argument("parsed_json", nargs="?", help="JSON file from parse_class.py")
    parser.add_argument(
        "--parse", metavar="SOURCE_FILE",
        help="Auto-run parse_class.py on this file first"
    )
    parser.add_argument("--out", default=None, help="Output file path (.md or .json)")
    parser.add_argument(
        "--format", choices=["markdown", "json"], default="markdown",
        help="Output format (default: markdown)"
    )
    args = parser.parse_args()

    # Auto-parse mode
    if args.parse:
        scripts_dir = Path(__file__).parent
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf:
            tmp = tf.name
        subprocess.run(
            [sys.executable, str(scripts_dir / "parse_class.py"), args.parse, "--out", tmp],
            check=True
        )
        data = json.loads(Path(tmp).read_text())
        Path(tmp).unlink(missing_ok=True)

    elif args.parsed_json:
        data = json.loads(Path(args.parsed_json).read_text())

    else:
        parser.print_help()
        sys.exit(1)

    # Render
    if args.format == "json":
        output = json.dumps(render_json(data), indent=2, ensure_ascii=False)
    else:
        output = render_markdown(data)

    if args.out:
        Path(args.out).write_text(output, encoding="utf-8")
        print(f"Risk Profile → {args.out}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
