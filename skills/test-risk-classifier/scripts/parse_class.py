#!/usr/bin/env python3
"""
parse_class.py — Parse a source file and extract structural complexity signals:
branches, side effects, dependencies, preconditions, and method-level metrics.
Outputs structured JSON consumed by classify_risk.py.

Usage:
    python parse_class.py <file> [options]
    python parse_class.py app/Services/PaymentService.php
    python parse_class.py app/Services/PaymentService.php --out payment_parsed.json
    python parse_class.py app/Http/Controllers/PressReleaseController.php --summary

Supported: PHP, Python, JS, TS
"""

import re
import json
import argparse
import sys
from pathlib import Path
from dataclasses import dataclass, field, asdict


# ─── Side effect patterns (applied to method bodies) ─────────────────────────

SIDE_EFFECTS = {
    "DB_WRITE": re.compile(
        r"\b(?:"
        r"\$\w+->save\(\)|->create\s*\(|->update\s*\(|->delete\s*\(|"
        r"->insert\s*\(|->upsert\s*\(|->updateOrCreate\s*\(|"
        r"->forceDelete\s*\(|->restore\s*\(|->increment\s*\(|->decrement\s*\(|"
        r"DB::(?:insert|update|delete|statement|transaction)\s*\(|"
        r"\.save\(\)|\.create\(|\.update\(|\.delete\(|session\.commit\(\)"  # Python ORM
        r")"
    ),
    "DB_READ": re.compile(
        r"\b(?:"
        r"->find\s*\(|->findOrFail\s*\(|->where\s*\(|->first\s*\(|->get\s*\(|"
        r"->paginate\s*\(|->all\s*\(|->pluck\s*\(|->exists\s*\(|"
        r"DB::select\s*\(|\.filter\(|\.query\."  # Python
        r")"
    ),
    "QUEUE": re.compile(
        r"\b(?:"
        r"dispatch\s*\(|Queue::push\s*\(|->dispatch\s*\(|"
        r"->dispatchSync\s*\(|->dispatchNow\s*\(|"
        r"delay\s*\(|onQueue\s*\(|ShouldQueue"
        r")"
    ),
    "EVENT": re.compile(
        r"\b(?:"
        r"event\s*\(|Event::dispatch\s*\(|->dispatchEvent\s*\(|"
        r"EventEmitter\.emit|emit\s*\(|broadcast\s*\("
        r")"
    ),
    "MAIL": re.compile(
        r"\b(?:"
        r"Mail::send\s*\(|Mail::queue\s*\(|Mail::to\s*\(|"
        r"->send\s*\(.*Mailable|Notification::send\s*\(|->notify\s*\("
        r")"
    ),
    "HTTP": re.compile(
        r"\b(?:"
        r"Http::get\s*\(|Http::post\s*\(|Http::put\s*\(|Http::patch\s*\(|"
        r"Http::delete\s*\(|Guzzle|curl_exec\s*\(|"
        r"requests\.\w+\s*\(|axios\.\w+\s*\(|fetch\s*\("
        r")"
    ),
    "CACHE": re.compile(
        r"\b(?:"
        r"Cache::put\s*\(|Cache::forget\s*\(|Cache::flush\s*\(|"
        r"Cache::remember\s*\(|->remember\s*\(|"
        r"redis\.set\s*\(|redis\.del\s*\("
        r")"
    ),
    "FILESYSTEM": re.compile(
        r"\b(?:"
        r"Storage::put\s*\(|Storage::delete\s*\(|Storage::move\s*\(|"
        r"->store\s*\(|->storeAs\s*\(|file_put_contents\s*\(|"
        r"fs\.write|shutil\."
        r")"
    ),
    "SESSION": re.compile(
        r"\b(?:"
        r"session\(\)->put\s*\(|Session::put\s*\(|session\(\)->forget\s*\(|"
        r"request\(\)->session\(\)|->flash\s*\("
        r")"
    ),
    "PAYMENT": re.compile(
        r"\b(?:"
        r"Stripe\\|stripe\.|PayPal\\|paypal\.|"
        r"charge\s*\(|refund\s*\(|createPaymentIntent|"
        r"subscriptions?\.|invoices?\."
        r")"
    ),
}

# Branch-creating constructs
BRANCH_PATTERNS = {
    "if":       re.compile(r"\bif\s*\("),
    "elseif":   re.compile(r"\b(?:elseif|elif)\s*\("),
    "else":     re.compile(r"\belse\s*(?:\{|:)"),
    "match":    re.compile(r"\bmatch\s*\("),
    "switch":   re.compile(r"\bswitch\s*\("),
    "case":     re.compile(r"^\s*case\s+", re.M),
    "ternary":  re.compile(r"\?\s*[^:]+\s*:"),
    "null_coal":re.compile(r"\?\?[^=]"),
    "try":      re.compile(r"\btry\s*\{"),
    "catch":    re.compile(r"\bcatch\s*\("),
    "early_ret":re.compile(r"\breturn\b"),
    "throw":    re.compile(r"\bthrow\b"),
    "assert":   re.compile(r"\babort\s*\(|\bAbort::|\braise\b"),  # PHP abort / Python raise
}

# Precondition / guard patterns
PRECONDITION_PATTERNS = re.compile(
    r"\b(?:"
    r"abort_if\s*\(|abort_unless\s*\(|throw_if\s*\(|throw_unless\s*\(|"
    r"assert\s*\(|Gate::(?:authorize|allows|denies)\s*\(|"
    r"authorize\s*\(|can\s*\(|cannot\s*\(|"
    r"abort\s*\(4|abort\s*\(5|"  # 4xx/5xx aborts
    r"raise\s+\w+Error|raise\s+\w+Exception"  # Python
    r")"
)

# Dependency injection (constructor params)
PHP_CONSTRUCTOR = re.compile(
    r"public\s+function\s+__construct\s*\(([^)]*)\)", re.S
)
PHP_TYPE_HINT = re.compile(r"(\w+(?:\\\w+)*)\s+\$\w+")

PYTHON_INIT = re.compile(r"def\s+__init__\s*\(([^)]*)\)", re.S)
PYTHON_TYPE_HINT = re.compile(r"\w+\s*:\s*(\w+)")

# Method extraction patterns
PHP_METHOD = re.compile(
    r"(?P<visibility>public|protected|private)\s+"
    r"(?:static\s+)?function\s+(?P<name>\w+)\s*\((?P<params>[^)]*)\)"
    r"(?:[^{]*)\{",
    re.S
)

PYTHON_METHOD = re.compile(
    r"^    def\s+(?P<name>\w+)\s*\((?P<params>[^)]*)\)\s*(?:->[\w\[\], |]+)?:",
    re.M
)

JS_METHOD = re.compile(
    r"(?:async\s+)?(?P<name>\w+)\s*\((?P<params>[^)]*)\)\s*\{|"
    r"(?P<name2>\w+)\s*=\s*(?:async\s+)?\(?(?P<params2>[^)]*)\)?\s*=>",
)


# ─── Data structures ──────────────────────────────────────────────────────────

@dataclass
class BranchInfo:
    id: str
    type: str
    description: str


@dataclass
class SideEffectInfo:
    id: str
    type: str
    description: str
    needs_fake: str


@dataclass
class PreconditionInfo:
    id: str
    description: str


@dataclass
class MethodAnalysis:
    name: str
    visibility: str
    params: str
    line_start: int
    branches: list = field(default_factory=list)
    side_effects: list = field(default_factory=list)
    preconditions: list = field(default_factory=list)
    branch_count: int = 0
    side_effect_count: int = 0
    precondition_count: int = 0
    complexity_score: int = 0
    complexity_tier: str = "LOW"
    dependencies: list = field(default_factory=list)


# ─── Fake recommendations ─────────────────────────────────────────────────────

FAKE_MAP = {
    "QUEUE":      "Queue::fake()",
    "EVENT":      "Event::fake()",
    "MAIL":       "Mail::fake()",
    "HTTP":       "Http::fake()",
    "CACHE":      "Cache::spy() or Cache::shouldReceive()",
    "FILESYSTEM": "Storage::fake()",
    "SESSION":    "Session::start() / $this->withSession([])",
    "PAYMENT":    "Mock payment gateway / use Stripe test keys",
    "DB_WRITE":   "RefreshDatabase trait",
    "DB_READ":    "DatabaseSeeder / factory()->create()",
}


# ─── Language detection ───────────────────────────────────────────────────────

def detect_language(path: Path) -> str:
    return {
        ".php": "php",
        ".py": "python",
        ".js": "js",
        ".ts": "ts",
        ".jsx": "js",
        ".tsx": "ts",
    }.get(path.suffix.lower(), "unknown")


# ─── Method body extraction ───────────────────────────────────────────────────

def extract_method_body_php(source: str, method_start: int) -> str:
    """Extract method body by counting braces from method start."""
    body_start = source.find("{", method_start)
    if body_start == -1:
        return ""

    depth = 0
    for i in range(body_start, len(source)):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                return source[body_start:i + 1]
    return source[body_start:]


def extract_method_body_python(source: str, method_start: int) -> str:
    """Extract Python method body by indentation."""
    lines = source[method_start:].split("\n")
    if not lines:
        return ""
    body_lines = [lines[0]]
    for line in lines[1:]:
        if line and not line.startswith("    ") and not line.startswith("\t"):
            break
        body_lines.append(line)
    return "\n".join(body_lines)


# ─── Method analysis ──────────────────────────────────────────────────────────

def analyze_method_body(body: str, method_name: str, lang: str) -> tuple:
    branches = []
    side_effects = []
    preconditions = []

    b_idx = 1
    se_idx = 1
    p_idx = 1

    # Branches
    for branch_type, pattern in BRANCH_PATTERNS.items():
        count = len(pattern.findall(body))
        for _ in range(count):
            bid = f"B{b_idx}"
            desc = f"{branch_type} in {method_name}"
            branches.append({"id": bid, "type": branch_type, "description": desc})
            b_idx += 1

    # Side effects
    for se_type, pattern in SIDE_EFFECTS.items():
        if pattern.search(body):
            sid = f"SE{se_idx}"
            fake = FAKE_MAP.get(se_type, "mock/spy")
            side_effects.append({
                "id": sid,
                "type": se_type,
                "description": f"{se_type} operation in {method_name}",
                "needs_fake": fake,
            })
            se_idx += 1

    # Preconditions
    for m in PRECONDITION_PATTERNS.finditer(body):
        pid = f"P{p_idx}"
        preconditions.append({
            "id": pid,
            "description": f"Guard: {m.group(0).strip()[:60]}",
        })
        p_idx += 1

    return branches, side_effects, preconditions


def complexity_tier(score: float) -> str:
    if score >= 15:
        return "CRITICAL"
    elif score >= 8:
        return "HIGH"
    elif score >= 4:
        return "MEDIUM"
    return "LOW"


def compute_complexity(branches: list, side_effects: list, preconditions: list) -> int:
    """
    Weighted complexity score — side effects score higher than branches
    because they require mocking infrastructure and are harder to test correctly.

    Weights:
      branch       × 1.0  — pure logic, easy to test with different inputs
      side_effect  × 2.0  — requires fakes, assertions, and setup
      precondition × 0.5  — guards reduce actual test cases needed

    Example:
      8 branches, 0 side effects → score 8  (branch-heavy, HIGH)
      2 branches, 4 side effects → score 10 (effect-heavy, HIGH but harder)
      Both score HIGH but the profile shape guides the generator differently.
    """
    score = (
        len(branches) * 1.0
        + len(side_effects) * 2.0
        + len(preconditions) * 0.5
    )
    return int(round(score))


# ─── PHP parser ───────────────────────────────────────────────────────────────

def parse_php(source: str, path: Path) -> dict:
    # Namespace + class name
    ns_match = re.search(r"^\s*namespace\s+([\w\\]+)\s*;", source, re.M)
    namespace = ns_match.group(1) if ns_match else ""

    class_match = re.search(r"^\s*(?:abstract\s+|final\s+)?class\s+(\w+)", source, re.M)
    class_name = class_match.group(1) if class_match else path.stem

    fqn = f"{namespace}\\{class_name}" if namespace else class_name

    # Constructor dependencies
    ctor_match = PHP_CONSTRUCTOR.search(source)
    constructor_deps = []
    if ctor_match:
        params = ctor_match.group(1)
        for m in PHP_TYPE_HINT.finditer(params):
            dep = m.group(1)
            if dep not in ("string", "int", "bool", "float", "array", "callable", "mixed"):
                constructor_deps.append(dep)

    # First pass: collect all non-public methods for tracing
    private_methods: dict[str, str] = {}
    for m in PHP_METHOD.finditer(source):
        if m.group("visibility") in ("private", "protected") and not m.group("name").startswith("__"):
            body = extract_method_body_php(source, m.start())
            private_methods[m.group("name")] = body

    # Second pass: analyze public methods, tracing into private callees
    methods = []
    for m in PHP_METHOD.finditer(source):
        visibility = m.group("visibility")
        name = m.group("name")
        params = m.group("params").strip()

        if name.startswith("__"):
            continue  # skip magic methods
        if visibility != "public":
            continue  # only public

        body = extract_method_body_php(source, m.start())

        # Trace private method calls — aggregate their complexity into the public method
        traced_bodies = [body]
        traced_names = []
        for private_name, private_body in private_methods.items():
            # Check if this public method calls the private method
            if re.search(r"\$this->" + re.escape(private_name) + r"\s*\(", body):
                traced_bodies.append(private_body)
                traced_names.append(private_name)

        # Analyze combined body (public + all private callees)
        combined_body = "\n".join(traced_bodies)
        branches, side_effects, preconditions = analyze_method_body(combined_body, name, "php")
        score = compute_complexity(branches, side_effects, preconditions)
        tier = complexity_tier(score)

        # Line number
        line_start = source[:m.start()].count("\n") + 1

        methods.append({
            "name": name,
            "visibility": visibility,
            "params": params,
            "line_start": line_start,
            "branches": branches,
            "side_effects": side_effects,
            "preconditions": preconditions,
            "branch_count": len(branches),
            "side_effect_count": len(side_effects),
            "precondition_count": len(preconditions),
            "complexity_score": score,
            "complexity_tier": tier,
            "traced_private_methods": traced_names,  # for transparency
        })

    return {
        "language": "php",
        "class_name": class_name,
        "fqn": fqn,
        "namespace": namespace,
        "constructor_dependencies": constructor_deps,
        "methods": methods,
    }


# ─── Python parser ────────────────────────────────────────────────────────────

def parse_python(source: str, path: Path) -> dict:
    class_match = re.search(r"^class\s+(\w+)", source, re.M)
    class_name = class_match.group(1) if class_match else path.stem

    # Constructor dependencies
    init_match = PYTHON_INIT.search(source)
    constructor_deps = []
    if init_match:
        params = init_match.group(1)
        for m in PYTHON_TYPE_HINT.finditer(params):
            dep = m.group(1)
            if dep not in ("self", "str", "int", "bool", "float", "list", "dict", "None"):
                constructor_deps.append(dep)

    methods = []
    for m in PYTHON_METHOD.finditer(source):
        name = m.group("name")
        params = m.group("params").strip()

        if name.startswith("_"):
            continue

        body = extract_method_body_python(source, m.start())
        branches, side_effects, preconditions = analyze_method_body(body, name, "python")
        score = compute_complexity(branches, side_effects, preconditions)
        tier = complexity_tier(score)
        line_start = source[:m.start()].count("\n") + 1

        methods.append({
            "name": name,
            "visibility": "public",
            "params": params,
            "line_start": line_start,
            "branches": branches,
            "side_effects": side_effects,
            "preconditions": preconditions,
            "branch_count": len(branches),
            "side_effect_count": len(side_effects),
            "precondition_count": len(preconditions),
            "complexity_score": score,
            "complexity_tier": tier,
        })

    return {
        "language": "python",
        "class_name": class_name,
        "fqn": class_name,
        "namespace": str(path.parent).replace("/", "."),
        "constructor_dependencies": constructor_deps,
        "methods": methods,
    }


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Parse a source file and extract complexity signals for risk classification."
    )
    parser.add_argument("file", help="Source file to parse")
    parser.add_argument("--out", default=None, help="Output JSON file")
    parser.add_argument("--summary", action="store_true", help="Human-readable summary")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"Error: file '{path}' does not exist.", file=sys.stderr)
        sys.exit(1)

    source = path.read_text(encoding="utf-8", errors="ignore")
    lang = detect_language(path)

    if lang == "php":
        result = parse_php(source, path)
    elif lang == "python":
        result = parse_python(source, path)
    else:
        print(f"Error: unsupported language '{lang}' for file '{path}'", file=sys.stderr)
        sys.exit(1)

    result["file"] = str(path)

    # Global side effect summary
    all_se_types = list({
        se["type"]
        for m in result["methods"]
        for se in m["side_effects"]
    })
    result["global_side_effects"] = all_se_types
    result["global_fakes_needed"] = [FAKE_MAP[t] for t in all_se_types if t in FAKE_MAP]

    # Class-level complexity
    scores = [m["complexity_score"] for m in result["methods"]]
    result["max_method_complexity"] = max(scores) if scores else 0
    result["total_complexity"] = sum(scores)
    result["class_tier"] = complexity_tier(result["max_method_complexity"])

    if args.summary:
        print(f"\n{'='*60}")
        print(f"Class: {result['class_name']}")
        print(f"File:  {result['file']}")
        print(f"Lang:  {result['language']}")
        print(f"Tier:  {result['class_tier']}")
        print(f"{'='*60}")

        if result["constructor_dependencies"]:
            print(f"\nDependencies: {', '.join(result['constructor_dependencies'])}")

        if result["global_side_effects"]:
            print(f"Side effects: {', '.join(result['global_side_effects'])}")
            print(f"Fakes needed:")
            for fake in result["global_fakes_needed"]:
                print(f"  • {fake}")

        print(f"\nMethods ({len(result['methods'])}):")
        for m in sorted(result["methods"], key=lambda x: x["complexity_score"], reverse=True):
            tier_emoji = {"CRITICAL": "🚨", "HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(m["complexity_tier"], "⚪")
            print(f"\n  {tier_emoji} {m['name']}()  [score: {m['complexity_score']}]")
            if m["branches"]:
                print(f"     Branches ({m['branch_count']}):")
                for b in m["branches"][:5]:
                    print(f"       [{b['id']}] {b['type']}")
                if m["branch_count"] > 5:
                    print(f"       ... +{m['branch_count'] - 5} more")
            if m["side_effects"]:
                print(f"     Side effects:")
                for se in m["side_effects"]:
                    print(f"       [{se['id']}] {se['type']} → {se['needs_fake']}")
            if m["preconditions"]:
                print(f"     Preconditions:")
                for p in m["preconditions"]:
                    print(f"       [{p['id']}] {p['description']}")
    else:
        json_output = json.dumps(result, indent=2, ensure_ascii=False)
        if args.out:
            Path(args.out).write_text(json_output, encoding="utf-8")
            print(f"Parsed {result['class_name']} → {args.out}", file=sys.stderr)
        else:
            print(json_output)


if __name__ == "__main__":
    main()
