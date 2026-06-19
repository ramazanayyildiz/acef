#!/usr/bin/env python3
"""
scan_source.py — Scan source files and extract classes, public methods,
and dependency signals. Outputs structured JSON for gap_report.py.

Usage:
    python scan_source.py <source_dir> [options]
    python scan_source.py app/
    python scan_source.py app/ --lang php
    python scan_source.py app/ --exclude vendor,storage --out source_map.json

Supported languages: php, python, js, ts (auto-detected from file extensions)
"""

import re
import json
import argparse
import sys
from pathlib import Path


# ─── Language-specific patterns ───────────────────────────────────────────────

PHP_PATTERNS = {
    "namespace":    re.compile(r"^\s*namespace\s+([\w\\]+)\s*;", re.M),
    "class":        re.compile(r"^\s*(?:abstract\s+|final\s+)?class\s+(\w+)", re.M),
    "interface":    re.compile(r"^\s*interface\s+(\w+)", re.M),
    "trait":        re.compile(r"^\s*trait\s+(\w+)", re.M),
    "public_method":re.compile(r"^\s*public\s+(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)", re.M),
    "use_import":   re.compile(r"^\s*use\s+([\w\\]+)(?:\s+as\s+\w+)?\s*;", re.M),
}

PYTHON_PATTERNS = {
    "class":        re.compile(r"^class\s+(\w+)", re.M),
    "public_method":re.compile(r"^    def\s+([^_]\w*)\s*\(([^)]*)\)", re.M),
    "import":       re.compile(r"^(?:import|from)\s+([\w.]+)", re.M),
}

JS_PATTERNS = {
    "class":        re.compile(r"^(?:export\s+)?class\s+(\w+)", re.M),
    "public_method":re.compile(
        r"^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{|"
        r"^\s+(?:async\s+)?(\w+)\s*=\s*(?:async\s+)?\(?[^)]*\)?\s*=>", re.M
    ),
    "import":       re.compile(r"^import\s+.+\s+from\s+['\"](.+)['\"]", re.M),
}

# Side-effect signal patterns (language-agnostic, applied to raw source)
SIDE_EFFECT_SIGNALS = {
    "DB":           re.compile(r"\b(?:DB::|\$\w+->save\(\)|->create\(|->update\(|->delete\(|->insert\(|Model::)", re.I),
    "QUEUE":        re.compile(r"\b(?:dispatch\(|Queue::|->dispatch\(|ShouldQueue|delay\(|onQueue\()", re.I),
    "EVENT":        re.compile(r"\b(?:event\(|Event::|->dispatchEvent\(|EventEmitter|emit\()", re.I),
    "MAIL":         re.compile(r"\b(?:Mail::|->send\(|Mailable|Notification::|->notify\()", re.I),
    "HTTP":         re.compile(r"\b(?:Http::|Guzzle|fetch\(|axios\.|requests\.|curl_)", re.I),
    "CACHE":        re.compile(r"\b(?:Cache::|->remember\(|->put\(|->forget\(|redis\.)", re.I),
    "FILESYSTEM":   re.compile(r"\b(?:Storage::|->store\(|->delete\(|file_put_contents|fs\.write)", re.I),
    "TIME":         re.compile(r"\b(?:Carbon::now\(\)|now\(\)|today\(\)|Date\.now\(\)|datetime\.now)", re.I),
}

# Risk-raising keywords in class names / paths
HIGH_RISK_KEYWORDS = re.compile(
    r"\b(?:payment|billing|subscription|auth|permission|publish|distribute|"
    r"send|notify|delete|checkout|invoice|charge|token|password|secret)\b", re.I
)


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


def parse_php(source: str, path: Path) -> dict:
    ns_match = PHP_PATTERNS["namespace"].search(source)
    namespace = ns_match.group(1) if ns_match else ""

    # Determine type
    kind = "class"
    name_match = PHP_PATTERNS["class"].search(source)
    if not name_match:
        name_match = PHP_PATTERNS["interface"].search(source)
        kind = "interface"
    if not name_match:
        name_match = PHP_PATTERNS["trait"].search(source)
        kind = "trait"
    if not name_match:
        return {}

    class_name = name_match.group(1)
    fqn = f"{namespace}\\{class_name}" if namespace else class_name

    # Public methods (skip magic methods like __construct etc for method list
    # but still count them for context)
    methods = []
    for m in PHP_PATTERNS["public_method"].finditer(source):
        method_name = m.group(1)
        params = m.group(2).strip()
        methods.append({
            "name": method_name,
            "params": params,
            "is_magic": method_name.startswith("__"),
        })

    public_methods = [m for m in methods if not m["is_magic"]]

    # Imports
    imports = [m.group(1) for m in PHP_PATTERNS["use_import"].finditer(source)]

    return {
        "kind": kind,
        "name": class_name,
        "fqn": fqn,
        "namespace": namespace,
        "public_methods": public_methods,
        "imports": imports,
    }


def parse_python(source: str, path: Path) -> dict:
    class_match = PYTHON_PATTERNS["class"].search(source)
    if not class_match:
        return {}

    class_name = class_match.group(1)

    methods = []
    for m in PYTHON_PATTERNS["public_method"].finditer(source):
        methods.append({
            "name": m.group(1),
            "params": m.group(2).strip(),
            "is_magic": False,
        })

    imports = [m.group(1) for m in PYTHON_PATTERNS["import"].finditer(source)]

    return {
        "kind": "class",
        "name": class_name,
        "fqn": class_name,
        "namespace": str(path.parent).replace("/", "."),
        "public_methods": methods,
        "imports": imports,
    }


def parse_js(source: str, path: Path) -> dict:
    class_match = JS_PATTERNS["class"].search(source)
    if not class_match:
        return {}

    class_name = class_match.group(1)

    methods = []
    for m in JS_PATTERNS["public_method"].finditer(source):
        name = m.group(1) or m.group(2)
        if name and not name.startswith("_") and name not in ("constructor",):
            methods.append({"name": name, "params": "", "is_magic": False})

    imports = [m.group(1) for m in JS_PATTERNS["import"].finditer(source)]

    return {
        "kind": "class",
        "name": class_name,
        "fqn": class_name,
        "namespace": str(path.parent),
        "public_methods": methods,
        "imports": imports,
    }


# ─── Side effect detection ────────────────────────────────────────────────────

def detect_side_effects(source: str) -> list[str]:
    found = []
    for name, pattern in SIDE_EFFECT_SIGNALS.items():
        if pattern.search(source):
            found.append(name)
    return found


def detect_risk_level(class_info: dict, side_effects: list, path: Path) -> str:
    score = 0
    score += len(side_effects)
    score += len(class_info.get("public_methods", []))

    path_str = str(path)
    if HIGH_RISK_KEYWORDS.search(path_str) or HIGH_RISK_KEYWORDS.search(class_info.get("name", "")):
        score += 3

    if score >= 10:
        return "CRITICAL"
    elif score >= 6:
        return "HIGH"
    elif score >= 3:
        return "MEDIUM"
    return "LOW"


# ─── File categorization ─────────────────────────────────────────────────────

def categorize_php_path(path: Path) -> str:
    parts = [p.lower() for p in path.parts]
    mapping = {
        "controllers": "Controller",
        "services":    "Service",
        "models":      "Model",
        "jobs":        "Job",
        "events":      "Event",
        "listeners":   "Listener",
        "requests":    "FormRequest",
        "middleware":  "Middleware",
        "commands":    "Command",
        "observers":   "Observer",
        "policies":    "Policy",
        "repositories":"Repository",
        "actions":     "Action",
        "notifications":"Notification",
        "resources":   "Resource",
        "traits":      "Trait",
    }
    for part in parts:
        for key, label in mapping.items():
            if key in part:
                return label
    return "Other"


# ─── Main scanner ─────────────────────────────────────────────────────────────

def scan_file(path: Path) -> dict | None:
    try:
        source = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    lang = detect_language(path)

    if lang == "php":
        info = parse_php(source, path)
    elif lang == "python":
        info = parse_python(source, path)
    elif lang in ("js", "ts"):
        info = parse_js(source, path)
    else:
        return None

    if not info:
        return None

    side_effects = detect_side_effects(source)
    line_count = source.count("\n") + 1
    category = categorize_php_path(path) if lang == "php" else "Other"
    risk = detect_risk_level(info, side_effects, path)

    return {
        "file": str(path),
        "language": lang,
        "category": category,
        "kind": info.get("kind", "class"),
        "name": info.get("name", ""),
        "fqn": info.get("fqn", ""),
        "namespace": info.get("namespace", ""),
        "line_count": line_count,
        "public_method_count": len(info.get("public_methods", [])),
        "public_methods": info.get("public_methods", []),
        "imports": info.get("imports", []),
        "side_effects": side_effects,
        "risk_hint": risk,
    }


def scan_directory(
    source_dir: Path,
    exclude_dirs: list[str],
    extensions: list[str],
) -> list[dict]:
    results = []
    exclude_set = set(exclude_dirs)

    for path in sorted(source_dir.rglob("*")):
        # Skip excluded directories
        if any(part in exclude_set for part in path.parts):
            continue
        if path.suffix.lower() not in extensions:
            continue
        if not path.is_file():
            continue

        result = scan_file(path)
        if result:
            results.append(result)

    return results


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Scan source files and extract class/method information."
    )
    parser.add_argument("source_dir", help="Directory to scan (e.g. app/)")
    parser.add_argument(
        "--lang", choices=["php", "python", "js", "ts", "auto"],
        default="auto",
        help="Language to scan (default: auto-detect from extensions)"
    )
    parser.add_argument(
        "--exclude",
        default="vendor,node_modules,storage,.git,bootstrap,public",
        help="Comma-separated directories to exclude"
    )
    parser.add_argument(
        "--out", default=None,
        help="Output file path (default: stdout)"
    )
    parser.add_argument(
        "--summary", action="store_true",
        help="Print a human-readable summary instead of JSON"
    )
    args = parser.parse_args()

    source_dir = Path(args.source_dir)
    if not source_dir.exists():
        print(f"Error: directory '{source_dir}' does not exist.", file=sys.stderr)
        sys.exit(1)

    exclude_dirs = [d.strip() for d in args.exclude.split(",") if d.strip()]

    lang_extensions = {
        "php":    [".php"],
        "python": [".py"],
        "js":     [".js", ".jsx"],
        "ts":     [".ts", ".tsx"],
        "auto":   [".php", ".py", ".js", ".ts", ".jsx", ".tsx"],
    }
    extensions = lang_extensions[args.lang]

    classes = scan_directory(source_dir, exclude_dirs, extensions)

    output = {
        "scanned_dir": str(source_dir),
        "total_files": len(classes),
        "total_public_methods": sum(c["public_method_count"] for c in classes),
        "by_category": {},
        "classes": classes,
    }

    # Group by category
    for c in classes:
        cat = c["category"]
        output["by_category"].setdefault(cat, 0)
        output["by_category"][cat] += 1

    if args.summary:
        print(f"\n{'='*60}")
        print(f"Source Scan: {source_dir}")
        print(f"{'='*60}")
        print(f"Files found:     {output['total_files']}")
        print(f"Public methods:  {output['total_public_methods']}")
        print(f"\nBy category:")
        for cat, count in sorted(output["by_category"].items()):
            print(f"  {cat:<20} {count}")
        print(f"\nRisk distribution:")
        for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
            count = sum(1 for c in classes if c["risk_hint"] == level)
            print(f"  {level:<12} {count}")
        print(f"\nTop files by method count:")
        top = sorted(classes, key=lambda x: x["public_method_count"], reverse=True)[:10]
        for c in top:
            print(f"  {c['public_method_count']:>3} methods  {c['file']}")
    else:
        json_output = json.dumps(output, indent=2, ensure_ascii=False)
        if args.out:
            Path(args.out).write_text(json_output, encoding="utf-8")
            print(f"Wrote {len(classes)} classes to {args.out}", file=sys.stderr)
        else:
            print(json_output)


if __name__ == "__main__":
    main()
