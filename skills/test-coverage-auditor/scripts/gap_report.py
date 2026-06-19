#!/usr/bin/env python3
"""
gap_report.py — Compare source map and test map to produce a prioritized
coverage audit report. Identifies untested classes, shallow tests, and
missing coverage patterns.

Usage:
    python gap_report.py <source_map.json> <test_map.json> [options]
    python gap_report.py source_map.json test_map.json
    python gap_report.py source_map.json test_map.json --out audit.json
    python gap_report.py source_map.json test_map.json --summary
    python gap_report.py source_map.json test_map.json --top 20

Can also run both scans automatically:
    python gap_report.py --scan app/ tests/
    python gap_report.py --scan app/ tests/ --summary
"""

import re
import json
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path


# ─── Risk keywords for priority scoring ──────────────────────────────────────

HIGH_RISK_KEYWORDS = re.compile(
    r"\b(?:payment|billing|subscription|auth|permission|publish|distribute|"
    r"send|notify|delete|checkout|invoice|charge|token|password|secret|"
    r"webhook|stripe|paypal)\b", re.I
)

MEDIUM_RISK_KEYWORDS = re.compile(
    r"\b(?:create|update|store|import|export|upload|download|process|"
    r"generate|calculate|validate|transform|convert|migrate)\b", re.I
)


# ─── Coverage status ─────────────────────────────────────────────────────────

STATUS_NO_TESTS   = "NO_TESTS"
STATUS_SHALLOW    = "SHALLOW"
STATUS_PARTIAL    = "PARTIAL"
STATUS_GOOD       = "GOOD"
STATUS_SKIP       = "SKIP"  # interfaces, abstract, tiny files

STATUS_EMOJI = {
    STATUS_NO_TESTS: "🔴",
    STATUS_SHALLOW:  "🟠",
    STATUS_PARTIAL:  "🟡",
    STATUS_GOOD:     "🟢",
    STATUS_SKIP:     "⚪",
}

STATUS_LABEL = {
    STATUS_NO_TESTS: "No tests",
    STATUS_SHALLOW:  "Happy path only",
    STATUS_PARTIAL:  "Partial coverage",
    STATUS_GOOD:     "Good coverage",
    STATUS_SKIP:     "Skipped (interface/abstract/tiny)",
}


# ─── Priority scoring ─────────────────────────────────────────────────────────

def priority_score(source_class: dict, test_file: dict | None, status: str) -> int:
    score = 0

    # Coverage gap weight
    gap_weight = {
        STATUS_NO_TESTS: 30,
        STATUS_SHALLOW:  20,
        STATUS_PARTIAL:  10,
        STATUS_GOOD:     0,
        STATUS_SKIP:     0,
    }
    score += gap_weight[status]

    # Complexity from source
    method_count = source_class.get("public_method_count", 0)
    line_count = source_class.get("line_count", 0)
    score += min(method_count, 10)  # cap at 10
    score += min(line_count // 50, 5)  # +1 per 50 lines, cap at 5

    # Side effects (untested side effects = high risk)
    side_effects = source_class.get("side_effects", [])
    score += len(side_effects) * 3

    # Risk from keywords in class name / path
    name = source_class.get("name", "") + " " + source_class.get("file", "")
    if HIGH_RISK_KEYWORDS.search(name):
        score += 15
    elif MEDIUM_RISK_KEYWORDS.search(name):
        score += 5

    # Risk hint from scanner
    risk_bonus = {"CRITICAL": 20, "HIGH": 10, "MEDIUM": 5, "LOW": 0}
    score += risk_bonus.get(source_class.get("risk_hint", "LOW"), 0)

    # Partial credit: if test exists but has no failure cases
    if test_file and test_file.get("failure_case_count", 0) == 0:
        score += 5

    # Missing fake assertions despite side effects
    if test_file and side_effects:
        signals = test_file.get("signals", {})
        missing_fakes = []
        if "QUEUE" in side_effects and not signals.get("has_queue_fake"):
            missing_fakes.append("Queue::fake()")
        if "EVENT" in side_effects and not signals.get("has_event_fake"):
            missing_fakes.append("Event::fake()")
        if "MAIL" in side_effects and not signals.get("has_mail_fake"):
            missing_fakes.append("Mail::fake()")
        score += len(missing_fakes) * 4

    return score


# ─── Gap detection ────────────────────────────────────────────────────────────

def find_test_for_class(source_class: dict, tested_index: dict, test_files: list) -> dict | None:
    """Find a test file that covers a given source class."""
    class_name = source_class.get("name", "")
    fqn = source_class.get("fqn", "")

    # Direct match in index
    if class_name in tested_index:
        test_path = tested_index[class_name]
        for tf in test_files:
            if tf["file"] == test_path:
                return tf

    # FQN match
    fqn_short = fqn.split("\\")[-1] if "\\" in fqn else fqn
    if fqn_short in tested_index:
        test_path = tested_index[fqn_short]
        for tf in test_files:
            if tf["file"] == test_path:
                return tf

    # Fuzzy: look for test file with matching name
    name_lower = class_name.lower()
    for tf in test_files:
        tf_name = Path(tf["file"]).stem.lower()
        if tf_name in (name_lower + "test", "test" + name_lower, name_lower):
            return tf

    return None


def determine_status(source_class: dict, test_file: dict | None) -> tuple[str, list[str]]:
    """Determine coverage status and list specific gaps."""
    gaps = []

    # Skip certain types
    kind = source_class.get("kind", "class")
    method_count = source_class.get("public_method_count", 0)
    if kind in ("interface", "trait") or method_count == 0:
        return STATUS_SKIP, []

    # No test file at all
    if not test_file:
        gaps.append(f"No test file found")
        if source_class.get("side_effects"):
            se = ", ".join(source_class["side_effects"])
            gaps.append(f"Untested side effects: {se}")
        if method_count > 0:
            gaps.append(f"{method_count} public method(s) completely untested")
        return STATUS_NO_TESTS, gaps

    # Test file exists — check quality
    signals = test_file.get("signals", {})
    side_effects = source_class.get("side_effects", [])
    failure_count = test_file.get("failure_case_count", 0)
    quality = test_file.get("quality_label", "MINIMAL")

    # Missing failure cases
    if failure_count == 0:
        gaps.append("No failure/error test cases (only happy path)")

    # Missing auth tests for controllers
    if source_class.get("category") == "Controller":
        if not signals.get("has_auth_test"):
            gaps.append("No authenticated user test")
        if not signals.get("has_guest_test"):
            gaps.append("No unauthenticated/guest test")
        if not signals.get("has_failure_cases"):
            gaps.append("No 4xx/5xx response assertions")

    # Missing fake assertions
    if "QUEUE" in side_effects and not signals.get("has_queue_fake"):
        gaps.append("Queue dispatch never asserted (missing Queue::fake())")
    if "EVENT" in side_effects and not signals.get("has_event_fake"):
        gaps.append("Event dispatch never asserted (missing Event::fake())")
    if "MAIL" in side_effects and not signals.get("has_mail_fake"):
        gaps.append("Mail sending never asserted (missing Mail::fake())")

    # Missing DB assertions
    if "DB" in side_effects and not signals.get("has_db_assertions"):
        gaps.append("DB writes never asserted (missing assertDatabaseHas)")

    # Missing validation tests for FormRequests
    if source_class.get("category") == "FormRequest":
        if not signals.get("has_validation_test"):
            gaps.append("No validation failure assertions")

    # Determine status from gaps
    if not gaps:
        return STATUS_GOOD, []
    elif quality == "GOOD" and len(gaps) <= 2:
        return STATUS_PARTIAL, gaps
    elif failure_count == 0 or quality in ("MINIMAL", "SHALLOW"):
        return STATUS_SHALLOW, gaps
    else:
        return STATUS_PARTIAL, gaps


# ─── Report builder ──────────────────────────────────────────────────────────

def build_report(source_map: dict, test_map: dict) -> dict:
    source_classes = source_map.get("classes", [])
    test_files = test_map.get("test_files", [])
    tested_index = test_map.get("tested_classes_index", {})

    items = []
    for sc in source_classes:
        test_file = find_test_for_class(sc, tested_index, test_files)
        status, gaps = determine_status(sc, test_file)

        if status == STATUS_SKIP:
            continue

        score = priority_score(sc, test_file, status)

        item = {
            "priority_score": score,
            "status": status,
            "status_emoji": STATUS_EMOJI[status],
            "status_label": STATUS_LABEL[status],
            "file": sc["file"],
            "class_name": sc["name"],
            "category": sc["category"],
            "risk_hint": sc.get("risk_hint", "LOW"),
            "public_method_count": sc.get("public_method_count", 0),
            "side_effects": sc.get("side_effects", []),
            "gaps": gaps,
            "test_file": test_file["file"] if test_file else None,
            "test_method_count": test_file.get("test_method_count", 0) if test_file else 0,
            "next_skill": _recommend_skill(status, test_file),
        }
        items.append(item)

    # Sort by priority score descending
    items.sort(key=lambda x: x["priority_score"], reverse=True)

    # Summary stats
    status_counts = {s: 0 for s in (STATUS_NO_TESTS, STATUS_SHALLOW, STATUS_PARTIAL, STATUS_GOOD)}
    for item in items:
        if item["status"] in status_counts:
            status_counts[item["status"]] += 1

    total = len(items)
    good_count = status_counts[STATUS_GOOD]
    coverage_pct = round(good_count / total * 100) if total > 0 else 0

    # Overall quality issues
    quality_issues = _detect_quality_issues(test_files)

    return {
        "summary": {
            "total_classes": total,
            "coverage_percent": coverage_pct,
            "status_counts": status_counts,
            "overall_health": (
                "🟢 Good"    if coverage_pct >= 70 else
                "🟡 Partial" if coverage_pct >= 40 else
                "🔴 Low"
            ),
        },
        "quality_issues": quality_issues,
        "items": items,
    }


def _recommend_skill(status: str, test_file: dict | None) -> str:
    if status == STATUS_NO_TESTS:
        return "test-case-planner → test-risk-classifier → test-generator"
    elif status in (STATUS_SHALLOW, STATUS_PARTIAL):
        if test_file:
            return "test-risk-classifier → test-generator (add missing cases)"
        return "test-case-planner → test-risk-classifier → test-generator"
    return "No action needed"


def _detect_quality_issues(test_files: list) -> list[str]:
    issues = []
    no_failure = sum(1 for t in test_files if t.get("failure_case_count", 0) == 0)
    if no_failure:
        issues.append(f"{no_failure} test file(s) have zero failure/error cases")

    no_auth = sum(1 for t in test_files
                  if not t.get("signals", {}).get("has_auth_test")
                  and not t.get("signals", {}).get("has_guest_test"))
    if no_auth:
        issues.append(f"{no_auth} test file(s) never test authentication state")

    no_fakes = sum(1 for t in test_files
                   if not any(t.get("signals", {}).get(k)
                              for k in ("has_queue_fake", "has_event_fake",
                                        "has_mail_fake", "has_notification_fake")))
    if no_fakes:
        issues.append(f"{no_fakes} test file(s) never use fakes (Queue/Event/Mail)")

    return issues


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Compare source and test maps to produce a coverage gap report."
    )
    parser.add_argument("source_map", nargs="?", help="source_map.json from scan_source.py")
    parser.add_argument("test_map", nargs="?", help="test_map.json from scan_tests.py")
    parser.add_argument(
        "--scan", nargs=2, metavar=("SOURCE_DIR", "TEST_DIR"),
        help="Auto-run scan_source.py and scan_tests.py before reporting"
    )
    parser.add_argument("--out", default=None, help="Output JSON file")
    parser.add_argument("--summary", action="store_true", help="Human-readable summary")
    parser.add_argument("--top", type=int, default=None, help="Show only top N items")
    args = parser.parse_args()

    # Auto-scan mode
    if args.scan:
        source_dir, test_dir = args.scan
        scripts_dir = Path(__file__).parent

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as sf:
            source_tmp = sf.name
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf:
            test_tmp = tf.name

        print(f"Scanning source: {source_dir}", file=sys.stderr)
        subprocess.run(
            [sys.executable, str(scripts_dir / "scan_source.py"), source_dir, "--out", source_tmp],
            check=True
        )
        print(f"Scanning tests: {test_dir}", file=sys.stderr)
        subprocess.run(
            [sys.executable, str(scripts_dir / "scan_tests.py"), test_dir, "--out", test_tmp],
            check=True
        )

        source_map = json.loads(Path(source_tmp).read_text())
        test_map = json.loads(Path(test_tmp).read_text())
        Path(source_tmp).unlink(missing_ok=True)
        Path(test_tmp).unlink(missing_ok=True)

    elif args.source_map and args.test_map:
        source_map = json.loads(Path(args.source_map).read_text())
        test_map = json.loads(Path(args.test_map).read_text())
    else:
        parser.print_help()
        sys.exit(1)

    report = build_report(source_map, test_map)

    if args.top:
        report["items"] = report["items"][: args.top]

    if args.summary:
        s = report["summary"]
        print(f"\n{'='*60}")
        print(f"Coverage Audit Report")
        print(f"{'='*60}")
        print(f"Overall health:  {s['overall_health']}")
        print(f"Coverage:        {s['coverage_percent']}% good coverage")
        print(f"\nStatus breakdown:")
        for status, count in s["status_counts"].items():
            emoji = STATUS_EMOJI[status]
            label = STATUS_LABEL[status]
            print(f"  {emoji} {label:<25} {count}")

        if report["quality_issues"]:
            print(f"\nQuality issues:")
            for issue in report["quality_issues"]:
                print(f"  ⚠️  {issue}")

        items = report["items"]
        if args.top:
            items = items[: args.top]

        print(f"\nTop priority gaps:")
        print(f"{'─'*60}")
        for i, item in enumerate(items, 1):
            if item["status"] == STATUS_GOOD:
                continue
            print(f"\n#{i} [{item['status_emoji']} Score: {item['priority_score']}] {item['class_name']}")
            print(f"   File:     {item['file']}")
            print(f"   Category: {item['category']}  Risk: {item['risk_hint']}")
            if item["side_effects"]:
                print(f"   Effects:  {', '.join(item['side_effects'])}")
            print(f"   Gaps:")
            for gap in item["gaps"]:
                print(f"     • {gap}")
            print(f"   Next:     {item['next_skill']}")
    else:
        json_output = json.dumps(report, indent=2, ensure_ascii=False)
        if args.out:
            Path(args.out).write_text(json_output, encoding="utf-8")
            print(f"Audit report written to {args.out}", file=sys.stderr)
        else:
            print(json_output)


if __name__ == "__main__":
    main()
