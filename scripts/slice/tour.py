#!/usr/bin/env python3
"""tour.py — the slice tour record check (owner decision 2026-11-05; method/SLICE_LANE.md step 3b).

  tour.py check <slice.md | closing-note.md> [--review <report.md>]... [--repo <dir>] [--head <ref>]
                [--config slice-method.json]
      Run before acceptance (the slice's "Tour:" line says "required — …" and the review names the report) and again
      at closeout (the closing note's "Tour:" line names the report; pass --head <reviewed sha> once HEAD has moved).
      The last "Tour:" line outside fenced code counts. Reviews default to <slice>-review.md and <slice>-review-r<n>.md
      next to the file, in round order; a later round's disposition of a finding overrides an earlier one.
      FAIL when:
        - there is no Tour line;
        - "not applicable: <reason>" has no reason, names an unavailable environment (that is incomplete coverage,
          never an exemption), or no review says "Tour exemption: confirmed — <reason>";
        - no report is named, the report is missing or empty, or the slice and the review name different reports;
        - no review says "Tour report: <path>";
        - a binding line is missing or a placeholder (Mode, Candidate + Base sha, Executor, Environment, Persona,
          Viewports, Off-happy-path, Coverage), a web tour lacks 1280 or 390, the coverage is not "complete", or the
          report has no "Not reached" section;
        - the report's candidate is not --head (default HEAD) and no review carries "Tour impact: <why unaffected>";
        - "FINDINGS: n" differs from the T<n> rows; a finding has no disposition (confirmed | needs_validation |
          rejected) in the reviews' "| T<n> | <disposition> | <blok> | <çözüm> |" rows; a blocking finding
          (blok evet/yes) is not rejected and not "düzeltildi|fixed <sha>".
      Exit 0 PASS, 1 FAIL (one "FAIL: <reason>" line each), 2 usage or unreadable file.

Limits: this checks the record's structure and bindings. It cannot prove that the exploration was genuine, that the
persona was the affected one, or that the reviewer's applicability judgement was right; the reviewer owns those.
"""
import json
import os
import re
import subprocess
import sys

DISPOSITIONS = ("confirmed", "needs_validation", "rejected")
BINDINGS = ("Mode", "Candidate", "Executor", "Environment", "Persona", "Viewports", "Off-happy-path", "Coverage")
FENCE_OPEN = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
TOUR_LINE = re.compile(r"^\s*(?:[-*]\s+)?Tour:\s*(.*?)\s*$")
FIELD = re.compile(r"^\s*(?:[-*]\s+)?([A-Za-z][A-Za-z -]*?):\s*(.*?)\s*$")
SHA = re.compile(r"\b[0-9a-f]{7,40}\b")
FINDING_ROW = re.compile(r"^\s*\|\s*(T\d+)\s*\|")
DISP_ROW = re.compile(r"^\s*\|\s*(T\d+)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|")
ENV_REASON = re.compile(r"environment|unavailable|not available|no browser|ortam|kurulamad|erişilemed|çalışmıyor", re.I)
RESOLVED = re.compile(r"^(düzeltildi|fixed)\b.*\b[0-9a-f]{7,40}\b", re.I)
PLACEHOLDER = re.compile(r"<[^>]*>")


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
    """Lines outside fenced code (CommonMark: only the same character, at least as long, closes a fence)."""
    out, fence = [], None
    for line in text.splitlines():
        m = FENCE_OPEN.match(line)
        if fence is None and m:
            fence = m.group(1)
        elif fence is not None and m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence) \
                and not m.group(2).strip():
            fence = None
        elif fence is None:
            out.append(line)
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


def head_sha(repo, ref):
    try:
        return subprocess.run(["git", "-C", repo, "rev-parse", ref], check=True, capture_output=True,
                              text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def check(args):
    target = args["file"]
    fails, notes = [], []
    tour = None
    for line in outside_fences(read(target)):
        m = TOUR_LINE.match(line)
        if m:
            tour = m.group(1)
    review_paths = args["review"] or reviews_for(target)
    rv_lines = [outside_fences(read(p)) for p in review_paths]
    rv_fields = [fields(lines) for lines in rv_lines]

    def from_reviews(key):
        return [f[key] for f in rv_fields if key in f and not blank(f[key])]

    if tour is None:
        return finish(target, ["no Tour line (slice or closing note: report path or not applicable: <reason>)"], [], "-")
    value = tour.split(" · ")[0].strip()
    na = re.match(r"(?i)^(not applicable|uygulanmaz)\s*:?\s*(.*)$", value)
    if na:
        reason = na.group(2).strip()
        if blank(reason):
            fails.append("exemption without a reason")
        elif ENV_REASON.search(reason):
            fails.append("an unavailable environment is incomplete coverage, not an exemption")
        if not from_reviews("Tour exemption") or not any(re.match(r"(?i)confirmed\b", v)
                                                         for v in from_reviews("Tour exemption")):
            fails.append("exemption not confirmed by the reviewer (Tour exemption: confirmed — <reason>)")
        return finish(target, fails, notes, "exempt")

    named = path_value(value)
    in_review = [path_value(v) for v in from_reviews("Tour report")]
    in_review = [p for p in in_review if p]
    if not in_review:
        fails.append("the review does not name the tour report (Tour report: <path>)")
    report = named or (in_review[0] if in_review else None)
    if not report:
        return finish(target, fails + ["tour required but no report is named"], notes, "-")
    if named and in_review and any(os.path.normpath(p) != os.path.normpath(named) for p in in_review):
        fails.append(f"the slice and the review name different reports: {named} vs {', '.join(in_review)}")
    repo = args.get("repo") or head_root(target)
    bases = [repo, os.path.dirname(os.path.abspath(target)), os.getcwd()]
    if args.get("config"):
        cfg = json.loads(read(args["config"]) or "{}")
        bases += [os.path.join(os.path.dirname(os.path.abspath(args["config"])), cfg[k])
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
        head = head_sha(repo, args.get("head", "HEAD"))
        if head is None:
            fails.append(f"cannot resolve {args.get('head', 'HEAD')} in {repo}")
        elif not head.startswith(shas[0]):
            if from_reviews("Tour impact"):
                notes.append(f"candidate moved ({shas[0][:12]} -> {head[:12]}); review impact note: "
                             f"{from_reviews('Tour impact')[-1]}")
            else:
                fails.append(f"stale: the report's candidate {shas[0][:12]} is not {head[:12]}; rerun the affected "
                             "steps or add a reviewer's Tour impact: note")
    findings = [m.group(1) for m in (FINDING_ROW.match(ln) for ln in lines) if m]
    count = got.get("FINDINGS", "").strip()
    if not re.fullmatch(r"\d+", count):
        fails.append("FINDINGS: <n> line missing")
    elif int(count) != len(findings):
        fails.append(f"FINDINGS: {count} but the findings table has {len(findings)} T<n> rows")
    disp = {}
    for rl in rv_lines:  # round order: a later round overrides
        for ln in rl:
            m = DISP_ROW.match(ln)
            if m:
                disp[m.group(1)] = (m.group(2).lower(), m.group(3).lower(), m.group(4))
    for fid in dict.fromkeys(findings):
        if fid not in disp:
            fails.append(f"{fid} has no disposition in the review")
            continue
        d, blocking, resolution = disp[fid]
        if d not in DISPOSITIONS:
            fails.append(f"{fid} disposition {d!r} is not one of {' | '.join(DISPOSITIONS)}")
        elif re.match(r"(evet|yes)\b", blocking) and d != "rejected" and not RESOLVED.match(resolution.strip("` ")):
            fails.append(f"{fid} is an unresolved blocker ({d}, {resolution or 'no resolution'})")
    return finish(target, fails, notes, report)


def head_root(target):
    d = os.path.dirname(os.path.abspath(target))
    try:
        return subprocess.run(["git", "-C", d, "rev-parse", "--show-toplevel"], check=True, capture_output=True,
                              text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return d


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
            if key not in ("review", "repo", "head", "config") or i + 1 >= len(rest):
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
        die("usage: tour.py check <slice.md | closing-note.md> [--review f]... [--repo d] [--head ref] [--config f]")
    return args


if __name__ == "__main__":
    sys.exit(check(parse(sys.argv[1:])))
