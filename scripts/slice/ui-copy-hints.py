#!/usr/bin/env python3
"""ui-copy-hints.py — review hints for user-visible text in a diff (owner decision 2026-10-27; method/PRODUCT_LANGUAGE.md).

  ui-copy-hints.py [--base <ref> [--head HEAD] | --diff <file|->] [--repo .] [--config slice-method.json]
                   [--profiles <user-profiles.md>] [--profile <name>] [--long-words 25]

Reads the added lines of a diff (git diff <base>...<head>, or a unified diff file / stdin) and lists:
  - visible-looking strings (quoted literals, text between tags) that contain a term from the host profile file's
    "### Kafa karıştırabilecek terimler" list (all profiles, or only "## Profil: <name>" with --profile);
  - visible-looking strings of at least --long-words words (long explanatory paragraphs).
The profile file comes from --profiles, else slice-method.json "user_profiles" (relative to the repo root).

It only WARNS: exit 0 with or without hints. Exit 2 is a usage error (bad arguments, unreadable diff or --profiles
file, git failure). A listed term is a review hint, not a ban: the word can be right in its context.
Matching is case-insensitive at the start of a word (suffixes count: "term" matches "terms"); dotted/dotless I are
folded both ways, so Turkish casing is approximated, not exact. Markdown files and docs/ paths are skipped.
"""
import json
import os
import re
import subprocess
import sys

TERMS_HEADING = "kafa karıştırabilecek terimler"
PROFILE_RE = re.compile(r"^##\s+Profil:\s*(.+?)\s*$")
STRING_RE = re.compile(r'"((?:[^"\\]|\\.)*)"|\'((?:[^\'\\]|\\.)*)\'|`([^`]*)`')
TAG_TEXT_RE = re.compile(r">([^<>]+)<")
MARKUP_EXT = (".html", ".htm", ".vue", ".svelte", ".jsx", ".tsx", ".twig", ".erb", ".hbs", ".mustache", ".xml")
SKIP_RE = re.compile(r"(^|/)docs/|\.md$")
TEST_RE = re.compile(r"(^|/)(tests?|__tests__|spec)/|\.(test|spec)\.[A-Za-z]+$|Test\.[A-Za-z]+$")


def die(msg):
    print(f"ui-copy-hints: {msg}", file=sys.stderr)
    sys.exit(2)


def parse_args(argv):
    o = {"base": "", "head": "HEAD", "diff": "", "repo": ".", "config": "", "profiles": "", "profile": "", "long": 25}
    i = 0
    keys = {"--base": "base", "--head": "head", "--diff": "diff", "--repo": "repo", "--config": "config",
            "--profiles": "profiles", "--profile": "profile", "--long-words": "long"}
    while i < len(argv):
        a = argv[i]
        if a in ("-h", "--help"):
            print(__doc__)
            sys.exit(0)
        if a not in keys or i + 1 >= len(argv):
            die(f"unknown or incomplete argument: {a}")
        o[keys[a]] = argv[i + 1]
        i += 2
    try:
        o["long"] = int(o["long"])
    except ValueError:
        die("--long-words takes an integer")
    if o["long"] < 1:
        die("--long-words must be >= 1")
    if bool(o["base"]) == bool(o["diff"]):
        die("give exactly one of --base <ref> or --diff <file|->")
    return o


def fold(s):
    """Two case-folded forms: dotted I -> i, and additionally I -> dotless ı (Turkish)."""
    s = s.replace("İ", "i")
    return s.casefold(), s.replace("I", "ı").casefold()


def read_terms(path, only):
    """{term: profile} from every "### Kafa karıştırabilecek terimler" list (or only profile `only`)."""
    terms = {}
    profile, in_list = "", False
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.rstrip("\n")
            m = PROFILE_RE.match(line)
            if m:
                profile, in_list = m.group(1), False
                continue
            if line.startswith("#"):
                in_list = line.lstrip("#").strip().casefold() == TERMS_HEADING.casefold()
                continue
            if not in_list or (only and profile != only):
                continue
            b = re.match(r"^\s*[-*]\s+(.+?)\s*$", line)
            if b:
                term = b.group(1).strip("`\"' ")
                if term and not term.startswith("<"):
                    terms.setdefault(term, profile or "?")
    return terms


def term_regexes(terms):
    out = []
    for term, prof in terms.items():
        a, b = fold(term)
        out.append((term, prof, re.compile(r"(?<!\w)" + re.escape(a)), re.compile(r"(?<!\w)" + re.escape(b))))
    return out


def candidates(path, text):
    """Visible-looking strings on one added line."""
    found = [next(g for g in m.groups() if g is not None) for m in STRING_RE.finditer(text)]
    found += [t for t in TAG_TEXT_RE.findall(text)]
    if not found and path.lower().endswith(MARKUP_EXT):
        bare = re.sub(r"<[^>]*>", " ", text).strip()
        if bare:
            found.append(bare)
    return [c.strip() for c in found if re.search(r"[^\W\d_]{2,}", c or "")]


def added_lines(diff_text):
    path, n = "", 0
    for line in diff_text.splitlines():
        if line.startswith("+++ "):
            p = line[4:].strip()
            path = "" if p == "/dev/null" else re.sub(r"^b/", "", p)
            continue
        h = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@", line)
        if h:
            n = int(h.group(1))
            continue
        if line.startswith("+"):
            yield path, n, line[1:]
            n += 1
        elif line.startswith(" "):
            n += 1


def snippet(s, width=90):
    s = " ".join(s.split())
    return s if len(s) <= width else s[: width - 1] + "…"


def main():
    o = parse_args(sys.argv[1:])
    repo = os.path.abspath(o["repo"])
    if o["diff"]:
        try:
            diff_text = sys.stdin.read() if o["diff"] == "-" else open(o["diff"], encoding="utf-8").read()
        except OSError as e:
            die(f"cannot read diff: {e}")
    else:
        r = subprocess.run(["git", "-C", repo, "diff", "--no-color", "--unified=0", f"{o['base']}...{o['head']}"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            die(f"git diff failed: {r.stderr.strip()}")
        diff_text = r.stdout

    profiles = o["profiles"]
    if profiles:
        if not os.path.isfile(profiles):
            die(f"--profiles file not found: {profiles}")
    else:
        cfg = o["config"] or os.path.join(repo, "slice-method.json")
        try:
            rel = json.load(open(cfg, encoding="utf-8")).get("user_profiles", "")
        except (OSError, ValueError):
            rel = ""
        cand = os.path.join(repo, rel) if rel else ""
        if cand and os.path.isfile(cand):
            profiles = cand
        else:
            print("note: no user profile file (slice-method.json \"user_profiles\" or --profiles); term hints skipped")
    terms = read_terms(profiles, o["profile"]) if profiles else {}
    if profiles and not terms:
        print(f"note: no terms under \"### Kafa karıştırabilecek terimler\" in {profiles}"
              + (f" for profile {o['profile']}" if o["profile"] else ""))
    regs = term_regexes(terms)

    hints = 0
    for path, n, text in added_lines(diff_text):
        if not path or SKIP_RE.search(path):
            continue
        tag = " (test)" if TEST_RE.search(path) else ""
        seen = set()
        for c in dict.fromkeys(candidates(path, text)):
            a, b = fold(c)
            for term, prof, ra, rb in regs:
                if term not in seen and (ra.search(a) or rb.search(b)):
                    seen.add(term)
                    print(f"WARN {path}:{n}{tag} term \"{term}\" ({prof}): {snippet(c)}")
                    hints += 1
            words = len(c.split())
            if words >= o["long"]:
                print(f"WARN {path}:{n}{tag} long text ({words} words): {snippet(c)}")
                hints += 1
    print(f"UI-COPY-HINTS: {hints} hint(s) — review hints only, not a verdict (method/PRODUCT_LANGUAGE.md)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
