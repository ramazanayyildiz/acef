#!/usr/bin/env python3
"""review-r2.py — the targeted re-review brief is generated, narrow by default (owner decision 2026-11-03;
method/SLICE_LANE.md step 5).

  review-r2.py brief --slice <slice.md> --review <r1 report.md> [--review <report.md>]... --reviewed <sha>
                     (--session <r1 reviewer session> | --session-gone "<why that session is gone>")
                     [--head HEAD] [--slice-base <sha>] [--scope narrow|full] [--reason <reason>] [--round 2]
                     [--repo .] [--config <repo>/slice-method.json] [--profile <stack-profile.json>]
                     [--template <review-r2.md>] [--out <file>]
      Fills templates/slice/review-r2.md for round <n> from the r1 report(s), the fix diff (<reviewed>..<head>) and
      the slice file: every previous finding with its fix hunk; "Where these fixes meet" (fixes that share a file or
      function, one test asked at each intersection); the affected tests (route.py routing.test_map; an unmapped code
      file adds routing.test_map_fallback, the wider set); mutations on the fixed lines; the slice's race tests; the
      contract set when the fix touches its areas. Target: the same reviewer session (--session); a fresh session only
      with --session-gone, and the brief says so.
      Scope is narrow unless --scope full --reason <reason>, reason one of: personal-data, tenant, permissions, money,
      schema, fix-larger-than-slice, redesign. A fix whose code files hit a route.py risk path rule (personal_data,
      permissions, money, schema), or whose code lines reach review.r2_full_ratio (default 0.5) of the slice's code
      lines (slice base..reviewed), cannot be narrow: SCOPE_UP, exit 1, nothing written. The slice base comes from
      the slice's "Dal / taban" line or --slice-base.
      Exit 0 written, 1 SCOPE_UP, 2 usage, config or git error.

  review-r2.py check <report.md>... [--config <slice-method.json>] [--profile <stack-profile.json>]
      Round >= 2 (file name "review-r<n>", else "(r<n>)" in the title; otherwise round 1): FAIL without a
      "Review scope: narrow|full — <reason>" line, on "full" without a listed reason, without a
      "Reviewer session: same|fresh" line, or on "fresh" without "session gone: <why>". Every round: WARN when the
      report shows a full-suite run (a gate.sh summary line, the stack profile's bare test_command,
      review.full_suite_patterns). One line per finding, then per file:
      R2-CHECK PASS|FAIL round=<n> scope=<narrow|full|missing> session=<same|fresh|missing> warn=<n> <file>
      Exit 0 no FAIL (warnings allowed), 1 at least one FAIL, 2 usage or unreadable file.
"""
import datetime
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # route.py sits next to this file (ACEF and hosts)
import route  # noqa: E402

REASONS = ["personal-data", "tenant", "permissions", "money", "schema", "fix-larger-than-slice", "redesign"]
FACT_REASONS = {"personal_data": ["personal-data"], "permissions": ["permissions", "tenant"], "money": ["money"],
                "schema": ["schema"]}
DEFAULT_RATIO = 0.5
NEAR = 10            # lines around a cited line that still count as "at the cited line"
HUNK_SHOW = 80       # hunk lines printed per hunk
FENCE = re.compile(r"^[ \t]*(```|~~~)")         # what codex-review.sh's verdict reader toggles on (show_hunk)
FENCE_OPEN = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
REASON_TOKEN = re.compile(r"(" + "|".join(map(re.escape, REASONS)) + r")(?=$|[\s:;,.(])")
SCOPE_LINE = re.compile(r"^Review scope:[ \t]*(\S*)[ \t]*(?:[—–-][ \t]*(.*?))?[ \t]*$")
SESSION_LINE = re.compile(r"^Reviewer session:[ \t]*(\S*)[ \t]*(?:[—–-][ \t]*(.*?))?[ \t]*$")
GATE_SUMMARY = re.compile(r"GATE (PASS|FAIL|INCOMPLETE) [0-9a-f]{7,}(\+dirty)? (light|full) ")
KNOWN = {"slice", "review", "reviewed", "head", "slice-base", "scope", "reason", "round", "session", "session-gone",
         "repo", "config", "profile", "template", "out"}


def die(msg, code=2):
    print(f"review-r2.py: {msg}", file=sys.stderr)
    sys.exit(code)


def read(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError as exc:
        die(f"cannot read {path}: {exc.strerror}")


def fenced(text):
    """(line number, line, info) for every line except the fence lines; info is None outside fenced code blocks, else
    the opening fence's info string ("" when it has none). CommonMark rule: a fence opens with 3+ backticks or tildes
    (indent <= 3); only the same character, at least as long, with nothing after it, closes it; an unclosed fence runs
    to the end. metrics.py repeats the outside-fences part."""
    marker, info, out = None, None, []
    for n, line in enumerate(text.splitlines(), 1):
        m = FENCE_OPEN.match(line)
        if marker is None:
            if m and not (m.group(1)[0] == "`" and "`" in m.group(2)):
                marker, info = m.group(1), m.group(2).strip()
                continue
            out.append((n, line, None))
        elif m and m.group(1)[0] == marker[0] and len(m.group(1)) >= len(marker) and not m.group(2).strip():
            marker = info = None
        else:
            out.append((n, line, info))
    return out


def outside_fences(text):
    return [(n, line) for n, line, info in fenced(text) if info is None]


def real(text):
    """A written reason: not empty, not a <placeholder>, at least one letter or digit (a lone dash is not one)."""
    return bool(text) and not text.startswith("<") and re.search(r"\w", text) is not None


def scope_fields(text):
    """Scope and session of a round-2+ report: ("narrow" | "full:<reason>" | "eksik", "same" | "fresh" | "missing",
    [failures]). Lines inside fenced code do not count; two different scope (or session) lines conflict.
    metrics.py r2_scope() repeats the scope half; scripts/slice/tests/test-review-r2.sh checks that both agree."""
    plain = [t for _n, t in outside_fences(text)]
    fails, scope, session = [], "eksik", "missing"
    scopes = [m for m in (SCOPE_LINE.match(t) for t in plain) if m]
    if not scopes:
        fails.append("R2_SCOPE_MISSING no 'Review scope: narrow|full — <reason>' line")
    else:
        value, why = scopes[0].group(1), (scopes[0].group(2) or "").strip()
        if value == "narrow":
            if real(why):
                scope = "narrow"
            else:
                fails.append("R2_SCOPE_NO_REASON 'Review scope: narrow' without a written reason after '—'")
        elif value == "full":
            reason = REASON_TOKEN.match(why)
            if reason:
                scope = "full:" + reason.group(1)
            else:
                fails.append(f"R2_FULL_NO_REASON 'Review scope: full' needs one of: {', '.join(REASONS)}"
                             + (f" (got {why!r})" if why else ""))
        else:
            fails.append(f"R2_SCOPE_INVALID 'Review scope: {value}' is not narrow or full")
        if len({m.group(0).strip() for m in scopes}) > 1:
            fails.append("R2_SCOPE_CONFLICT more than one different 'Review scope:' line")
            scope = "eksik"
    sessions = [m for m in (SESSION_LINE.match(t) for t in plain) if m]
    if not sessions:
        fails.append("R2_SESSION_MISSING no 'Reviewer session: same|fresh' line")
    else:
        value, why = sessions[0].group(1), (sessions[0].group(2) or "").strip()
        if value == "same":
            session = "same"
        elif value == "fresh":
            session = "fresh"
            gone = re.match(r"session gone:\s*(.*)$", why)
            if not gone or not real(gone.group(1).strip()):
                fails.append("R2_FRESH_NO_NOTE a fresh reviewer session needs 'session gone: <why>' (the r1 "
                             "session is reused unless it is gone)")
        else:
            fails.append(f"R2_SESSION_INVALID 'Reviewer session: {value}' is not same or fresh")
        if len({m.group(0).strip() for m in sessions}) > 1:
            fails.append("R2_SESSION_CONFLICT more than one different 'Reviewer session:' line")
    return scope, session, fails


def git(repo, *args):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode != 0:
        die(f"git {' '.join(args[:2])} failed: {r.stderr.strip() or 'exit ' + str(r.returncode)}")
    return r.stdout


def commit_of(repo, ref, what):
    r = subprocess.run(["git", "-C", repo, "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"],
                       capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode != 0 or not r.stdout.strip():
        die(f"{what} is not a commit in {repo}: {ref}")
    return r.stdout.strip()


# ------------------------------------------------------------------------------------------------ diff
HUNK = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$")
DIFF_ARGS = ["-c", "core.quotePath=false", "diff", "--no-color", "--no-ext-diff", "--no-textconv", "-M", "-U3",
             "--src-prefix=a/", "--dst-prefix=b/"]


def side(path):
    path = path.strip()
    if path.startswith('"') and path.endswith('"'):
        path = path[1:-1]
    if path == "/dev/null":
        return None
    return path[2:] if path[:2] in ("a/", "b/") else path


def parse_diff(text):
    """Hunks of a unified diff: a/b paths, old/new ranges, function context, lines, added/deleted line numbers."""
    hunks, a, b, cur = [], None, None, None
    rem_old = rem_new = old_ln = new_ln = 0
    for line in text.split("\n"):
        if cur is not None and (rem_old > 0 or rem_new > 0):
            tag = line[:1]
            cur["lines"].append(line)
            if tag == "-":
                cur["deleted"].append(old_ln)
                old_ln += 1
                rem_old -= 1
            elif tag == "+":
                cur["added"].append(new_ln)
                new_ln += 1
                rem_new -= 1
            elif tag != "\\":
                old_ln += 1
                new_ln += 1
                rem_old -= 1
                rem_new -= 1
            continue
        if line.startswith("\\") and cur is not None:
            cur["lines"].append(line)
            continue
        if line.startswith("diff --git "):
            a = b = cur = None
            continue
        if line.startswith("--- "):
            a = side(line[4:])
            continue
        if line.startswith("+++ "):
            b = side(line[4:])
            continue
        m = HUNK.match(line)
        if m and (a or b):
            os_, ol, ns, nl = int(m.group(1)), int(m.group(2) or 1), int(m.group(3)), int(m.group(4) or 1)
            cur = {"id": f"H{len(hunks) + 1}", "a": a, "b": b, "file": b or a, "old": (os_, ol), "new": (ns, nl),
                   "ctx": m.group(5).strip(), "head": line, "lines": [], "added": [], "deleted": []}
            hunks.append(cur)
            rem_old, rem_new, old_ln, new_ln = ol, nl, os_, ns
    return hunks


def numstat(repo, a, b):
    """[(paths, added, deleted)]; a rename lists both its old and its new path."""
    parts = git(repo, "diff", "--numstat", "-z", "-M", a, b).split("\0")
    out, i = [], 0
    while i < len(parts):
        rec = parts[i]
        if not rec:
            i += 1
            continue
        added, deleted, path = rec.split("\t", 2)
        if path == "" and i + 2 < len(parts):
            paths, i = [parts[i + 1], parts[i + 2]], i + 3
        else:
            paths, i = [path], i + 1
        out.append((paths, 0 if added == "-" else int(added), 0 if deleted == "-" else int(deleted)))
    return out


# ------------------------------------------------------------------------------------------------ findings
LOC = re.compile(r"((?:[\w.@+-]+/)*[\w@+-][\w.@+-]*\.[A-Za-z][A-Za-z0-9]*)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?")
LOC_LINE = re.compile(r"((?:[\w.@+-]+/)*[\w@+-][\w.@+-]*\.[A-Za-z][A-Za-z0-9]*):(\d+)(?:\s*[-–]\s*(\d+))?")
# bullet findings: "[P1]" (priority) or "R1"; checklist ids (A1…F6) are not findings
BULLET = re.compile(r"^\s*(?:[-*]|\d+[.)])\s+(?:\*\*)?\[?(P[0-3]|R\d+)\]?(?:\*\*)?(?=[\s:.,—–-])\s*[:.—–-]?\s*(.*)$")
ID_HEAD = re.compile(r"^(#|no|nr|id|bulgu|finding|kimlik)$", re.I)
LOC_HEAD = re.compile(r"dosya|file|konum|location", re.I)
SEV_HEAD = re.compile(r"önem|severity|öncelik|priority", re.I)
BLOCK_HEAD = re.compile(r"^blok|^block", re.I)
TEXT_HEAD = re.compile(r"başlık|title|sorun|issue|açıklama|description|yeniden üretim|kanıt|evidence", re.I)
SEP = re.compile(r"^\s*\|?\s*:?-{3,}")


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def clean(cell):
    return cell.replace("**", "").replace("`", "").strip()


def locs_of(text, need_line):
    pat = LOC_LINE if need_line else LOC
    found = []
    for m in pat.finditer(text.replace("`", " ")):
        start = int(m.group(2)) if m.group(2) else None
        end = int(m.group(3)) if m.lastindex and m.lastindex >= 3 and m.group(3) else start
        found.append((m.group(1), start, end))
    return found


def parse_findings(path):
    """Findings of one review report: tables with an ID column and a file:line column, and [P1]/R1/F1 bullets."""
    rows, lines = [], outside_fences(read(path))
    texts = [t for _n, t in lines]
    i = 0
    while i < len(texts):
        line = texts[i]
        if line.lstrip().startswith("|") and i + 1 < len(texts) and SEP.match(texts[i + 1]):
            head = [clean(c).lower() for c in cells(line)]
            loc = next((k for k, h in enumerate(head) if LOC_HEAD.search(h)), None)
            if head and ID_HEAD.match(head[0]) and loc is not None:
                sev = next((k for k, h in enumerate(head) if SEV_HEAD.search(h)), None)
                blk = next((k for k, h in enumerate(head) if BLOCK_HEAD.search(h)), None)
                txt = next((k for k, h in enumerate(head) if k not in (0, loc) and TEXT_HEAD.search(h)), None)
                i += 2
                while i < len(texts) and texts[i].lstrip().startswith("|"):
                    c = cells(texts[i])
                    fid = clean(c[0]) if c else ""
                    if fid and not fid.startswith("<") and fid.lower() not in ("yok", "none", "-", "—"):
                        get = lambda k: clean(c[k]) if k is not None and k < len(c) else ""
                        rows.append({"id": fid, "severity": get(sev), "block": get(blk), "text": get(txt)[:160],
                                     "locs": locs_of(c[loc], False) if loc < len(c) else [], "report": path})
                    i += 1
                continue
        m = BULLET.match(line)
        if m:
            rest = m.group(2)
            rows.append({"id": m.group(1), "severity": "",
                         "block": "", "text": clean(rest)[:160], "locs": locs_of(rest, True), "report": path})
        i += 1
    return rows


def load_findings(paths):
    found, seen = [], set()
    for p in paths:
        stem = os.path.splitext(os.path.basename(p))[0]
        for f in parse_findings(p):
            fid = f["id"]
            if fid in seen:
                fid = f"{f['id']}@{stem}"
                n = 2
                while fid in seen:
                    fid, n = f"{f['id']}@{stem}#{n}", n + 1
            seen.add(fid)
            f["id"] = fid
            found.append(f)
    return found


def same_path(cited, path):
    return bool(path) and (path == cited or path.endswith("/" + cited))


def attach(findings, hunks):
    """finding -> its fix hunks and how they were matched."""
    for f in findings:
        f["hunks"], f["match"] = [], ""
        if not f["locs"]:
            f["match"] = "dosya:satır atfı yok: bu bulgu için bütün düzeltme diff'i kapsamda"
            continue
        # a cited line takes the hunks near it; only when none is near does the finding take the whole file's hunks
        # (hunks no finding takes stay in scope under "Hiçbir bulgunun adlandırmadığı düzeltme parçaları")
        near, whole, far, missing = [], [], [], []
        for file, start, end in f["locs"]:
            in_file = [h for h in hunks if same_path(file, h["a"]) or same_path(file, h["b"])]
            if not in_file:
                missing.append(file)
                continue
            if start is None:
                whole += in_file
                continue
            hit = [h for h in in_file if h["old"][0] - NEAR <= end and start <= h["old"][0] + max(h["old"][1], 1) - 1 + NEAR]
            near += hit
            far += [] if hit else in_file
        f["hunks"] = list(dict.fromkeys(h["id"] for h in near + whole + far))
        notes = []
        if near:
            notes.append("atıf satırında")
        if far:
            notes.append("atıf satırında parça yok: dosyanın bütün parçaları")
        if whole:
            notes.append("atıf dosyasında")
        if missing:
            notes.append(", ".join(f"`{m}`" for m in missing) + " içinde düzeltme parçası yok: başka yerde düzeltilmiş "
                         "ya da düzeltilmemiş — kontrol et")
        f["match"] = "; ".join(notes)


def intersections(findings, hunks, unclaimed):
    """Pairs of fixes (a finding's hunks; the unclaimed hunks as one more fix) that share a hunk, function or file."""
    by_id = {h["id"]: h for h in hunks}
    fixes = [(f["id"], [by_id[h] for h in f["hunks"]]) for f in findings if f["hunks"]]
    if unclaimed:
        fixes.append(("bulgusuz parçalar", unclaimed))
    pairs = []
    for i in range(len(fixes)):
        for j in range(i + 1, len(fixes)):
            (n1, h1), (n2, h2) = fixes[i], fixes[j]
            shared = [h["id"] for h in h1 if h in h2]
            if shared:
                pairs.append((n1, n2, f"same hunk {', '.join(shared)} in `{by_id[shared[0]]['file']}`"))
                continue
            funcs = sorted({(a["file"], a["ctx"]) for a in h1 if a["ctx"]} & {(b["file"], b["ctx"]) for b in h2 if b["ctx"]})
            if funcs:
                pairs.append((n1, n2, "same function " + ", ".join(f"`{c}` in `{f}`" for f, c in funcs)))
                continue
            files = sorted({a["file"] for a in h1} & {b["file"] for b in h2})
            if files:
                pairs.append((n1, n2, "same file " + ", ".join(f"`{f}`" for f in files)))
    return pairs


# ------------------------------------------------------------------------------------------------ slice file
def slice_facts(text):
    klass = re.search(r"İnceleme sınıfı\s*:\s*\**\s*(TAM|HAFİF|HAFIF)\b(?!\s*\|)", text)
    base = None
    m = re.search(r"^Dal / taban\s*:.*·\s*`([^`<>]+)`", text, re.M)
    if m:
        base = m.group(1).strip()
    race = None
    m = re.search(r"^\s*[-*]?\s*(?:Yarış testleri|Race tests)[^:\n]*:\s*(.+)$", text, re.M)
    if m and "<" not in m.group(1):
        race = m.group(1).strip()
    return (klass.group(1).replace("HAFIF", "HAFİF") if klass else None), base, race


# ------------------------------------------------------------------------------------------------ brief
def fence_for(text):
    run = max((len(r) for r in re.findall(r"`+", text)), default=0)
    return "`" * max(4, run + 1)


def show_hunk(h):
    body = h["lines"][:HUNK_SHOW]
    # a context line that opens a code fence would toggle the fence state of codex-review.sh's verdict reader
    body = ["·" + ln[1:] if ln.startswith(" ") and FENCE.match(ln) else ln for ln in body]
    more = len(h["lines"]) - len(body)
    text = "\n".join([h["head"]] + body)
    fence = fence_for(text)
    tail = f"\n… {more} more lines: `git diff` of `{h['file']}`" if more > 0 else ""
    return f"{fence}diff\n{text}\n{fence}{tail}"


def line_ranges(nums):
    if not nums:
        return ""
    out, start, prev = [], nums[0], nums[0]
    for n in nums[1:] + [None]:
        if n is not None and n == prev + 1:
            prev = n
            continue
        out.append(f"{start}" if start == prev else f"{start}-{prev}")
        if n is not None:
            start = prev = n
    return ",".join(out)


def cmd_brief(args):
    for key in ("slice", "reviewed"):
        if not args.get(key):
            die(f"brief needs --{key} (review-r2.py --help)")
    if not args["review"]:
        die("brief needs at least one --review <r1 report.md>")
    if bool(args.get("session")) == bool(args.get("session-gone")):
        die("name the r1 reviewer session (--session <id>) or say why it is gone (--session-gone \"<why>\"), one of them")
    scope = args.get("scope", "narrow")
    if scope not in ("narrow", "full"):
        die("--scope is narrow or full")
    reason = args.get("reason")
    if scope == "full" and reason not in REASONS:
        die(f"--scope full needs --reason, one of: {', '.join(REASONS)}" + (f" (got {reason!r})" if reason else ""))
    if scope == "narrow" and reason:
        die("--reason goes with --scope full only")
    rnd = args.get("round", "2")
    if not re.fullmatch(r"[2-9]|[1-9]\d+", rnd):
        die("--round is a number >= 2")

    repo = args.get("repo", ".")
    config = args.get("config") or os.path.join(repo, "slice-method.json")
    if args.get("config") and not os.path.isfile(config):
        die(f"config not found: {config}")
    method = route.load_json(config) if os.path.isfile(config) else {}
    profile_path = profile_of(config, args.get("profile"), method)
    cfg = route.routing_config(config if os.path.isfile(config) else None, profile_path)
    profile = route.load_json(profile_path) if profile_path else {}
    review_cfg = method.get("review") or {}
    ratio_limit = review_cfg.get("r2_full_ratio", DEFAULT_RATIO)
    if isinstance(ratio_limit, bool) or not isinstance(ratio_limit, (int, float)) or ratio_limit <= 0:
        die("review.r2_full_ratio must be a positive number")

    slice_text = read(args["slice"])
    klass, base_in_slice, race = slice_facts(slice_text)
    sid = os.path.splitext(os.path.basename(args["slice"]))[0]
    reviewed = commit_of(repo, args["reviewed"], "--reviewed")
    head = commit_of(repo, args.get("head", "HEAD"), "--head")
    base_ref = args.get("slice-base") or base_in_slice
    if not base_ref:
        die("slice base unknown: fill the slice's 'Dal / taban' line or pass --slice-base <sha>")
    base = commit_of(repo, base_ref, "slice base")
    if reviewed == head:
        die("--reviewed and --head are the same commit: there is no fix diff")
    rebased = subprocess.run(["git", "-C", repo, "merge-base", "--is-ancestor", reviewed, head],
                             stdin=subprocess.DEVNULL).returncode != 0

    template = find_template(args.get("template"), repo, method)
    tpl = read(template)
    for need in ("Review scope:", "Reviewer session:", "## Kapsam"):
        if not re.search(rf"^{re.escape(need)}", tpl, re.M):
            die(f"template {template} has no '{need}' line: it is older than review-r2.py; update it from ACEF")

    is_doc, is_test, is_excluded = route.path_kinds(cfg)
    code = lambda f: not is_doc(f) and not is_excluded(f) and not is_test(f)
    fix_stat = numstat(repo, reviewed, head)
    fix_files = list(dict.fromkeys(p for paths, _a, _d in fix_stat for p in paths))
    fix_code = [f for f in fix_files if code(f)]
    fix_lines = sum(a + d for paths, a, d in fix_stat if any(code(p) for p in paths))
    slice_lines = sum(a + d for paths, a, d in numstat(repo, base, reviewed) if any(code(p) for p in paths))
    ratio = (fix_lines / slice_lines) if slice_lines else (float("inf") if fix_lines else 0.0)

    hits = {}
    for fact in route.FACTS:
        pats = [re.compile(p) for p in cfg["risk_paths"].get(fact, [])]
        found = [f for f in fix_code if any(p.search(f) for p in pats)]
        if found:
            hits[fact] = found
    needs = [(FACT_REASONS[fact][0], f"{fact} path rule: " + ", ".join(found[:5])) for fact, found in hits.items()]
    if ratio >= ratio_limit:
        needs.append(("fix-larger-than-slice", f"fix {fix_lines} code lines vs slice {slice_lines}"
                      f" (ratio {'∞' if ratio == float('inf') else f'{ratio:.2f}'} >= {ratio_limit})"))
    if scope == "narrow" and needs:
        for r, why in needs:
            print(f"SCOPE_UP: {why}; this fix needs full scope: --scope full --reason {r}", file=sys.stderr)
        return 1

    hunks = parse_diff(git(repo, *DIFF_ARGS, reviewed, head))
    findings = load_findings(args["review"])
    if not findings:
        die("no findings in " + ", ".join(args["review"]) + ": expected a findings table with an ID column and a"
            " file:line column (templates/slice/review-brief.md) or [P1]/R1 bullets")
    attach(findings, hunks)
    claimed = {h for f in findings for h in f["hunks"]}
    # a hunk is classified by both of its paths: a rename from code into docs/tests/excluded paths is still code
    sides = lambda h: [p for p in (h["a"], h["b"]) if p]
    hunk_code = lambda h: any(code(p) for p in sides(h))
    docs = [h for h in hunks if all(is_doc(p) or is_excluded(p) for p in sides(h))]
    unclaimed = [h for h in hunks if h["id"] not in claimed and h not in docs]

    scope_files = fix_files
    if scope == "full":
        scope_files = list(dict.fromkeys(p for paths, _a, _d in numstat(repo, base, head) for p in paths))
    tests, mapping, unmapped = route.affected_tests(cfg, scope_files)

    if scope == "narrow":
        why = ("default: the fix's code files hit no personal-data, tenant, permissions, money or schema path rule; "
               f"fix {fix_lines} / slice {slice_lines} code lines")
        scope_line = f"Review scope: narrow — {why}"
    else:
        extra = "; ".join(w for _r, w in needs)
        scope_line = f"Review scope: full — {reason}" + (f" ({extra})" if extra else "")
    session_line = (f"Reviewer session: same — {args['session']}" if args.get("session")
                    else f"Reviewer session: fresh — session gone: {args['session-gone']}")

    d = {"scope": scope, "reason": reason, "klass": klass, "race": race, "base": base, "reviewed": reviewed,
         "head": head, "rebased": rebased, "findings": findings, "hunks": hunks, "unclaimed": unclaimed, "docs": docs,
         "pairs": intersections(findings, hunks, unclaimed), "tests": tests, "mapping": mapping, "unmapped": unmapped,
         "fallback": cfg["test_map_fallback"], "method": method, "code": code, "hunk_code": hunk_code,
         "scope_code": [f for f in scope_files if code(f)], "fix_lines": fix_lines, "slice_lines": slice_lines,
         "hits": hits}
    body = render_scope(d)
    out = fill(tpl, sid, rnd, scope_line, session_line, reviewed, head, args["review"], body, profile, findings)
    if args.get("out"):
        try:
            with open(args["out"], "w", encoding="utf-8") as fh:
                fh.write(out)
        except OSError as exc:
            die(f"cannot write {args['out']}: {exc.strerror}")
        print(f"R2-BRIEF {sid} r{rnd} {scope_line[len('Review scope: '):].split(' —')[0]} findings={len(findings)}"
              f" hunks={len(hunks)} intersections={len(d['pairs'])} tests={len(tests)} out={args['out']}")
    else:
        sys.stdout.write(out)
    return 0


def render_scope(d):
    by_id = {h["id"]: h for h in d["hunks"]}
    findings, hunks = d["findings"], d["hunks"]
    s7 = lambda x: x[:7]
    claimed = {x for f in findings for x in f["hunks"]}
    o = [f"Düzeltme diff'i: `git diff {s7(d['reviewed'])} {s7(d['head'])}` — {len(hunks)} parça, {d['fix_lines']} kod "
         f"satırı; dilim `{s7(d['base'])}..{s7(d['reviewed'])}`: {d['slice_lines']} kod satırı. "
         f"Sınıf: {d['klass'] or 'dilimde yazılı değil'}."]
    if d["rebased"]:
        o.append(f"Not: `{s7(d['reviewed'])}`, `{s7(d['head'])}`'nin atası değil (rebase?): düzeltme diff'i taban "
                 "değişikliğini de taşır; `git range-diff` ile karşılaştır, taban değişikliğine \"Evidence validity and "
                 "reuse\" kuralını uygula.")
    if d["scope"] == "full":
        o += ["", f"**Tam kapsam ({d['reason']}).** Bütün dilim yeniden incelenir: `git diff {s7(d['base'])} "
              f"{s7(d['head'])}`, her K maddesi, sınıfın kontrol listesi, yeni/değişen her kuralda sınıfın mutasyonları "
              "(yalnız düzeltilen satırlarda değil). Aşağıdaki önceki bulgular ve düzeltme parçaları yine tek tek "
              "kontrol edilir. Tam takım yine koşmaz: merge öncesi entegrasyon koşusu tek tam koşudur."]
        if d["hits"]:
            o.append("Düzeltmenin değdiği yol kuralları: " + "; ".join(
                f"{k}: " + ", ".join(f"`{f}`" for f in v[:5]) for k, v in d["hits"].items()) + ".")
    else:
        o += ["", "**Dar kapsam.** Yalnız önceki bulgular, düzeltme parçaları ve dokundukları yer (aşağıda). "
              "Tekrarlanmaz: tam inceleme, düzeltmenin dokunmadığı K maddeleri, tam takım."]

    o += ["", "### Önceki bulgular ve düzeltme parçaları", ""]
    shown = {}
    for f in findings:
        meta = " · ".join(x for x in (f["severity"], f"blok: {f['block']}" if f["block"] else "") if x)
        cited = ", ".join(f"`{p}" + (f":{s}" if s else "") + (f"-{e}" if e and e != s else "") + "`"
                          for p, s, e in f["locs"]) or "—"
        o.append(f"#### {f['id']}" + (f" · {meta}" if meta else "") + (f" — {f['text']}" if f["text"] else ""))
        o.append(f"Kaynak: `{os.path.basename(f['report'])}` · Atıf: {cited} · Düzeltme: "
                 + (", ".join(f["hunks"]) if f["hunks"] else "parça yok") + f" ({f['match']})")
        for hid in f["hunks"]:
            if hid in shown:
                o += ["", f"{hid}: yukarıda, {shown[hid]} altında."]
            else:
                shown[hid] = f["id"]
                o += ["", show_hunk(by_id[hid])]
        o.append("")
    if d["unclaimed"]:
        o += ["### Hiçbir bulgunun adlandırmadığı düzeltme parçaları", "",
              "Kapsamdadır: düzeltme bunları da değiştirdi. Her birinin bir bulguya hizmet ettiğini ya da davranış "
              "değiştirmediğini doğrula; yeni iş backlog'a.", ""]
        for h in d["unclaimed"]:
            o += [f"- {h['id']} `{h['file']}`" + (f" — `{h['ctx']}`" if h["ctx"] else ""), "", show_hunk(h), ""]
    docs = sorted({h["file"] for h in d["docs"] if h["id"] not in claimed})
    if docs:
        o += ["Belge/kanıt dosyaları (bir bulgu atıf vermedikçe kod olarak incelenmez): "
              + ", ".join(f"`{f}`" for f in docs), ""]

    o += ["### Düzeltmelerin kesiştiği yerler", ""]
    if d["pairs"]:
        o.append("İki düzeltmenin buluştuğu her yer için ikisini birlikte sınayan bir test istenir (mevcut testin adı "
                 "ya da yeni test); yoksa bulgu.")
        o += [f"- {a} × {b} — {why}: kesişim testi: <test adı | yok → bulgu>" for a, b, why in d["pairs"]]
    else:
        o.append("Yok: hiçbir iki düzeltme aynı dosyaya ya da fonksiyona dokunmuyor.")

    source = "tüm dilim diff'i" if d["scope"] == "full" else "düzeltme diff'i"
    o += ["", "### Etkilenen testler", "",
          f"Kaynak: `route.py` `routing.test_map`, {source}. Eşlenmeyen kod dosyası geniş seti "
          "(`routing.test_map_fallback`) ekler; daha az test asla."]
    for t in d["tests"]:
        src = [f for f, ts in d["mapping"].items() if t in ts]
        o.append(f"- `{t}` ← " + ", ".join(f"`{f}`" for f in src[:5]) + (" …" if len(src) > 5 else ""))
    if d["unmapped"]:
        o.append("- Eşlenmeyen: " + ", ".join(f"`{f}`" for f in d["unmapped"][:10])
                 + (" → geniş set yukarıda" if d["fallback"] else
                    " → `routing.test_map_fallback` tanımlı değil: her dosyanın modül/dizin test takımını koş "
                    "(bulgunun kendi testi tek başına yetmez)"))
    if not d["tests"] and not d["unmapped"]:
        o.append("- Yok: düzeltme yalnız belge/kanıt dosyalarını değiştiriyor.")

    o += ["", "### Düzeltilen satırlarda mutasyonlar", ""]
    code_hunks = [h for h in hunks if d["hunk_code"](h)]
    if code_hunks:
        rule = ("TAM: yeni/değişen her kural için 3–5 mutasyon, bu satırlarda" if d["klass"] == "TAM"
                else "davranış değişikliği başına en az bir mutasyon")
        o.append(f"{rule}; geri al → yukarıdaki testlerden biri kırmızı; sonra geri al, `git status --short` boş.")
        for h in code_hunks:
            owners = [f["id"] for f in findings if h["id"] in f["hunks"]] or ["bulgusuz"]
            where = (f"satır {line_ranges(h['added'])}" if h["added"] else
                     f"silinen satırlar (eski {line_ranges(h['deleted'])}): geri koy")
            path = (f"`{h['a']}` → `{h['b']}`" if h["a"] and h["b"] and h["a"] != h["b"] else f"`{h['file']}`")
            o.append(f"- {h['id']} {path} {where} ({', '.join(owners)}) → kırmızı olan test: <…>")
    else:
        o.append("Uygulanmaz: düzeltme kod satırı değiştirmiyor (yalnız test/belge); gerekçeyi doğrula.")

    o += ["", "### Dilimin yarış testleri", ""]
    race = d["race"]
    if race is None:
        o.append("- Dilimde tanımlı değil (`Yarış testleri:` satırı); kilit/yarış yoluna dokunan düzeltmede "
                 "koordinatöre sor.")
    else:
        o.append("- Yok" if race.strip("` ").lower() in ("yok", "none") else f"- {race}")

    o += ["", "### Sözleşme seti", ""]
    contract = d["method"].get("contract_tests") or []
    areas = d["method"].get("contract_paths") or []
    if not contract:
        o.append("- `slice-method.json` → `contract_tests` tanımlı değil.")
    else:
        try:
            pats = [re.compile(p) for p in areas]
        except re.error as exc:
            die(f"bad pattern in contract_paths: {exc}")
        touched = [f for f in d["scope_code"] if any(p.search(f) for p in pats)] if pats else d["scope_code"]
        if touched:
            why = "" if pats else "; `contract_paths` tanımlı değil, her kod değişikliği sayılır"
            o.append("Alanlarına dokunuluyor (" + ", ".join(f"`{f}`" for f in touched[:5]) + why + "):")
            o += [f"- `{t}`" for t in contract]
        else:
            o.append("- Koşmaz: düzeltme sözleşme alanlarına dokunmuyor"
                     + (" (`contract_paths`)." if pats else " (kod dosyası değişmedi)."))
    return "\n".join(o).rstrip() + "\n"


def fill(tpl, sid, rnd, scope_line, session_line, reviewed, head, reviews, body, profile, findings):
    out = tpl.replace("<SLICE-ID>", sid).replace("(r<n>)", f"(r{rnd})")
    out = re.sub(r"^Review scope:.*$", lambda _m: scope_line, out, count=1, flags=re.M)
    out = re.sub(r"^Reviewer session:.*$", lambda _m: session_line, out, count=1, flags=re.M)
    out = out.replace("<YYYY-MM-DD>", datetime.date.today().isoformat(), 1)
    names = ", ".join(f"`{os.path.basename(r)}`" for r in reviews)
    out = out.replace(f"Önceki inceleme: `<sha>` (`{sid}-review.md`)", f"Önceki inceleme: `{reviewed[:12]}` ({names})", 1)
    out = out.replace("`<yeni sha>`", f"`{head[:12]}`", 1)
    out = out.replace("git diff <önceki-sha> <yeni-sha>", f"git diff {reviewed[:12]} {head[:12]}")
    rows = "\n".join(f"| {f['id']} | KAPANDI / AÇIK / KABUL | <…> |" for f in findings)
    out = out.replace("| R1 | KAPANDI / AÇIK / KABUL | <…> |", rows, 1)
    out = re.sub(r"^## Kapsam[ \t]*\n.*?(?=^## )", lambda _m: "## Kapsam\n\n" + body + "\n", out, count=1,
                 flags=re.M | re.S)
    values = (profile.get("placeholders") or {}) if isinstance(profile, dict) else {}
    return re.sub(r"\{\{([a-z0-9_]+)\}\}", lambda m: values.get(m.group(1)) or m.group(0), out)


def find_template(given, repo, method):
    if given:
        return given
    # host first (the slice kit's templates dir from the installation record, then the default), then ACEF itself
    install = route.load_json(os.path.join(repo, "docs", "ai", "ACEF_INSTALLATION.json"))
    kit_dir = ((install.get("components") or {}).get("sliceKit") or {}).get("templatesDir") if isinstance(install, dict) else None
    candidates = [os.path.join(repo, d, "review-r2.md") for d in (kit_dir, "docs/slices/_templates") if d]
    if method.get("slices_dir"):
        candidates.append(os.path.join(repo, method["slices_dir"], "_templates", "review-r2.md"))
    here = os.path.dirname(os.path.abspath(__file__))
    candidates.append(os.path.join(here, "..", "..", "templates", "slice", "review-r2.md"))
    for c in candidates:
        if os.path.isfile(c):
            return c
    die("review-r2.md template not found: pass --template <path>")


def profile_of(config, given, method):
    """Absolute stack profile path: --profile, else SLICE_STACK_PROFILE, else "stack_profile" next to the config."""
    path = given or os.environ.get("SLICE_STACK_PROFILE")
    if not path and method.get("stack_profile"):
        path = os.path.join(os.path.dirname(os.path.abspath(config)), method["stack_profile"])
    if not path:
        return None
    if not os.path.isfile(path):
        die(f"stack profile not found: {path}")
    return os.path.abspath(path)


# ------------------------------------------------------------------------------------------------ check
def round_of(path, text):
    m = re.search(r"review-r(\d+)(?![\d])", os.path.basename(path), re.I)
    if m:
        return int(m.group(1))
    first = next((ln for ln in text.splitlines() if ln.strip()), "")
    m = re.search(r"\(r(\d+)\)", first) if first.startswith("#") else None
    return int(m.group(1)) if m else 1


def suite_patterns(method, profile):
    pats = [("gate summary line", GATE_SUMMARY)]
    test_cmd = ((profile.get("placeholders") or {}).get("test_command") or "").strip() if isinstance(profile, dict) else ""
    if test_cmd:
        esc = re.escape(test_cmd).replace(re.escape("{tree}"), r"\S+").replace(re.escape("{port}"), r"\d+")
        pats.append(("bare test_command", re.compile(rf"(`|^\s*\$?\s*){esc}\s*(`|$)")))
    for p in (method.get("review") or {}).get("full_suite_patterns") or []:
        try:
            pats.append((f"review.full_suite_patterns {p!r}", re.compile(p)))
        except re.error as exc:
            die(f"bad pattern in review.full_suite_patterns: {p} ({exc})")
    return pats


def check_one(path, pats):
    text = read(path)
    rnd = round_of(path, text)
    fails, warns, scope, session = [], [], "missing", "missing"
    if rnd >= 2:
        token, session, fails = scope_fields(text)
        scope = token.split(":")[0] if token != "eksik" else "missing"
    for n, line, info in fenced(text):
        if info is not None and info.split()[:1] == ["diff"]:
            continue    # a quoted hunk (the brief shows the fix as ```diff blocks) is code under review, not a run
        for label, pat in pats:
            m = pat.search(line)
            if m:
                mode = f" ({m.group(3)})" if pat is GATE_SUMMARY else ""
                warns.append(f"R2_FULL_SUITE line {n}: {label}{mode}: a full-suite run inside a review round? "
                             "Reviewers run focused tests; the integration run is the only full run")
                break
    for f in fails:
        print(f"FAIL {f} — {path}")
    for w in warns:
        print(f"WARN {w} — {path}")
    print(f"R2-CHECK {'FAIL' if fails else 'PASS'} round={rnd} scope={scope if rnd >= 2 else '-'} "
          f"session={session if rnd >= 2 else '-'} warn={len(warns)} {path}")
    return bool(fails)


def cmd_check(args, files):
    if not files:
        die("usage: review-r2.py check <report.md>... [--config slice-method.json] [--profile <profile.json>]")
    config = args.get("config") or "slice-method.json"
    method = route.load_json(config) if os.path.isfile(config) else {}
    if args.get("config") and not os.path.isfile(config):
        die(f"config not found: {config}")
    profile_path = profile_of(config, args.get("profile"), method)
    pats = suite_patterns(method, route.load_json(profile_path) if profile_path else {})
    failed = [f for f in files if check_one(f, pats)]
    return 1 if failed else 0


def parse(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)
    sub, rest, args, pos = argv[0], argv[1:], {"review": []}, []
    i = 0
    while i < len(rest):
        a = rest[i]
        if a.startswith("--"):
            key = a[2:]
            if key not in KNOWN:
                die(f"unknown option {a}")
            if i + 1 >= len(rest):
                die(f"{a} needs a value")
            if key == "review":
                args["review"].append(rest[i + 1])
            elif key in args:
                die(f"{a} given twice")
            else:
                args[key] = rest[i + 1]
            i += 2
        else:
            pos.append(a)
            i += 1
    return sub, args, pos


def main():
    sub, args, pos = parse(sys.argv[1:])
    if sub == "brief":
        if pos:
            die(f"unexpected argument: {pos[0]}")
        return cmd_brief(args)
    if sub == "check":
        return cmd_check(args, pos)
    die(f"unknown command: {sub} (brief|check)")


if __name__ == "__main__":
    sys.exit(main())
