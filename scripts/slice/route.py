#!/usr/bin/env python3
"""route.py — size work from facts, not names (owner decision 2026-10-25; method/SLICE_LANE.md "Sizing from the diff").

  route.py card <intake-card.md> [--config slice-method.json] [--log <jsonl>]
      Reads the six facts of templates/slice/intake-card.md and prints the route line:
      "Yol: native | HAFIF | TAM — <reason>". Exit 0.

  route.py check --base <ref> --declared native|HAFIF|TAM [--head HEAD] [--repo .] [--config slice-method.json]
                 [--profile <stack-profile.json>] [--log <jsonl>]
      Classifies the actual diff with the same facts (path rules) and compares it with the declared route.
      Exit 0 OK, 0 with OVER_CEREMONY warning, 1 ROUTE_UP (the diff needs a heavier route), 2 usage/config error.

Routing table: any risk fact (money, permissions, personal data, schema/lock) -> TAM; no risk fact, reversible,
single surface and at most `native_max_files` files -> native; otherwise HAFIF. A docs-only diff is native.
Path rules ("routing.risk_paths", regular expressions per fact) come from the stack profile; slice-method.json "routing"
extends them (or replaces them per fact with "risk_paths_mode": "replace"). Size counts only files that are not docs
or "exclude_paths" (generated evidence); risk rules apply to code, not to "test_paths". Path rules are a floor, not
proof of safety: a reviewer still answers A7.
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

RANK = {"native": 0, "HAFIF": 1, "TAM": 2}
FACTS = ["money", "permissions", "personal_data", "schema"]
DEFAULT_ROUTING = {
    "native_max_files": 3,
    "docs_paths": [r"(^|/)docs/", r"\.md$", r"\.txt$"],
    # tests count as tests: a risk word in a test file name is not a risk fact (stacks add their own test patterns)
    "test_paths": [r"(^|/)tests?/", r"(^|/)__tests__/", r"\.(test|spec)\.[A-Za-z]+$"],
    # never counted for size (generated evidence, lock files); docs paths are not counted either
    "exclude_paths": [],
    "risk_paths": {},
    # "extend" (default): host patterns add to the stack's; "replace": host patterns replace them per fact
    "risk_paths_mode": "extend",
}


def die(msg, code=2):
    print(f"route.py: {msg}", file=sys.stderr)
    sys.exit(code)


def load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as exc:
        die(f"invalid JSON in {path}: {exc}")


def routing_config(config_path, profile_path):
    cfg = json.loads(json.dumps(DEFAULT_ROUTING))
    method = load_json(config_path) if config_path else {}
    profile_file = profile_path or method.get("stack_profile")
    if profile_file:
        base = os.path.dirname(config_path) if config_path else "."
        profile = load_json(profile_file if os.path.isabs(profile_file) else os.path.join(base, profile_file))
        merge(cfg, profile.get("routing", {}))
    merge(cfg, method.get("routing", {}))
    for key in ("docs_paths", "test_paths", "exclude_paths"):
        for pattern in cfg[key]:
            try:
                re.compile(pattern)
            except re.error as exc:
                die(f"bad pattern in routing.{key}: {pattern} ({exc})")
    for fact, patterns in cfg["risk_paths"].items():
        if fact not in FACTS:
            die(f"unknown fact in routing.risk_paths: {fact}")
        for pattern in patterns:
            try:
                re.compile(pattern)
            except re.error as exc:
                die(f"bad pattern for {fact}: {pattern} ({exc})")
    return cfg


def merge(target, source):
    mode = source.get("risk_paths_mode", target.get("risk_paths_mode", "extend"))
    if mode not in ("extend", "replace"):
        die(f"routing.risk_paths_mode must be extend or replace, got {mode!r}")
    for key, value in source.items():
        if key == "risk_paths":
            for fact, patterns in value.items():
                if mode == "extend":
                    target["risk_paths"][fact] = list(dict.fromkeys(target["risk_paths"].get(fact, []) + list(patterns)))
                else:
                    target["risk_paths"][fact] = list(patterns)
        elif key in ("test_paths", "exclude_paths", "docs_paths") and mode == "extend":
            target[key] = list(dict.fromkeys(target.get(key, []) + list(value)))
        else:
            target[key] = value


def decide(facts, files, reversible, single_surface, native_max):
    hits = [f for f in FACTS if facts.get(f)]
    if hits:
        return "TAM", "risk fact: " + ", ".join(hits)
    if reversible and single_surface and files <= native_max:
        return "native", f"no risk fact, reversible single surface, {files} file(s)"
    return "HAFIF", f"no risk fact, {files} file(s)"


def log(path, entry):
    if not path:
        return
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    entry = {"at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), **entry}
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


YES = re.compile(r"^\s*(evet|yes)\b", re.I)
NO = re.compile(r"^\s*(hay[ıi]r|no)\b", re.I)


def parse_card(path):
    rows = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            m = re.match(r"^\|\s*(G[1-6])\s*\|[^|]*\|([^|]*)\|", line)
            if m:
                rows[m.group(1)] = m.group(2).strip()
    missing = [g for g in ["G1", "G2", "G3", "G4", "G5", "G6"] if g not in rows]
    if missing:
        die(f"intake card is missing rows: {', '.join(missing)}")

    def yn(key):
        value = rows[key]
        if YES.match(value):
            return True
        if NO.match(value):
            return False
        die(f"{key} must start with evet/hayır (yes/no), got: {value!r}")

    count = re.search(r"\d+", rows["G1"])
    if not count:
        die("G1 must state an expected file count (a number)")
    facts = {"money": yn("G2"), "permissions": yn("G3"), "personal_data": yn("G4"), "schema": yn("G5")}
    return facts, int(count.group(0)), yn("G6")


def cmd_card(args):
    if not args.get("card"):
        die("usage: route.py card <intake-card.md> [--config f] [--log f]")
    cfg = routing_config(args.get("config"), args.get("profile"))
    facts, files, reversible = parse_card(args["card"])
    route, reason = decide(facts, files, reversible, reversible, cfg["native_max_files"])
    print(f"Yol: {route} — {reason}")
    log(args.get("log"), {"kind": "card", "card": args["card"], "route": route, "reason": reason, "facts": facts, "files": files})
    return 0


def changed_files(repo, base, head):
    try:
        out = subprocess.run(["git", "-C", repo, "diff", "--name-only", f"{base}...{head}"],
                             check=True, capture_output=True, text=True).stdout
    except subprocess.CalledProcessError as exc:
        die(f"git diff failed: {exc.stderr.strip()}")
    return [line for line in out.splitlines() if line.strip()]


def cmd_check(args):
    declared = args.get("declared")
    if declared not in RANK or not args.get("base"):
        die("usage: route.py check --base <ref> --declared native|HAFIF|TAM [--head HEAD] [--repo .]")
    cfg = routing_config(args.get("config"), args.get("profile"))
    files = changed_files(args.get("repo", "."), args["base"], args.get("head", "HEAD"))
    def matcher(key):
        pats = [re.compile(p) for p in cfg[key]]
        return lambda f: any(p.search(f) for p in pats)

    is_doc, is_test, is_excluded = matcher("docs_paths"), matcher("test_paths"), matcher("exclude_paths")
    counted = [f for f in files if not is_doc(f) and not is_excluded(f)]
    code = [f for f in counted if not is_test(f)]
    facts, evidence = {}, {}
    for fact in FACTS:
        pats = [re.compile(p) for p in cfg["risk_paths"].get(fact, [])]
        hit = [f for f in code if any(p.search(f) for p in pats)]
        facts[fact] = bool(hit)
        if hit:
            evidence[fact] = hit[:5]
    if not counted:
        required, reason = "native", "docs-only diff"
    else:
        required, reason = decide(facts, len(counted), True, True, cfg["native_max_files"])
        if not code:
            reason += " (tests only)"
    if RANK[required] > RANK[declared]:
        verdict, code = "ROUTE_UP", 1
    elif RANK[declared] == RANK["TAM"] and required == "native":
        verdict, code = "OVER_CEREMONY", 0
    else:
        verdict, code = "OK", 0
    result = {"kind": "check", "declared": declared, "required": required, "verdict": verdict, "reason": reason,
              "files": len(files), "counted": len(counted), "evidence": evidence}
    print(json.dumps(result, ensure_ascii=False))
    if verdict == "ROUTE_UP":
        print(f"ROUTE_UP: declared {declared}, the diff needs {required} ({reason}); stop and re-route", file=sys.stderr)
    elif verdict == "OVER_CEREMONY":
        print(f"OVER_CEREMONY: declared TAM for a {required} diff ({reason}); consider a lighter route next time",
              file=sys.stderr)
    log(args.get("log"), result)
    return code


def parse(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    sub, rest, args = argv[0], argv[1:], {}
    i = 0
    while i < len(rest):
        a = rest[i]
        if a.startswith("--"):
            if i + 1 >= len(rest):
                die(f"{a} needs a value")
            args[a[2:]] = rest[i + 1]
            i += 2
        else:
            args["card"] = a
            i += 1
    return sub, args


def main():
    sub, args = parse(sys.argv[1:])
    if sub == "card":
        return cmd_card(args)
    if sub == "check":
        return cmd_check(args)
    die(f"unknown command: {sub} (card|check)")


if __name__ == "__main__":
    sys.exit(main())
