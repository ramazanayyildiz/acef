#!/usr/bin/env python3
"""metrics.py — measure the slice method from the files it already leaves behind.

Usage:
  python3 -I scripts/metrics.py <slices_dir> [--backlog <backlog.md>] [--no-git] [--format md|tsv] [--summary-only]
                                 [--profile <stack profile.json>]

Reads (never writes):
  <ID>.md                      slice file (status, class, closing note)
  <ID>-dev-report.md           developer report (presence)
  <ID>-review.md, -review-r<n>.md, and review reports under evidence/<ID>/ (any *.md whose path contains "review"
                               and that is not a prompt/brief) -> review rounds and verdicts
  git history of <slices_dir>  first-add timestamps -> time PROXIES (not measured durations)
  --backlog                    rows that say a review missed something ("kaçırdı", "missed", "escaped") -> escaped-defect
                               CANDIDATES per slice

Stack profile (--profile, else env SLICE_STACK_PROFILE; optional): its "metrics" object may set
  evidence_dir_strip_phase_prefix (bool, default true) — also look for evidence/<ID without "P<nn>-">/ when
  evidence/<ID>/ is missing (a naming convention of the source project, REB in docs/slice-lane/SOURCES.md).

Honesty rules (from the source evaluation report, "Yöntem"; REB in docs/slice-lane/SOURCES.md): a number is printed only when it was read or computed from a
source; otherwise the cell says "doğrulanmadı". Time columns are git add-timestamp deltas: spec added -> dev report
added (dev), dev report added -> last review added (review). They include waiting and batching, and are "doğrulanmadı"
when the two files landed in the same commit or the order is reversed. Closing-note fields "Süre-geliştirme-dk",
"Süre-inceleme-dk", "REVISE-turu", "Kaçan-hata" (templates/closing-note.md) override the proxies when present.
"""
from __future__ import annotations

import argparse
import os
import re
import statistics
import subprocess
import sys
from dataclasses import dataclass, field

NV = "doğrulanmadı"
SUFFIX = re.compile(r"-(dev-report|review(-r\d+)?|review-[a-z0-9-]+|report)$", re.I)
VERDICT = re.compile(
    r"(?:karar|verdict|decision|sonuç|result)[^A-Za-z\n]{0,12}(PASS|REVISE|FAIL|BLOCKED|REJECT)", re.I)
VERDICT_KV = re.compile(r"verdict=(PASS|REVISE)", re.I)
# Accepted spellings seen in the demo repos: "Karar: **PASS**", "## 7. Karar", "VERDICT: ACCEPT" (codex), "verdict=REVISE".
CLOSING = re.compile(r"^#{2,3}\s.*kapan[iı]ş", re.I | re.M)
FIELD = lambda name: re.compile(rf"^\s*[-*]?\s*{name}\s*:\s*(.+)$", re.I | re.M)
STATUS = re.compile(r"^\s*(?:Durum|Status)\s*:\s*\**([A-ZÇĞİÖŞÜa-zçğıöşü-]+)", re.M)
CLASS = re.compile(r"(?:İnceleme sınıfı|Derinlik|Review class|Sınıf)\s*:?\s*\**\s*(TAM|HAFİF|HAFIF|tam|hafif|Full|Light)", re.I)
ESCAPE_WORDS = re.compile(r"kaçırd|kaçan|kaçak|escaped|missed", re.I)


@dataclass
class Slice:
    id: str
    path: str
    status: str = NV
    klass: str = NV
    dev_report: bool = False
    reviews: list = field(default_factory=list)   # (relpath, verdict)
    closed: bool = False
    final: str = NV
    dev_min: str = NV
    review_min: str = NV
    revise_field: str = ""
    escaped: str = NV
    escaped_candidates: list = field(default_factory=list)


def read(p: str, limit: int | None = None) -> str:
    try:
        with open(p, encoding="utf-8", errors="replace") as f:
            return f.read() if limit is None else f.read(limit)
    except OSError:
        return ""


LINE_VERDICT = re.compile(
    r"^\s*[-*>]*\s*(?:\*\*)?(?:#+\s*(?:\d+\.\s*)?)?(?:karar|verdict|decision|sonuç)(?:\*\*)?\s*:\s*(?:\*\*)?\s*(PASS|REVISE|FAIL|BLOCKED|ACCEPT|APPROVED?)",
    re.I | re.M)
HEAD_VERDICT = re.compile(r"^#+\s*(?:\d+\.\s*)?(?:karar|verdict|decision|sonuç)\b(.*)$", re.I | re.M)
TOKEN = re.compile(r"\b(PASS|REVISE|FAIL|BLOCKED|ACCEPT|APPROVED?)\b")


def _norm(v: str) -> str:
    v = v.upper()
    if v in ("ACCEPT", "APPROVE", "APPROVED"):
        return "PASS"
    return "REVISE" if v in ("REVISE", "FAIL") else v


def verdict_of(text: str) -> str:
    """Overall verdict of a review report, or "?" when no unambiguous verdict line exists.

    Order: (1) a "Karar:/Verdict:" line in the first 40 lines, (2) a "## Karar" heading and the first PASS/REVISE token
    on it or in the 6 lines after it, (3) the LAST "Karar:" line anywhere, (4) "verdict=X" (codex-review.sh output).
    Per-criterion lines such as "K1 PASS" are ignored on purpose."""
    head = "\n".join(text.splitlines()[:40])
    m = LINE_VERDICT.search(head)
    if m:
        return _norm(m.group(1))
    for hm in HEAD_VERDICT.finditer(text):
        window = hm.group(1) + "\n" + "\n".join(text[hm.end():].splitlines()[:7])
        t = TOKEN.search(window)
        if t:
            return _norm(t.group(1))
    allm = LINE_VERDICT.findall(text)
    if allm:
        return _norm(allm[-1])
    m = VERDICT_KV.search(text)
    return _norm(m.group(1)) if m else "?"


def git_first_adds(root: str, rel: str) -> dict:
    """path (relative to git root) -> earliest add timestamp; one git call."""
    try:
        out = subprocess.run(
            ["git", "-C", root, "log", "--diff-filter=A", "--no-renames", "--name-only", "--format=@%ct", "--", rel],
            capture_output=True, text=True, check=True, stdin=subprocess.DEVNULL).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {}
    adds, ts = {}, None
    for line in out.splitlines():
        if line.startswith("@"):
            ts = int(line[1:])
        elif line.strip() and ts is not None:
            adds[line.strip()] = min(ts, adds.get(line.strip(), ts))
    return adds


def git_root(path: str) -> str | None:
    try:
        return subprocess.run(["git", "-C", path, "rev-parse", "--show-toplevel"], capture_output=True, text=True,
                              check=True, stdin=subprocess.DEVNULL).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def review_order(r):
    """Chronological order: git add time first (if known), then the round number in the name
    (-review.md = 1, -review-r2.md = 2, opus-review-3/…, codex-4-report.md), then the path."""
    path, _v, ts = r
    name = path.lower()
    m = re.search(r"-r(\d+)\.md$", name) or re.search(r"review[-_]?(\d+)", name) or re.search(r"[-_](\d+)[-_]report", name)
    rnd = int(m.group(1)) if m else 1
    return (ts if ts is not None else float("inf"), rnd, path)


def minutes(a, b) -> str:
    if a is None or b is None or b <= a:
        return NV
    return f"{round((b - a) / 60)} (git)"


def load_profile_metrics(path: str | None) -> dict:
    """Return the "metrics" object of a stack profile, or {} when no profile is given."""
    if not path:
        return {}
    import json
    with open(path, encoding="utf-8") as fh:
        prof = json.load(fh)
    m = prof.get("metrics") if isinstance(prof, dict) else None
    return m if isinstance(m, dict) else {}


def collect(slices_dir: str, use_git: bool, backlog: str | None, strip_phase_prefix: bool = True) -> list:
    d = os.path.abspath(slices_dir)
    names = sorted(f for f in os.listdir(d) if f.endswith(".md"))
    # A slice id is upper-case with at least one hyphen (ADMIN-01, P04-ASSIGN-01, PAY-REVOLUT, BOOT-FIX-02);
    # README, backlog, _template, REVIEW-TEMPLATE and similar files are skipped.
    ids = [f[:-3] for f in names if not f.startswith("_") and not SUFFIX.search(f[:-3])
           and re.fullmatch(r"[A-Z][A-Z0-9]*(?:-[A-Za-z0-9]+)+", f[:-3])
           and f[:-3].upper() not in ("REVIEW-TEMPLATE", "SLICE-TEMPLATE")]
    root = git_root(d) if use_git else None
    rel = os.path.relpath(d, root) if root else None
    adds = git_first_adds(root, rel) if root else {}

    def add_ts(abs_path: str):
        return adds.get(os.path.relpath(abs_path, root)) if root else None

    ev_root = os.path.join(d, "evidence")
    out = []
    for sid in ids:
        s = Slice(sid, os.path.join(d, sid + ".md"))
        text = read(s.path)
        m = STATUS.search(text); s.status = m.group(1).upper() if m else NV
        m = CLASS.search(text)
        if m:
            k = m.group(1).upper()
            s.klass = "TAM" if k in ("TAM", "FULL") else "HAFİF"
        s.dev_report = os.path.exists(os.path.join(d, sid + "-dev-report.md"))
        # reviews next to the slice
        for f in names:
            stem = f[:-3]
            if stem.startswith(sid + "-review") and re.fullmatch(re.escape(sid) + r"-review(-r\d+|-[a-z0-9-]+)?", stem, re.I):
                p = os.path.join(d, f)
                s.reviews.append((f, verdict_of(read(p, 20000)), add_ts(p)))
        # reviews under evidence/<ID>/
        ed = os.path.join(ev_root, sid)
        if strip_phase_prefix and not os.path.isdir(ed):  # evidence dir without the phase prefix: P03-X-01 -> X-01
            alt = re.sub(r"^P\d{2}-", "", sid)
            if alt != sid and not os.path.exists(os.path.join(d, alt + ".md")):
                ed = os.path.join(ev_root, alt)
        if os.path.isdir(ed):
            for dp, _dn, fns in os.walk(ed):
                for fn in fns:
                    rp = os.path.relpath(os.path.join(dp, fn), d)
                    low = rp.lower()
                    if not fn.endswith(".md") or "review" not in low or re.search(r"prompt|brief|input", fn, re.I):
                        continue
                    if fn.lower() == "readme.md":
                        continue
                    p = os.path.join(dp, fn)
                    s.reviews.append((rp, verdict_of(read(p, 20000)), add_ts(p)))
        s.reviews.sort(key=review_order)
        # closing note and its fields
        cm = CLOSING.search(text)
        if cm:
            tail = text[cm.start():]
            fv = VERDICT.search(tail)
            s.closed = bool(fv) or "KAPANDI" in tail.upper()
            s.final = fv.group(1).upper() if fv else NV
            for fname, attr in (("Süre-geliştirme-dk", "dev_min"), ("Süre-inceleme-dk", "review_min")):
                mm = FIELD(fname).search(tail)
                if mm and re.fullmatch(r"\d+", mm.group(1).strip()):
                    setattr(s, attr, mm.group(1).strip() + " (not)")
            mm = FIELD("REVISE-turu").search(tail)
            if mm and re.fullmatch(r"\d+", mm.group(1).strip()):
                s.revise_field = mm.group(1).strip()
            mm = FIELD("Kaçan-hata").search(tail)
            if mm:
                s.escaped = mm.group(1).strip()
        if s.final == NV and s.reviews:
            last = [v for _p, v, _t in s.reviews if v != "?"]
            s.final = (last[-1] + " (son inceleme)") if last else NV
        # git proxies
        if root:
            t_spec = add_ts(s.path)
            t_dev = add_ts(os.path.join(d, sid + "-dev-report.md")) if s.dev_report else None
            r_ts = [t for _p, _v, t in s.reviews if t is not None]
            if s.dev_min == NV:
                s.dev_min = minutes(t_spec, t_dev)
            if s.review_min == NV:
                s.review_min = minutes(t_dev, max(r_ts) if r_ts else None)
        out.append(s)

    if backlog:
        bl = read(backlog)
        for line in bl.splitlines():
            if not line.startswith("|") or not ESCAPE_WORDS.search(line):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            bid = cells[0] if cells else "?"
            # Only the item text counts: the "Kaynak" column names the slice that FOUND the problem, not the one that
            # let it through. Table layout assumed: | ID | Kaynak | Önem | Madde | Durum |.
            item = " | ".join(cells[3:]) if len(cells) >= 4 else line
            if not ESCAPE_WORDS.search(item):
                continue
            for s in out:
                short = s.id.split("-")[-1]
                full_hit = re.search(rf"(?<![A-Za-z0-9-]){re.escape(s.id)}(?![A-Za-z0-9-])", item)
                short_hit = (len(short) >= 3 and re.search(r"\d", short)
                             and re.search(rf"(?<![A-Za-z0-9-]){re.escape(short)}(?![A-Za-z0-9-])", item))
                if full_hit or short_hit:
                    s.escaped_candidates.append(bid)
    return out


def render(slices: list, label: str, fmt: str, summary_only: bool) -> str:
    rows = []
    hdr = ["dilim", "Durum satırı", "sınıf", "dev raporu", "inceleme raporu", "REVISE", "ilk karar", "son karar",
           "geliştirme dk (not|git)", "inceleme dk (not|git)", "kaçan hata"]
    for s in slices:
        verdicts = [v for _p, v, _t in s.reviews]
        rev = s.revise_field or str(sum(1 for v in verdicts if v == "REVISE"))
        unknown = sum(1 for v in verdicts if v == "?")
        if unknown:
            rev += f" (+{unknown} karar okunamadı)"
        esc = s.escaped
        if esc == NV and s.escaped_candidates:
            esc = "aday: " + ",".join(s.escaped_candidates) + " (" + NV + ")"
        rows.append([s.id, s.status, s.klass, "var" if s.dev_report else "yok", str(len(s.reviews)), rev,
                     verdicts[0] if verdicts else "-", s.final, s.dev_min, s.review_min, esc])

    reviewed = [s for s in slices if s.reviews]
    rounds = sum(len(s.reviews) for s in slices)
    unknown = sum(1 for s in slices for _p, v, _t in s.reviews if v == "?")
    revise_total = sum(1 for s in slices for _p, v, _t in s.reviews if v == "REVISE")
    with_revise = sum(1 for s in reviewed if any(v == "REVISE" for _p, v, _t in s.reviews))
    first_pass = sum(1 for s in reviewed if s.reviews[0][1] == "PASS")
    first_known = sum(1 for s in reviewed if s.reviews[0][1] != "?")

    def med(attr):
        vals = [int(getattr(s, attr).split()[0]) for s in slices if getattr(s, attr) != NV]
        return (f"{statistics.median(vals):.0f} dk (n={len(vals)})" if vals else NV), len(vals)

    dmed, dn = med("dev_min")
    rmed, rn = med("review_min")
    esc_c = [s.id for s in slices if s.escaped_candidates]
    esc_f = [s for s in slices if s.escaped != NV]
    esc_yes = [s.id for s in esc_f if not re.match(r"(?i)yok|none|0$", s.escaped)]
    lines = [
        f"### {label}",
        "",
        f"- Dilim: {len(slices)} · dev raporu olan: {sum(1 for s in slices if s.dev_report)} · incelenen: {len(reviewed)} · kapanış notu olan: {sum(1 for s in slices if s.closed)}",
        f"- İnceleme raporu toplamı (tur değil): {rounds} · kararı okunamayan: {unknown} · REVISE kararlı rapor: {revise_total} · en az bir REVISE alan dilim: {with_revise}",
        f"- İlk incelemede PASS: {first_pass}/{first_known} (kararı okunan ilk incelemeler)",
        f"- Medyan geliştirme süresi: {dmed} · medyan inceleme süresi: {rmed} (kaynak: kapanış notu alanı varsa o, yoksa git commit damgası vekili — oturum süresi DEĞİL; diğer dilimler {NV})",
        (f"- Kaçan hata: kapanış notunda alanı olan dilim {len(esc_f)}, kaçan hata bildiren {len(esc_yes)}" + (f" ({', '.join(esc_yes)})" if esc_yes else "")
     if esc_f else f"- Kaçan hata: hiçbir kapanış notunda alan yok → {NV}")
    + f"; backlog adayı olan dilim: {len(esc_c)}" + (f" ({', '.join(esc_c)})" if esc_c else "") + " (aday = insan teyidi gerekir)",
    ]
    if summary_only:
        return "\n".join(lines) + "\n"
    if fmt == "tsv":
        return "\n".join(["\t".join(hdr)] + ["\t".join(r) for r in rows]) + "\n"
    lines += ["", "| " + " | ".join(hdr) + " |", "|" + "---|" * len(hdr)]
    lines += ["| " + " | ".join(c.replace("|", "\\|") for c in r) + " |" for r in rows]
    return "\n".join(lines) + "\n"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Slice method metrics from slice files, reviews and git history.")
    ap.add_argument("slices_dir")
    ap.add_argument("--backlog")
    ap.add_argument("--no-git", action="store_true")
    ap.add_argument("--format", choices=("md", "tsv"), default="md")
    ap.add_argument("--summary-only", action="store_true")
    ap.add_argument("--label")
    ap.add_argument("--profile", default=os.environ.get("SLICE_STACK_PROFILE") or None)
    a = ap.parse_args(argv)
    if a.profile and not os.path.isfile(a.profile):
        print(f"stack profile not found: {a.profile}", file=sys.stderr)
        return 2
    if not os.path.isdir(a.slices_dir):
        print(f"slices dir not found: {a.slices_dir}", file=sys.stderr)
        return 2
    if a.backlog and not os.path.isfile(a.backlog):
        print(f"backlog not found: {a.backlog}", file=sys.stderr)
        return 2
    try:
        pm = load_profile_metrics(a.profile)
    except (OSError, ValueError) as e:
        print(f"stack profile unreadable: {e}", file=sys.stderr)
        return 2
    sl = collect(a.slices_dir, not a.no_git, a.backlog, bool(pm.get("evidence_dir_strip_phase_prefix", True)))
    sys.stdout.write(render(sl, a.label or os.path.abspath(a.slices_dir), a.format, a.summary_only))
    return 0


if __name__ == "__main__":
    sys.exit(main())
