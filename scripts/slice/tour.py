#!/usr/bin/env python3
"""tour.py — the slice tour record check (owner decision 2026-11-05; method/SLICE_LANE.md step 3b).

  tour.py check <slice.md | closing-note.md> [--review <report.md>]... [--repo <dir>] [--config slice-method.json]
      Run before acceptance (the slice's "Tour:" line says "required — …" and the current review names the report)
      and again at closeout (the closing note's "Tour:" line names the report). The last "Tour:" line outside fenced
      code counts. Reviews default to <file>-review.md and <file>-review-r<n>.md next to the file, in round order;
      with --review (needed when the closing note is a separate file) the order given is the round order. The LAST
      review is the current round; only it can accept:
        - its verdict lines (Karar:/Verdict:, outside fences) all read exactly PASS;
        - it says "Tour report: <path>" (the same report the slice names) or "Tour exemption: confirmed — <reason>";
        - its "| T<n> | <disposition> | <blok> | <çözüm> |" rows give every finding's disposition. Earlier rounds'
          rows count only when it says "Tour dispositions: carried forward …"; the current row always wins, and a
          malformed current row never falls back to an earlier one.
      The checked tree is HEAD of --repo (no override). When HEAD is not the report's candidate, the change since the
      candidate must touch only docs/evidence paths (route.py routing.docs_paths/exclude_paths, slice-method.json
      evidence_dir; a note is printed), or a "Tour impact: <HEAD sha> — <why unaffected>" note in the current review or
      the checked file must name this HEAD (a note naming another sha is obsolete).
      FAIL also when: there is no Tour line; an exemption has no reason or names an unavailable environment (that is
      incomplete coverage); the report is missing or empty; a binding line is missing or a placeholder (Mode,
      Candidate + Base sha, Executor, Environment, Persona, Viewports, Off-happy-path, Coverage); a web tour lacks
      1280 or 390; coverage is not "complete"; there is no "Not reached" section; "FINDINGS: n" differs from the T<n>
      rows; a screenshot/trace a finding row names does not exist (report directory first, then the repo); a
      disposition row is malformed (disposition confirmed | needs_validation | rejected; blok evet | hayır | yes | no;
      çözüm açık | open | düzeltildi <sha> | fixed <sha> | backlog <id> | —); a blocking finding is neither rejected
      nor "düzeltildi|fixed <sha>".
      Exit 0 PASS, 1 FAIL (one "FAIL: <reason>" line each), 2 usage, config or unreadable file.

Limits: this checks the record's structure and bindings. It cannot prove that the exploration was genuine, that the
persona was the affected one, or that the reviewer's applicability judgement was right; the reviewer owns those.
A host that renders markdown files as UI narrows routing.docs_paths, or a .md change auto-passes the tree check.
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # route.py sits next to this file (ACEF and hosts)
import route  # noqa: E402

DISPOSITIONS = ("confirmed", "needs_validation", "rejected")
BLOCK = {"evet": True, "yes": True, "hayır": False, "hayir": False, "no": False}
BINDINGS = ("Mode", "Candidate", "Executor", "Environment", "Persona", "Viewports", "Off-happy-path", "Coverage")
FENCE_OPEN = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
TOUR_LINE = re.compile(r"^\s*(?:[-*]\s+)?Tour:\s*(.*?)\s*$")
FIELD = re.compile(r"^\s*(?:[-*]\s+)?([A-Za-z][A-Za-z -]*?):\s*(.*?)\s*$")
VERDICT_LINE = re.compile(r"^\s*(?:[-*]\s+)?(?:Karar|Verdict)\s*:\s*(.*?)\s*$", re.I)
SHA = re.compile(r"\b[0-9a-f]{7,40}\b")
FINDING_ROW = re.compile(r"^\s*\|\s*(T\d+)\s*\|")
ARTIFACT = re.compile(r"[\w./@-]+\.(?:png|jpe?g|webp|gif|svg|har|zip|webm|mp4|trace|json)\b", re.I)
ENV_REASON = re.compile(r"environment|unavailable|not available|no browser|ortam|kurulamad|erişilemed|çalışmıyor", re.I)
RESOLUTION = re.compile(r"^(?:(açık|open)\b|(düzeltildi|fixed)\b|backlog\s+\S|[—–-](?:\s|$))", re.I)
RESOLVED = re.compile(r"^(düzeltildi|fixed)\b.*\b[0-9a-f]{7,40}\b", re.I)
PLACEHOLDER = re.compile(r"<[^>]*>")
CARRY = re.compile(r"(?i)^carried forward\b")


def die(msg, code=2):
    print(f"tour.py: {msg}", file=sys.stderr)
    sys.exit(code)


def read(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except (OSError, UnicodeDecodeError) as exc:
        die(f"cannot read {path}: {exc}")


def outside_fences(text):
    """Lines outside fenced code, CommonMark rules (shared with metrics.py; same opener rule as review-r2.py fenced()):
    a fence opens with 3+ backticks or tildes (indent <= 3) — a backtick fence's info string may not contain a
    backtick; only the same character, at least as long, with nothing after it, closes it."""
    out, fence = [], None
    for line in text.splitlines():
        m = FENCE_OPEN.match(line)
        if fence is None:
            if m and not (m.group(1)[0] == "`" and "`" in m.group(2)):
                fence = m.group(1)
            else:
                out.append(line)
        elif m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence) and not m.group(2).strip():
            fence = None
    return out


def blank(value):
    """Empty, a dash, or an unfilled <placeholder>."""
    v = (value or "").strip().strip("`").strip()
    return not v or v in ("-", "—", "–") or bool(PLACEHOLDER.search(v))


def fields(lines):
    got = {}
    for line in lines:
        m = FIELD.match(line)
        if m and m.group(1) not in got:
            got[m.group(1)] = m.group(2)
    return got


def disposition_rows(lines):
    """T<n> -> (disposition, blocking, çözüm) or ("malformed", why, "") for every "| T<n> | … |" row; the last row of
    an id wins. Shared with metrics.py."""
    rows = {}
    for line in lines:
        if not FINDING_ROW.match(line):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        fid, rest = cells[0], [c.strip("` ").strip() for c in cells[1:]]
        if len(rest) < 3:
            rows[fid] = ("malformed", "needs | disposition | blok | çözüm |", "")
            continue
        disp, blok, res = rest[0].lower(), rest[1].lower(), rest[2]
        if disp not in DISPOSITIONS:
            rows[fid] = ("malformed", f"disposition {rest[0]!r} is not one of {' | '.join(DISPOSITIONS)}", "")
        elif blok not in BLOCK:
            rows[fid] = ("malformed", f"blok {rest[1]!r} is not evet | hayır", "")
        elif not res or PLACEHOLDER.search(res) or not RESOLUTION.match(res):
            rows[fid] = ("malformed", f"çözüm {res!r} is not açık | düzeltildi <sha> | backlog <id> | —", "")
        else:
            rows[fid] = (disp, BLOCK[blok], res)
    return rows


def current_dispositions(review_lines):
    """Dispositions the current (last) review accepts: its own rows, plus earlier rounds' rows only when it says
    "Tour dispositions: carried forward …". Shared with metrics.py."""
    if not review_lines:
        return {}
    cur = review_lines[-1]
    merged = {}
    if CARRY.match(fields(cur).get("Tour dispositions", "")):
        for lines in review_lines[:-1]:
            merged.update(disposition_rows(lines))
    merged.update(disposition_rows(cur))
    return merged


def path_value(value):
    v = value.split(" · ")[0].strip().strip("`").strip()
    return v if v and " " not in v and ("/" in v or v.endswith(".md")) else None


def reviews_for(slice_path):
    d, stem = os.path.dirname(os.path.abspath(slice_path)), os.path.basename(slice_path)[:-3]
    found = []
    for name in os.listdir(d):
        m = re.fullmatch(re.escape(stem) + r"-review(?:-r(\d+))?\.md", name)
        if m:
            found.append((int(m.group(1) or 1), os.path.join(d, name)))
    return [p for _r, p in sorted(found)]


def resolve(path, bases):
    if os.path.isabs(path):
        return path
    for base in bases:
        cand = os.path.join(base, path)
        if os.path.exists(cand):
            return cand
    return os.path.join(bases[0], path)


def git(repo, *args):
    try:
        return subprocess.run(["git", "-C", repo, *args], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def verdict_fails(lines):
    vals = [m.group(1).replace("*", "").strip().strip("`").strip() for m in map(VERDICT_LINE.match, lines) if m]
    if not vals:
        return ["the current review has no verdict line (Karar: **PASS**)"]
    bad = [v for v in vals if v.upper() not in ("PASS", "REVISE")]
    if bad:
        return [f"the current review's verdict is unreadable: {bad[0]!r}"]
    if len({v.upper() for v in vals}) > 1:
        return ["the current review's verdict lines disagree"]
    return [] if vals[0].upper() == "PASS" else [f"the current review's verdict is {vals[0].upper()}, not PASS"]


def tree_fails(repo, cand, impact, config, notes):
    head = git(repo, "rev-parse", "HEAD")
    if head is None:
        return [f"cannot resolve HEAD in {repo}"]
    if head.startswith(cand):
        return []
    full = git(repo, "rev-parse", "--verify", cand + "^{commit}")
    changed = git(repo, "diff", "--name-only", full, head) if full else None
    if changed is None:
        return [f"the report's candidate {cand} is not a commit in {repo}"]
    files = [f for f in changed.splitlines() if f.strip()]
    cfg = route.routing_config(config, None)
    is_doc, _is_test, is_excluded = route.path_kinds(cfg)
    method = route.load_json(config) if config else {}
    ev = method.get("evidence_dir") if isinstance(method.get("evidence_dir"), str) else None
    other = [f for f in files if not (is_doc(f) or is_excluded(f) or (ev and f.startswith(ev.rstrip("/") + "/")))]
    if not other:
        notes.append(f"candidate {cand[:12]} -> HEAD {head[:12]} changed only docs/evidence paths "
                     f"({len(files)} file(s), routing.docs_paths/exclude_paths/evidence_dir); no impact note needed")
        return []
    named = [n for n in impact if any(len(t) >= 7 and head.startswith(t) for t in SHA.findall(n))]
    if named:
        notes.append(f"candidate {cand[:12]} -> HEAD {head[:12]}; impact note: {named[-1]}")
        return []
    return [f"stale: the report's candidate {cand[:12]} is not HEAD {head[:12]} ({len(other)} non-docs file(s) "
            f"changed, e.g. {other[0]}); rerun the affected steps or add a Tour impact: <{head[:12]}> — <why> note"]


def check(args):
    target = args["file"]
    fails, notes = [], []
    own = outside_fences(read(target))
    tour = None
    for line in own:
        m = TOUR_LINE.match(line)
        if m:
            tour = m.group(1)
    review_paths = args["review"] or reviews_for(target)
    rv_lines = [outside_fences(read(p)) for p in review_paths]
    cur = fields(rv_lines[-1]) if rv_lines else {}
    if tour is None:
        return finish(target, ["no Tour line (slice or closing note: report path or not applicable: <reason>)"], [], "-")
    fails += verdict_fails(rv_lines[-1]) if rv_lines else ["no review report found (pass --review)"]
    value = tour.split(" · ")[0].strip()
    na = re.match(r"(?i)^(not applicable|uygulanmaz)\s*:?\s*(.*)$", value)
    if na:
        reason = na.group(2).strip()
        if blank(reason):
            fails.append("exemption without a reason")
        elif ENV_REASON.search(reason):
            fails.append("an unavailable environment is incomplete coverage, not an exemption")
        if not re.match(r"(?i)confirmed\b", cur.get("Tour exemption", "")):
            fails.append("exemption not confirmed by the current review (Tour exemption: confirmed — <reason>)")
        return finish(target, fails, notes, "exempt")

    named = path_value(value)
    in_review = path_value(cur.get("Tour report", "")) if not blank(cur.get("Tour report")) else None
    if not in_review:
        fails.append("the current review does not name the tour report (Tour report: <path>)")
    report = named or in_review
    if not report:
        return finish(target, fails + ["tour required but no report is named"], notes, "-")
    if named and in_review and os.path.normpath(in_review) != os.path.normpath(named):
        fails.append(f"the slice and the current review name different reports: {named} vs {in_review}")
    repo = args.get("repo") or git(os.path.dirname(os.path.abspath(target)), "rev-parse", "--show-toplevel") \
        or os.path.dirname(os.path.abspath(target))
    config = args.get("config") or (os.path.join(repo, "slice-method.json")
                                    if os.path.isfile(os.path.join(repo, "slice-method.json")) else None)
    bases = [repo, os.path.dirname(os.path.abspath(target)), os.getcwd()]
    if config:
        cfg = json.loads(read(config) or "{}")
        bases += [os.path.join(os.path.dirname(os.path.abspath(config)), cfg[k])
                  for k in ("evidence_dir", "slices_dir") if isinstance(cfg.get(k), str)]
    path = resolve(report, bases)
    if not os.path.isfile(path):
        return finish(target, fails + [f"report missing: {report}"], notes, report)
    text = read(path)
    if not text.strip():
        return finish(target, fails + [f"report empty: {report}"], notes, report)
    lines = outside_fences(text)
    got = fields(lines)
    for key in BINDINGS:
        if blank(got.get(key)):
            fails.append(f"report binding missing or a placeholder: {key}")
    if got.get("Mode") and got["Mode"].strip() not in ("slice", "outcome"):
        fails.append(f"Mode must be slice or outcome, got {got['Mode']!r}")
    shas = SHA.findall(got.get("Candidate", ""))
    if not blank(got.get("Candidate")) and len(shas) < 2:
        fails.append("Candidate line needs the candidate and base sha (Candidate: <sha> · Base: <sha>)")
    vp = got.get("Viewports", "")
    if not blank(vp) and not vp.lower().startswith("native") and not ("1280" in vp and "390" in vp):
        fails.append("a web tour needs both 1280 and 390 viewports")
    cov = got.get("Coverage", "")
    if not blank(cov) and not re.match(r"(?i)complete\b", cov):
        fails.append(f"coverage incomplete: {cov}")
    if not any(re.match(r"^\s*(#+\s*|\d+\.\s*(\*\*)?|[-*]\s*(\*\*)?)?Not reached", ln) for ln in lines):
        fails.append("no Not reached section")
    if shas:
        impact = [n for n in [cur.get("Tour impact", ""), fields(own).get("Tour impact", "")]
                  + re.findall(r"Tour impact:\s*(.+)$", tour) if not blank(n)]
        fails += tree_fails(repo, shas[0], impact, config, notes)
    findings = [m.group(1) for m in (FINDING_ROW.match(ln) for ln in lines) if m]
    count = got.get("FINDINGS", "").strip()
    if not re.fullmatch(r"\d+", count):
        fails.append("FINDINGS: <n> line missing")
    elif int(count) != len(findings):
        fails.append(f"FINDINGS: {count} but the findings table has {len(findings)} T<n> rows")
    rdir = os.path.dirname(os.path.abspath(path))
    for ln in lines:
        m = FINDING_ROW.match(ln)
        for art in ARTIFACT.findall(ln) if m else []:
            if not os.path.exists(resolve(art, [rdir, repo])):
                fails.append(f"{m.group(1)} evidence missing: {art}")
    disp = current_dispositions(rv_lines)
    for fid in dict.fromkeys(findings):
        if fid not in disp:
            fails.append(f"{fid} has no disposition in the current review round (earlier rounds count only after "
                         "'Tour dispositions: carried forward')")
            continue
        d, blocking, resolution = disp[fid]
        if d == "malformed":
            fails.append(f"{fid} disposition row malformed: {blocking}")
        elif blocking and d != "rejected" and not RESOLVED.match(resolution):
            fails.append(f"{fid} is an unresolved blocker ({d}, {resolution})")
    return finish(target, fails, notes, report)


def finish(target, fails, notes, report):
    for n in notes:
        print(f"note: {n}")
    for f in fails:
        print(f"FAIL: {f}")
    print(f"TOUR-CHECK {'FAIL' if fails else 'PASS'} report={report} {target}")
    return 1 if fails else 0


def parse(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if argv else 2)
    if argv[0] != "check":
        die(f"unknown command: {argv[0]} (check)")
    args, rest, i = {"review": []}, argv[1:], 0
    while i < len(rest):
        a = rest[i]
        if a.startswith("--"):
            key = a[2:]
            if key not in ("review", "repo", "config") or i + 1 >= len(rest):
                die(f"unknown option or missing value: {a}")
            if key == "review":
                args["review"].append(rest[i + 1])
            else:
                args[key] = rest[i + 1]
            i += 2
        elif "file" in args:
            die(f"one slice or closing-note file, got a second: {a}")
        else:
            args["file"] = a
            i += 1
    if "file" not in args:
        die("usage: tour.py check <slice.md | closing-note.md> [--review f]... [--repo d] [--config f]")
    return args


if __name__ == "__main__":
    sys.exit(check(parse(sys.argv[1:])))
