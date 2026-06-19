#!/usr/bin/env python3
"""
scan_tests.py — Scan test files and extract what's being tested,
coverage signals (auth, failure cases, fakes), and quality indicators.
Outputs structured JSON for gap_report.py.

Usage:
    python scan_tests.py <test_dir> [options]
    python scan_tests.py tests/
    python scan_tests.py tests/ --out test_map.json
    python scan_tests.py tests/ --summary
"""

import re
import json
import argparse
import sys
from pathlib import Path


# ─── Patterns ─────────────────────────────────────────────────────────────────

# Classes being tested (referenced via use statements or string references)
USE_IMPORT = re.compile(r"^\s*use\s+([\w\\]+)(?:\s+as\s+\w+)?\s*;", re.M)

# Test method names
TEST_METHOD = re.compile(r"^\s*(?:public\s+)?function\s+(test\w+|it\w*)\s*\(", re.M)

# PHPUnit data provider methods
DATA_PROVIDER = re.compile(r"@dataProvider\s+(\w+)", re.M)

# Coverage quality signals
SIGNALS = {
    # Auth testing
    "has_auth_test":        re.compile(r"actingAs\s*\(|loginAs\s*\(|withToken\s*\(|be\s*\(", re.I),
    "has_guest_test":       re.compile(r"assertGuest|withoutMiddleware|as_guest|unauthenticated", re.I),

    # Failure / error cases
    "has_failure_cases":    re.compile(r"assert(?:Status\s*\(\s*[45]|Throws|Exception)|expectException|422|403|401|404|500", re.I),
    "has_validation_test":  re.compile(r"assertJsonValidationErrors|assertSessionHasErrors|422", re.I),

    # Side effect assertions
    "has_queue_fake":       re.compile(r"Queue::fake|assertPushed|assertNotPushed|assertNothingPushed", re.I),
    "has_event_fake":       re.compile(r"Event::fake|assertDispatched|assertNotDispatched", re.I),
    "has_mail_fake":        re.compile(r"Mail::fake|assertSent|assertNotSent|assertQueued", re.I),
    "has_notification_fake":re.compile(r"Notification::fake|assertSentTo|assertNothingSent", re.I),
    "has_http_fake":        re.compile(r"Http::fake|Http::preventStrayRequests", re.I),
    "has_storage_fake":     re.compile(r"Storage::fake", re.I),

    # Database
    "uses_refresh_db":      re.compile(r"use\s+RefreshDatabase|use\s+DatabaseMigrations|use\s+DatabaseTransactions", re.I),
    "has_db_assertions":    re.compile(r"assertDatabaseHas|assertDatabaseMissing|assertSoftDeleted", re.I),

    # Time control
    "has_time_control":     re.compile(r"Carbon::setTestNow|travel\(\)|freeze\(|travelTo", re.I),

    # Data providers
    "has_data_provider":    re.compile(r"@dataProvider|#\[DataProvider\]", re.I),
}

# Detect what production class is being tested
# Common patterns: FooTest tests Foo, or explicit use App\...\Foo
TEST_CLASS_SUFFIX = re.compile(r"class\s+(\w+)Test\b", re.M)

# Python test patterns
PY_TEST_FUNC = re.compile(r"^(?:    )?def\s+(test_\w+)\s*\(", re.M)
PY_IMPORT = re.compile(r"^(?:import|from)\s+([\w.]+)", re.M)

# JS/TS test patterns
JS_TEST_FUNC = re.compile(r"(?:it|test)\s*\(\s*['\"](.+?)['\"]", re.M)
JS_IMPORT = re.compile(r"^import\s+.+\s+from\s+['\"](.+?)['\"]", re.M)
JS_DESCRIBE = re.compile(r"describe\s*\(\s*['\"](.+?)['\"]", re.M)


# ─── Parsers ──────────────────────────────────────────────────────────────────

def detect_language(path: Path) -> str:
    return {
        ".php": "php",
        ".py": "python",
        ".js": "js",
        ".ts": "ts",
        ".jsx": "js",
        ".tsx": "ts",
    }.get(path.suffix.lower(), "unknown")


def parse_php_test(source: str, path: Path) -> dict:
    # Test class name
    class_match = TEST_CLASS_SUFFIX.search(source)
    class_name = class_match.group(1) + "Test" if class_match else path.stem

    # What production class is likely being tested
    tested_class = class_match.group(1) if class_match else None

    # All imports — find production class references
    imports = [m.group(1) for m in USE_IMPORT.finditer(source)]
    production_imports = [
        imp for imp in imports
        if not any(x in imp for x in ["PHPUnit", "TestCase", "RefreshDatabase",
                                       "DatabaseMigrations", "WithFaker", "Http\\Testing",
                                       "Tests\\", "Mockery", "Faker"])
    ]

    # Test methods
    test_methods = [m.group(1) for m in TEST_METHOD.finditer(source)]

    # Quality signals
    signals = {key: bool(pat.search(source)) for key, pat in SIGNALS.items()}

    # Classify test methods by type
    happy_path = []
    failure_cases = []
    edge_cases = []

    for method in test_methods:
        method_lower = method.lower()
        if any(w in method_lower for w in ["fail", "error", "invalid", "unauthorized",
                                            "forbidden", "notfound", "exception",
                                            "unauthenticated", "wrong", "missing",
                                            "expired", "denied"]):
            failure_cases.append(method)
        elif any(w in method_lower for w in ["edge", "empty", "null", "zero",
                                              "boundary", "max", "min"]):
            edge_cases.append(method)
        else:
            happy_path.append(method)

    return {
        "class_name": class_name,
        "tested_class": tested_class,
        "production_imports": production_imports,
        "test_method_count": len(test_methods),
        "test_methods": test_methods,
        "happy_path_count": len(happy_path),
        "failure_case_count": len(failure_cases),
        "edge_case_count": len(edge_cases),
        "signals": signals,
        "has_data_provider": bool(DATA_PROVIDER.search(source)),
    }


def parse_python_test(source: str, path: Path) -> dict:
    test_methods = [m.group(1) for m in PY_TEST_FUNC.finditer(source)]
    imports = [m.group(1) for m in PY_IMPORT.finditer(source)]

    # Derive tested module from file name
    stem = path.stem
    tested_class = stem.replace("test_", "").replace("_test", "").title().replace("_", "")

    failure_cases = [m for m in test_methods if any(
        w in m.lower() for w in ["fail", "error", "invalid", "exception", "wrong"]
    )]

    return {
        "class_name": stem,
        "tested_class": tested_class,
        "production_imports": imports,
        "test_method_count": len(test_methods),
        "test_methods": test_methods,
        "happy_path_count": len(test_methods) - len(failure_cases),
        "failure_case_count": len(failure_cases),
        "edge_case_count": 0,
        "signals": {},
        "has_data_provider": False,
    }


def parse_js_test(source: str, path: Path) -> dict:
    test_names = [m.group(1) for m in JS_TEST_FUNC.finditer(source)]
    describe_blocks = [m.group(1) for m in JS_DESCRIBE.finditer(source)]
    imports = [m.group(1) for m in JS_IMPORT.finditer(source)]

    failure_cases = [t for t in test_names if any(
        w in t.lower() for w in ["fail", "error", "invalid", "throw", "reject", "wrong"]
    )]

    tested_class = describe_blocks[0] if describe_blocks else path.stem

    return {
        "class_name": path.stem,
        "tested_class": tested_class,
        "production_imports": imports,
        "test_method_count": len(test_names),
        "test_methods": test_names,
        "happy_path_count": len(test_names) - len(failure_cases),
        "failure_case_count": len(failure_cases),
        "edge_case_count": 0,
        "signals": {},
        "has_data_provider": False,
    }


# ─── Scanner ──────────────────────────────────────────────────────────────────

def scan_test_file(path: Path) -> dict | None:
    try:
        source = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    lang = detect_language(path)

    if lang == "php":
        info = parse_php_test(source, path)
    elif lang == "python":
        info = parse_python_test(source, path)
    elif lang in ("js", "ts"):
        info = parse_js_test(source, path)
    else:
        return None

    # Overall quality score (0-10)
    signals = info.get("signals", {})
    quality_score = 0
    if info["failure_case_count"] > 0:
        quality_score += 3
    if info["edge_case_count"] > 0:
        quality_score += 1
    if signals.get("has_auth_test"):
        quality_score += 1
    if signals.get("has_guest_test"):
        quality_score += 1
    if any(signals.get(k) for k in ("has_queue_fake", "has_event_fake",
                                     "has_mail_fake", "has_notification_fake")):
        quality_score += 2
    if signals.get("has_db_assertions"):
        quality_score += 1
    if signals.get("has_data_provider"):
        quality_score += 1

    quality_label = (
        "GOOD"     if quality_score >= 7 else
        "PARTIAL"  if quality_score >= 4 else
        "SHALLOW"  if quality_score >= 1 else
        "MINIMAL"
    )

    return {
        "file": str(path),
        "language": lang,
        **info,
        "quality_score": quality_score,
        "quality_label": quality_label,
    }


def is_test_file(path: Path) -> bool:
    name = path.name.lower()
    return (
        name.endswith("test.php")
        or name.endswith("test.py")
        or name.startswith("test_")
        or name.endswith(".spec.ts")
        or name.endswith(".spec.js")
        or name.endswith(".test.ts")
        or name.endswith(".test.js")
        or "test" in path.parts
    )


def scan_directory(test_dir: Path, exclude_dirs: list[str]) -> list[dict]:
    results = []
    exclude_set = set(exclude_dirs)
    extensions = {".php", ".py", ".js", ".ts", ".jsx", ".tsx"}

    for path in sorted(test_dir.rglob("*")):
        if any(part in exclude_set for part in path.parts):
            continue
        if path.suffix.lower() not in extensions:
            continue
        if not path.is_file():
            continue
        if not is_test_file(path):
            continue

        result = scan_test_file(path)
        if result:
            results.append(result)

    return results


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Scan test files and extract coverage quality signals."
    )
    parser.add_argument("test_dir", help="Test directory to scan (e.g. tests/)")
    parser.add_argument(
        "--exclude",
        default="vendor,node_modules,.git",
        help="Comma-separated directories to exclude"
    )
    parser.add_argument("--out", default=None, help="Output JSON file path")
    parser.add_argument("--summary", action="store_true",
                        help="Print human-readable summary")
    args = parser.parse_args()

    test_dir = Path(args.test_dir)
    if not test_dir.exists():
        print(f"Error: directory '{test_dir}' does not exist.", file=sys.stderr)
        sys.exit(1)

    exclude_dirs = [d.strip() for d in args.exclude.split(",") if d.strip()]
    test_files = scan_directory(test_dir, exclude_dirs)

    # Build index of tested classes (for gap_report)
    tested_classes = {}
    for tf in test_files:
        tc = tf.get("tested_class")
        if tc:
            tested_classes[tc] = tf["file"]
        for imp in tf.get("production_imports", []):
            short = imp.split("\\")[-1].split(".")[-1]
            tested_classes[short] = tf["file"]

    output = {
        "scanned_dir": str(test_dir),
        "total_test_files": len(test_files),
        "total_test_methods": sum(t["test_method_count"] for t in test_files),
        "quality_distribution": {
            label: sum(1 for t in test_files if t["quality_label"] == label)
            for label in ("GOOD", "PARTIAL", "SHALLOW", "MINIMAL")
        },
        "tested_classes_index": tested_classes,
        "test_files": test_files,
    }

    if args.summary:
        print(f"\n{'='*60}")
        print(f"Test Scan: {test_dir}")
        print(f"{'='*60}")
        print(f"Test files:    {output['total_test_files']}")
        print(f"Test methods:  {output['total_test_methods']}")
        print(f"\nQuality distribution:")
        for label, count in output["quality_distribution"].items():
            bar = "█" * count
            print(f"  {label:<10} {count:>3}  {bar}")
        print(f"\nShallow/Minimal tests (need improvement):")
        weak = [t for t in test_files if t["quality_label"] in ("SHALLOW", "MINIMAL")]
        for t in sorted(weak, key=lambda x: x["quality_score"]):
            print(f"  [{t['quality_label']}] {t['file']}")
    else:
        json_output = json.dumps(output, indent=2, ensure_ascii=False)
        if args.out:
            Path(args.out).write_text(json_output, encoding="utf-8")
            print(f"Wrote {len(test_files)} test files to {args.out}", file=sys.stderr)
        else:
            print(json_output)


if __name__ == "__main__":
    main()
