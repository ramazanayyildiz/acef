#!/usr/bin/env python3
"""
extract_routes.py — Extract routes from any framework and output structured
JSON for test-case-planner and test-user-flow-mapper consumption.

Usage:
    python extract_routes.py [options]
    python extract_routes.py                          # auto-detect framework
    python extract_routes.py --framework laravel      # Laravel (artisan)
    python extract_routes.py --framework laravel --out routes.json
    python extract_routes.py --file routes/web.php    # parse file directly
    python extract_routes.py --summary                # human-readable

Supports:
    - Laravel   (php artisan route:list --json)
    - Express   (static parse of router files)
    - FastAPI   (static parse of main.py / router files)
    - Django    (static parse of urls.py)
    - Nuxt      (file-based routes from pages/)
"""

import re
import json
import argparse
import subprocess
import sys
import os
from pathlib import Path


# ─── Auth/middleware detection ────────────────────────────────────────────────

AUTH_SIGNALS = re.compile(
    r"\b(?:auth|sanctum|passport|jwt|token|bearer|requires_login|"
    r"login_required|IsAuthenticated|authenticate)\b", re.I
)

ROLE_SIGNALS = re.compile(
    r"\b(?:admin|moderator|staff|superuser|role:|can:|gate:|policy:|"
    r"permission:|hasRole|isAdmin|check\s*\()\b", re.I
)

RATE_LIMIT_SIGNALS = re.compile(
    r"\b(?:throttle|rate.limit|RateLimiter|slowdown)\b", re.I
)

HTTP_METHOD_MAP = {
    "GET":    ["index", "show", "edit"],   # likely read operations
    "POST":   ["store", "create"],
    "PUT":    ["update"],
    "PATCH":  ["update"],
    "DELETE": ["destroy", "delete"],
}


# ─── Laravel ──────────────────────────────────────────────────────────────────

def extract_laravel_routes() -> list[dict]:
    """Run php artisan route:list and parse JSON output."""
    try:
        result = subprocess.run(
            ["php", "artisan", "route:list", "--json"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            print(f"artisan error: {result.stderr}", file=sys.stderr)
            return []

        raw = json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
        print(f"Laravel route extraction failed: {e}", file=sys.stderr)
        return []

    routes = []
    for r in raw:
        method_str = r.get("method", "GET")
        methods = [m.strip() for m in method_str.split("|") if m.strip() not in ("HEAD",)]

        uri = r.get("uri", "")
        name = r.get("name", "")
        action = r.get("action", "")
        middlewares = r.get("middleware", "")
        if isinstance(middlewares, str):
            middlewares = [m.strip() for m in middlewares.split(",") if m.strip()]

        # Parse controller@method
        controller = ""
        controller_method = ""
        if "@" in action:
            parts = action.split("@")
            controller = parts[0].split("\\")[-1]
            controller_method = parts[1]
        elif action not in ("Closure", ""):
            controller = action.split("\\")[-1]

        # Detect auth requirements
        middleware_str = " ".join(middlewares)
        requires_auth = bool(AUTH_SIGNALS.search(middleware_str))
        requires_role = bool(ROLE_SIGNALS.search(middleware_str))

        # Detect URL params
        params = re.findall(r"\{(\w+)\??}", uri)
        has_optional_params = bool(re.search(r"\{\w+\?}", uri))

        # Categorize
        category = _categorize_route(uri, controller_method, methods)

        for method in methods:
            routes.append({
                "method": method,
                "uri": uri,
                "name": name,
                "controller": controller,
                "controller_method": controller_method,
                "middlewares": middlewares,
                "requires_auth": requires_auth,
                "requires_role": requires_role,
                "has_rate_limit": bool(RATE_LIMIT_SIGNALS.search(middleware_str)),
                "url_params": params,
                "has_optional_params": has_optional_params,
                "category": category,
                "framework": "laravel",
            })

    return routes


# ─── Express (Node.js) ────────────────────────────────────────────────────────

EXPRESS_ROUTE = re.compile(
    r"(?:router|app|Route)\.(get|post|put|patch|delete)\s*\(\s*['\"]([^'\"]+)['\"]",
    re.I
)

EXPRESS_MIDDLEWARE = re.compile(
    r"(?:router|app)\.(use|all)\s*\(\s*['\"]([^'\"]*)['\"]",
    re.I
)


def extract_express_routes(search_dirs: list[Path]) -> list[dict]:
    routes = []
    route_files = []

    for d in search_dirs:
        if d.exists():
            route_files.extend(d.rglob("*.js"))
            route_files.extend(d.rglob("*.ts"))

    for file in route_files:
        source = file.read_text(encoding="utf-8", errors="ignore")

        for m in EXPRESS_ROUTE.finditer(source):
            method = m.group(1).upper()
            uri = m.group(2)

            # Guess auth from nearby middleware
            context = source[max(0, m.start()-200):m.end()+200]
            requires_auth = bool(AUTH_SIGNALS.search(context))

            params = re.findall(r":(\w+)", uri)
            routes.append({
                "method": method,
                "uri": uri,
                "name": "",
                "controller": file.stem,
                "controller_method": "",
                "middlewares": [],
                "requires_auth": requires_auth,
                "requires_role": bool(ROLE_SIGNALS.search(context)),
                "has_rate_limit": bool(RATE_LIMIT_SIGNALS.search(context)),
                "url_params": params,
                "has_optional_params": False,
                "category": _categorize_route(uri, "", [method]),
                "framework": "express",
                "source_file": str(file),
            })

    return routes


# ─── FastAPI / Flask (Python) ─────────────────────────────────────────────────

FASTAPI_ROUTE = re.compile(
    r'@(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*[\'"]([^\'"]+)[\'"]',
    re.I
)

FLASK_ROUTE = re.compile(
    r'@(?:app|bp|blueprint)\.(route|get|post|put|patch|delete)\s*\('
    r'\s*[\'"]([^\'"]+)[\'"](?:[^)]*methods\s*=\s*\[([^\]]+)\])?',
    re.I
)


def extract_python_routes(search_dirs: list[Path]) -> list[dict]:
    routes = []
    py_files = []

    for d in search_dirs:
        if d.exists():
            py_files.extend(d.rglob("*.py"))

    for file in py_files:
        source = file.read_text(encoding="utf-8", errors="ignore")

        # FastAPI / Flask @router.get style
        for m in FASTAPI_ROUTE.finditer(source):
            method = m.group(1).upper()
            uri = m.group(2)
            params = re.findall(r"\{(\w+)}", uri)
            context = source[max(0, m.start()-300):m.end()+300]
            requires_auth = bool(AUTH_SIGNALS.search(context))

            routes.append({
                "method": method,
                "uri": uri,
                "name": "",
                "controller": file.stem,
                "controller_method": "",
                "middlewares": [],
                "requires_auth": requires_auth,
                "requires_role": bool(ROLE_SIGNALS.search(context)),
                "has_rate_limit": False,
                "url_params": params,
                "has_optional_params": False,
                "category": _categorize_route(uri, "", [method]),
                "framework": "python",
                "source_file": str(file),
            })

    return routes


# ─── Django ───────────────────────────────────────────────────────────────────

DJANGO_PATH = re.compile(
    r'(?:path|re_path|url)\s*\(\s*[\'"]([^\'"]+)[\'"]',
    re.I
)


def extract_django_routes(search_dirs: list[Path]) -> list[dict]:
    routes = []
    urls_files = []

    for d in search_dirs:
        if d.exists():
            urls_files.extend(d.rglob("urls.py"))

    for file in urls_files:
        source = file.read_text(encoding="utf-8", errors="ignore")
        for m in DJANGO_PATH.finditer(source):
            uri = "/" + m.group(1).lstrip("/")
            params = re.findall(r"<(?:\w+:)?(\w+)>", uri)
            routes.append({
                "method": "ANY",
                "uri": uri,
                "name": "",
                "controller": file.stem,
                "controller_method": "",
                "middlewares": [],
                "requires_auth": False,
                "requires_role": False,
                "has_rate_limit": False,
                "url_params": params,
                "has_optional_params": False,
                "category": _categorize_route(uri, "", ["ANY"]),
                "framework": "django",
                "source_file": str(file),
            })

    return routes


# ─── Nuxt / Next.js (file-based) ─────────────────────────────────────────────

def extract_nuxt_routes(pages_dir: Path) -> list[dict]:
    routes = []
    if not pages_dir.exists():
        return routes

    for file in sorted(pages_dir.rglob("*.vue")) + sorted(pages_dir.rglob("*.tsx")):
        rel = file.relative_to(pages_dir)
        parts = list(rel.parts)

        # Convert filename to route
        uri_parts = []
        for part in parts:
            part = re.sub(r"\.(vue|tsx|jsx|js)$", "", part)
            if part == "index":
                continue
            elif re.match(r"^\[(.+)\]$", part):
                param = re.match(r"^\[(.+)\]$", part).group(1)
                uri_parts.append(f"{{{param}}}")
            else:
                uri_parts.append(part)

        uri = "/" + "/".join(uri_parts) if uri_parts else "/"
        params = re.findall(r"\{(\w+)}", uri)

        routes.append({
            "method": "GET",
            "uri": uri,
            "name": str(rel),
            "controller": str(file),
            "controller_method": "",
            "middlewares": [],
            "requires_auth": False,
            "requires_role": False,
            "has_rate_limit": False,
            "url_params": params,
            "has_optional_params": False,
            "category": "Page",
            "framework": "nuxt",
            "source_file": str(file),
        })

    return routes


# ─── Categorization ───────────────────────────────────────────────────────────

def _categorize_route(uri: str, method_name: str, http_methods: list) -> str:
    uri_lower = uri.lower()
    method_lower = method_name.lower()

    if any(w in uri_lower for w in ("/auth/", "/login", "/logout", "/register", "/password")):
        return "Auth"
    if any(w in uri_lower for w in ("/admin/", "/dashboard/", "/manage/")):
        return "Admin"
    if any(w in uri_lower for w in ("/api/", "/v1/", "/v2/")):
        return "API"
    if "webhook" in uri_lower:
        return "Webhook"

    # CRUD detection
    if "GET" in http_methods and not any(p in uri for p in ["{", "edit"]):
        return "List"
    if "GET" in http_methods and "{" in uri:
        return "Detail"
    if "POST" in http_methods:
        return "Create"
    if any(m in http_methods for m in ("PUT", "PATCH")):
        return "Update"
    if "DELETE" in http_methods:
        return "Delete"

    return "Other"


def _group_routes(routes: list[dict]) -> dict:
    """Group routes by URI prefix for flow mapping."""
    groups = {}
    for route in routes:
        uri = route["uri"]
        parts = uri.strip("/").split("/")
        prefix = parts[0] if parts else "root"
        groups.setdefault(prefix, []).append(route)
    return groups


def _suggest_flows(grouped: dict) -> list[dict]:
    """Suggest testable user flows from grouped routes."""
    flows = []
    for prefix, routes in grouped.items():
        methods = [r["method"] for r in routes]
        has_crud = all(m in methods for m in ("GET", "POST"))
        has_full_crud = all(m in methods for m in ("GET", "POST", "PUT", "DELETE"))

        flow_name = prefix.replace("-", " ").replace("_", " ").title()

        if has_full_crud:
            flows.append({
                "prefix": prefix,
                "suggested_flow": f"{flow_name} management (CRUD)",
                "routes": len(routes),
                "requires_auth": any(r["requires_auth"] for r in routes),
                "priority": "HIGH",
            })
        elif has_crud:
            flows.append({
                "prefix": prefix,
                "suggested_flow": f"{flow_name} (create + list)",
                "routes": len(routes),
                "requires_auth": any(r["requires_auth"] for r in routes),
                "priority": "MEDIUM",
            })
        else:
            flows.append({
                "prefix": prefix,
                "suggested_flow": f"{flow_name} endpoint",
                "routes": len(routes),
                "requires_auth": any(r["requires_auth"] for r in routes),
                "priority": "LOW",
            })

    return sorted(flows, key=lambda f: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[f["priority"]])


# ─── Auto-detect ──────────────────────────────────────────────────────────────

def auto_detect_framework() -> str:
    cwd = Path.cwd()
    if (cwd / "artisan").exists():
        return "laravel"
    if (cwd / "manage.py").exists():
        return "django"
    if any((cwd / f).exists() for f in ("nuxt.config.js", "nuxt.config.ts")):
        return "nuxt"
    if any((cwd / f).exists() for f in ("next.config.js", "next.config.ts")):
        return "nuxt"  # treat similarly
    if (cwd / "package.json").exists():
        return "express"
    if any((cwd / f).exists() for f in ("main.py", "app.py")):
        return "python"
    return "unknown"


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Extract routes from any framework for test planning."
    )
    parser.add_argument(
        "--framework",
        choices=["laravel", "express", "fastapi", "django", "nuxt", "auto"],
        default="auto",
        help="Framework (default: auto-detect)"
    )
    parser.add_argument("--file", help="Specific route file to parse")
    parser.add_argument("--dir", default=".", help="Project root directory")
    parser.add_argument("--out", default=None, help="Output JSON file")
    parser.add_argument("--summary", action="store_true", help="Human-readable output")
    args = parser.parse_args()

    project_dir = Path(args.dir)
    os.chdir(project_dir)

    framework = args.framework
    if framework == "auto":
        framework = auto_detect_framework()
        print(f"Detected framework: {framework}", file=sys.stderr)

    if framework == "laravel":
        routes = extract_laravel_routes()
    elif framework in ("express",):
        search_dirs = [project_dir / "routes", project_dir / "src" / "routes",
                       project_dir / "api"]
        routes = extract_express_routes(search_dirs)
    elif framework in ("fastapi", "flask", "python"):
        search_dirs = [project_dir / "routes", project_dir / "api",
                       project_dir / "app", project_dir]
        routes = extract_python_routes(search_dirs)
    elif framework == "django":
        search_dirs = [project_dir]
        routes = extract_django_routes(search_dirs)
    elif framework == "nuxt":
        pages_dir = project_dir / "pages"
        routes = extract_nuxt_routes(pages_dir)
    else:
        print(f"Could not detect framework in {project_dir}. Use --framework.", file=sys.stderr)
        sys.exit(1)

    grouped = _group_routes(routes)
    suggested_flows = _suggest_flows(grouped)

    output = {
        "framework": framework,
        "total_routes": len(routes),
        "suggested_flows": suggested_flows,
        "routes_by_group": grouped,
        "all_routes": routes,
    }

    if args.summary:
        print(f"\n{'='*60}")
        print(f"Routes: {project_dir} ({framework})")
        print(f"{'='*60}")
        print(f"Total routes: {len(routes)}")
        print(f"\nSuggested test flows:")
        for flow in suggested_flows:
            auth_tag = " [auth]" if flow["requires_auth"] else ""
            priority_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}[flow["priority"]]
            print(f"  {priority_emoji} {flow['suggested_flow']}{auth_tag}  ({flow['routes']} routes)")
        print(f"\nAll routes:")
        for r in routes:
            auth_tag = " 🔒" if r["requires_auth"] else ""
            print(f"  {r['method']:<8} {r['uri']}{auth_tag}")
            if r.get("controller"):
                print(f"           → {r['controller']}@{r.get('controller_method', '')}")
    else:
        json_output = json.dumps(output, indent=2, ensure_ascii=False)
        if args.out:
            Path(args.out).write_text(json_output, encoding="utf-8")
            print(f"Routes → {args.out}", file=sys.stderr)
        else:
            print(json_output)


if __name__ == "__main__":
    main()
