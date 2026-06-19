#!/usr/bin/env python3
"""
suggest_flows.py — Analyze route structure and source files to suggest
user flow groups for test-user-flow-mapper. Groups routes into likely
user journeys, detects actors, and prioritizes by risk.

Usage:
    python suggest_flows.py [options]
    python suggest_flows.py                          # auto-detect, print flows
    python suggest_flows.py --out flows.json
    python suggest_flows.py --routes routes.json     # from extract_routes.py
    python suggest_flows.py --summary
"""

import json
import re
import sys
import argparse
import subprocess
from pathlib import Path


# ─── Actor detection ──────────────────────────────────────────────────────────

ACTOR_PATTERNS = {
    "Guest":    re.compile(r"\b(?:guest|public|unauthenticated|register|login)\b", re.I),
    "User":     re.compile(r"\b(?:user|member|account|profile|dashboard)\b", re.I),
    "Admin":    re.compile(r"\b(?:admin|administrator|manage|staff|backoffice)\b", re.I),
    "Editor":   re.compile(r"\b(?:editor|author|writer|publish|content)\b", re.I),
    "API":      re.compile(r"\b(?:api|v1|v2|v3|webhook|callback|token)\b", re.I),
}

# Critical flow keywords (get HIGH priority automatically)
CRITICAL_KEYWORDS = re.compile(
    r"\b(?:payment|billing|checkout|subscribe|charge|auth|login|register|"
    r"password|token|publish|send|distribute|delete|destroy|export)\b", re.I
)

# Flow grouping patterns — map URI prefixes to friendly names
KNOWN_FLOW_NAMES = {
    "auth":             "Authentication",
    "login":            "Login",
    "register":         "Registration",
    "password":         "Password Reset",
    "profile":          "User Profile",
    "dashboard":        "Dashboard",
    "admin":            "Admin Panel",
    "api":              "API",
    "press-releases":   "Press Release Management",
    "press_releases":   "Press Release Management",
    "orders":           "Order Management",
    "checkout":         "Checkout",
    "payments":         "Payments",
    "subscriptions":    "Subscription Management",
    "notifications":    "Notifications",
    "settings":         "Settings",
    "users":            "User Management",
    "media":            "Media Upload",
    "files":            "File Management",
    "search":           "Search",
    "reports":          "Reports",
    "webhooks":         "Webhooks",
}


# ─── Flow builder ─────────────────────────────────────────────────────────────

def routes_to_flows(routes_data: dict) -> list[dict]:
    """Build user flow suggestions from route data."""
    routes = routes_data.get("all_routes", [])
    flows = []

    # Group by URI prefix
    groups: dict[str, list] = {}
    for route in routes:
        uri = route.get("uri", "").strip("/")
        parts = uri.split("/")
        prefix = parts[0] if parts else "root"
        # Normalize api versioning: api/v1/users → users
        if prefix in ("api", "v1", "v2", "v3") and len(parts) > 1:
            prefix = parts[1] if len(parts) > 1 else prefix
        groups.setdefault(prefix, []).append(route)

    for prefix, group_routes in groups.items():
        flow = _build_flow(prefix, group_routes)
        flows.append(flow)

    # Sort: CRITICAL first, then HIGH, then by route count
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    flows.sort(key=lambda f: (priority_order.get(f["priority"], 4), -f["route_count"]))

    return flows


def _build_flow(prefix: str, routes: list) -> dict:
    friendly_name = KNOWN_FLOW_NAMES.get(prefix, prefix.replace("-", " ").replace("_", " ").title())

    # Detect HTTP methods
    methods = set(r["method"] for r in routes)
    has_get  = "GET" in methods
    has_post = "POST" in methods
    has_put  = any(m in methods for m in ("PUT", "PATCH"))
    has_del  = "DELETE" in methods

    # Detect CRUD completeness
    if has_get and has_post and has_put and has_del:
        flow_type = "Full CRUD"
    elif has_get and has_post:
        flow_type = "Create + List"
    elif has_get and has_del:
        flow_type = "View + Delete"
    elif has_get:
        flow_type = "Read-only"
    elif has_post:
        flow_type = "Submit-only"
    else:
        flow_type = "Mixed"

    # Detect actors
    all_text = " ".join([prefix] + [r.get("uri", "") for r in routes] + [r.get("controller", "") for r in routes])
    actors = [actor for actor, pattern in ACTOR_PATTERNS.items() if pattern.search(all_text)]
    if not actors:
        # Guess from auth middleware
        if any(r.get("requires_auth") for r in routes):
            actors = ["User"]
        else:
            actors = ["Guest", "User"]

    # Determine priority
    requires_auth = any(r.get("requires_auth") for r in routes)
    has_role = any(r.get("requires_role") for r in routes)
    is_critical = bool(CRITICAL_KEYWORDS.search(all_text))

    if is_critical or any(w in prefix for w in ("payment", "auth", "checkout", "billing")):
        priority = "CRITICAL"
    elif requires_auth and (has_post or has_del):
        priority = "HIGH"
    elif has_post or has_put:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    # Build step suggestions
    steps = _suggest_steps(friendly_name, flow_type, routes, actors)

    # Detect what needs to be tested
    test_concerns = _identify_test_concerns(routes, actors, is_critical)

    return {
        "prefix": prefix,
        "name": friendly_name,
        "flow_type": flow_type,
        "priority": priority,
        "route_count": len(routes),
        "actors": actors,
        "requires_auth": requires_auth,
        "requires_role": has_role,
        "steps": steps,
        "test_concerns": test_concerns,
        "routes": [
            {
                "method": r["method"],
                "uri": r["uri"],
                "controller": r.get("controller", ""),
                "controller_method": r.get("controller_method", ""),
                "requires_auth": r.get("requires_auth", False),
            }
            for r in routes
        ],
    }


def _suggest_steps(flow_name: str, flow_type: str, routes: list, actors: list) -> list[str]:
    steps = []

    if "Auth" in flow_name or "Login" in flow_name:
        steps = [
            "User visits login page (GET /login)",
            "User submits credentials (POST /login)",
            "System validates credentials",
            "Success: redirect to dashboard",
            "Failure: show validation errors",
        ]
    elif "Registration" in flow_name:
        steps = [
            "Guest visits registration page",
            "Guest fills form and submits",
            "System validates input",
            "System creates account",
            "System sends welcome email",
            "User is redirected/logged in",
        ]
    elif "Password" in flow_name:
        steps = [
            "User requests password reset",
            "System sends reset email",
            "User clicks reset link (token validated)",
            "User sets new password",
            "System confirms reset",
        ]
    elif flow_type == "Full CRUD":
        steps = [
            f"User views {flow_name} list",
            f"User opens create {flow_name} form",
            f"User submits form (validation + store)",
            f"User views individual {flow_name} detail",
            f"User edits and updates {flow_name}",
            f"User deletes {flow_name} (with confirmation)",
        ]
    elif flow_type == "Create + List":
        steps = [
            f"User views {flow_name} list",
            f"User opens create form",
            f"User fills and submits form",
            f"System validates and stores",
            f"User sees updated list",
        ]
    else:
        steps = [
            f"Actor initiates {flow_name} action",
            f"System processes request",
            f"System responds with result",
        ]

    return steps


def _identify_test_concerns(routes: list, actors: list, is_critical: bool) -> list[str]:
    concerns = []

    has_auth = any(r.get("requires_auth") for r in routes)
    has_role = any(r.get("requires_role") for r in routes)
    has_post = any(r["method"] == "POST" for r in routes)
    has_del  = any(r["method"] == "DELETE" for r in routes)
    has_params = any(r.get("url_params") for r in routes)

    if has_auth:
        concerns.append("Authentication: test unauthenticated access → 401/redirect")
    if has_role:
        concerns.append("Authorization: test insufficient role → 403")
    if has_post:
        concerns.append("Validation: test invalid form input → 422 errors")
    if has_del:
        concerns.append("Deletion: test soft-delete vs hard-delete, cascade effects")
    if has_params:
        concerns.append("Not found: test invalid/missing URL params → 404")
    if is_critical:
        concerns.append("CRITICAL: test failure rollback / transaction integrity")

    if not concerns:
        concerns.append("Happy path: verify basic flow succeeds")

    return concerns


# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Suggest user flows from route structure for test planning."
    )
    parser.add_argument("--routes", default=None,
                        help="routes.json from extract_routes.py (or auto-extract)")
    parser.add_argument("--dir", default=".", help="Project root directory")
    parser.add_argument("--out", default=None, help="Output JSON file")
    parser.add_argument("--summary", action="store_true", help="Human-readable output")
    args = parser.parse_args()

    # Load or extract routes
    if args.routes:
        routes_data = json.loads(Path(args.routes).read_text())
    else:
        # Auto-extract using extract_routes.py
        scripts_dir = Path(__file__).parent
        planner_scripts = scripts_dir.parent.parent / "test-case-planner" / "scripts"
        extract_script = planner_scripts / "extract_routes.py"

        if not extract_script.exists():
            extract_script = scripts_dir.parent / "test-case-planner" / "scripts" / "extract_routes.py"

        if extract_script.exists():
            result = subprocess.run(
                ["python3", str(extract_script), "--dir", args.dir],
                capture_output=True, text=True
            )
            if result.returncode == 0 and result.stdout.strip():
                routes_data = json.loads(result.stdout)
            else:
                print(f"Route extraction failed: {result.stderr}", file=sys.stderr)
                routes_data = {"all_routes": [], "framework": "unknown"}
        else:
            print("extract_routes.py not found. Use --routes to provide routes.json", file=sys.stderr)
            routes_data = {"all_routes": [], "framework": "unknown"}

    flows = routes_to_flows(routes_data)

    output = {
        "framework": routes_data.get("framework", "unknown"),
        "total_flows": len(flows),
        "total_routes": routes_data.get("total_routes", 0),
        "flows": flows,
    }

    if args.summary:
        priority_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢"}

        print(f"\n{'='*60}")
        print(f"User Flow Suggestions — {output['framework']}")
        print(f"{'='*60}")
        print(f"{output['total_routes']} routes → {output['total_flows']} flows")
        print(f"")

        for flow in flows:
            p = flow["priority"]
            emoji = priority_emoji.get(p, "⚪")
            auth_tag = " 🔒" if flow["requires_auth"] else ""
            print(f"{emoji} [{p}] {flow['name']}{auth_tag}")
            print(f"   Type: {flow['flow_type']}  |  Actors: {', '.join(flow['actors'])}")
            print(f"   Routes ({flow['route_count']}):", ", ".join(
                f"{r['method']} {r['uri']}" for r in flow['routes'][:3]
            ) + ("..." if len(flow['routes']) > 3 else ""))
            print(f"   Steps:")
            for step in flow['steps'][:4]:
                print(f"     • {step}")
            if len(flow['steps']) > 4:
                print(f"     • ... +{len(flow['steps']) - 4} more")
            print(f"   Test concerns:")
            for concern in flow['test_concerns']:
                print(f"     ⚠ {concern}")
            print()
    else:
        json_output = json.dumps(output, indent=2, ensure_ascii=False)
        if args.out:
            Path(args.out).write_text(json_output, encoding="utf-8")
            print(f"Flows → {args.out}", file=sys.stderr)
        else:
            print(json_output)


if __name__ == "__main__":
    main()
