"""Shared helpers for acef-detect detectors and acef-retro. Not a detector: files starting with "_" are skipped.

Neutral shapes a host maps its files onto (all settings live in the host config, "sources"):
  run item     a directory (or a single file) one agent/lane/review run leaves behind: a start stamp, a finish stamp or a
               status file, log files, an optional result file with a verdict line, optional numbered attempt logs.
               The item name carries the work id and round (id_regex).
  main history one `git log <main_ref>` over a window: merges into main name the work id; the merged branch's first
               commit is the start (git timestamps, not self-reported minutes).
"""
import datetime as dt
import glob
import json
import os
import re
import statistics
import subprocess
from pathlib import Path

UTC = dt.timezone.utc
FALLBACK_MIN = {"native": 60, "HAFIF": 180, "TAM": 480}
MIN_SAMPLES = 5
ACCEPT = {"ACCEPT", "PASS", "APPROVE", "APPROVED"}
REVISE = {"REVISE", "REJECT", "FAIL", "BLOCKED"}
RUN_DEFAULTS = {
    "glob": "",
    "started_file": "started",
    "finished_files": ["finished", "exit"],
    "status_file": "status",
    "done_status": ["done", "failed", "closed", "stopped", "finished"],
    "log_glob": "*.log",
    "attempt_glob": "",
    "result_file": "",
    "verdict_regex": r"(?im)^\W*(?:verdict|karar|decision|sonuç)\W*?\s*[:=]?\s*\**\s*(ACCEPT|PASS|APPROVED?|REVISE|REJECT|FAIL|BLOCKED)\b",
    "id_regex": r"^(?P<id>.+?)(?:-r?(?P<round>\d+)[a-z]?)?$",
    "exclude_regex": "",
}
ID_IN_TEXT = r"\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+[A-Za-z]?)\b"
ROUTE_PATTERNS = [["native", r"(?i)\bnative\b"], ["HAFIF", r"(?i)\b(HAF[İI]F|light)\b"], ["TAM", r"(?i)\b(TAM|full)\b"]]
MERGE_EXCLUDE = r"^Merge (?:remote-tracking branch |branch )?'?(?:origin/)?(?:main|master)\b"


def resolve(repo: Path, raw) -> Path:
    path = Path(os.path.expanduser(str(raw)))
    return path if path.is_absolute() else repo / path


def git(ctx, *args, timeout: int = 10) -> str:
    key = ("git",) + args
    if key not in ctx.cache:
        try:
            out = subprocess.run(["git", "-C", str(ctx.repo), *args], capture_output=True, text=True, timeout=timeout)
            ctx.cache[key] = out.stdout if out.returncode == 0 else ""
        except (OSError, subprocess.TimeoutExpired):
            ctx.cache[key] = ""
    return ctx.cache[key]


def ts(value: float) -> dt.datetime:
    return dt.datetime.fromtimestamp(value, UTC)


def mtime(path: Path) -> dt.datetime:
    return ts(path.stat().st_mtime)


def read_stamp(path: Path) -> dt.datetime:
    """A stamp file holds an ISO time (date -u +%FT%TZ); otherwise its modification time is the stamp."""
    try:
        raw = path.read_text(errors="replace").strip().splitlines()[0][:40]
        raw = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
        value = dt.datetime.fromisoformat(raw)
        return (value if value.tzinfo else value.astimezone()).astimezone(UTC)
    except (IndexError, ValueError, OSError):
        return mtime(path)


def minutes(a: dt.datetime, b: dt.datetime) -> int:
    return int((b - a).total_seconds() // 60)


def specs(ctx, key: str, required: bool = True) -> list:
    """A source that is one run spec or a list of them (a bare string is a glob)."""
    raw = ctx.source(key, required)
    if raw is None:
        return []
    raw = raw if isinstance(raw, list) else [raw]
    return [{**RUN_DEFAULTS, **({"glob": r} if isinstance(r, str) else r)} for r in raw]


class Item:
    def __init__(self, path: Path, spec: dict):
        self.path, self.spec, self.name = path, spec, path.name if path.is_dir() else path.stem
        match = re.match(spec["id_regex"], self.name)
        groups = match.groupdict() if match else {}
        self.id = (groups.get("id") or self.name).upper()
        self.round = int(groups["round"]) if groups.get("round") else 1
        self.is_dir = path.is_dir()
        self._result = None
        if self.is_dir:
            entries = [e for e in os.scandir(path) if e.is_file(follow_symlinks=False)]
            self.last = max([ts(e.stat().st_mtime) for e in entries] + [mtime(path)])
            started = path / spec["started_file"]
            self.started = read_stamp(started) if spec["started_file"] and started.exists() else None
            self.finished = next((read_stamp(path / f) for f in spec["finished_files"] if (path / f).exists()), None)
            status = path / spec["status_file"] if spec["status_file"] else None
            self.status = status.read_text(errors="replace").strip() if status and status.exists() else ""
            self.attempts = sorted(glob.glob(str(path / spec["attempt_glob"]))) if spec["attempt_glob"] else []
        else:
            self.last = self.started = self.finished = mtime(path)
            self.status, self.attempts = "done", []

    @property
    def done(self) -> bool:
        return bool(self.finished) or self.status in self.spec["done_status"]

    @property
    def running(self) -> bool:
        return bool(self.started) and not self.done

    @property
    def result(self) -> str:
        if self._result is None:
            target = self.path / self.spec["result_file"] if self.is_dir and self.spec["result_file"] else (
                None if self.is_dir else self.path)
            try:
                self._result = target.read_text(errors="replace") if target and target.exists() else ""
            except OSError:
                self._result = ""
        return self._result

    @property
    def verdict(self) -> str:
        match = re.search(self.spec["verdict_regex"], self.result)
        if not match:
            return ""
        word = match.group(1).upper()
        return "ACCEPT" if word in ACCEPT else "REVISE" if word in REVISE else word

    @property
    def when(self) -> dt.datetime:
        return self.finished or self.last


def items(ctx, key: str, max_age_h: float, required: bool = True) -> list:
    """All run items of a source touched within max_age_h (stat-only prefilter on the item's own mtime)."""
    out = []
    for spec in specs(ctx, key, required):
        cache_key = ("items", json.dumps(spec, sort_keys=True), max_age_h)
        if cache_key not in ctx.cache:
            cutoff = ctx.now - dt.timedelta(hours=max_age_h)
            found = []
            for raw in glob.glob(str(resolve(ctx.repo, spec["glob"]))):
                path = Path(raw)
                try:
                    if mtime(path) < cutoff:   # a directory's mtime moves when a file is created in it
                        continue
                    if spec["exclude_regex"] and re.search(spec["exclude_regex"], path.name):
                        continue
                    found.append(Item(path, spec))
                except OSError:
                    continue
            ctx.cache[cache_key] = found
        out.extend(ctx.cache[cache_key])
    return out


def rounds_by_id(review_items: list) -> dict:
    """id -> review items sorted by round, then time."""
    grouped = {}
    for item in review_items:
        grouped.setdefault(item.id, []).append(item)
    return {k: sorted(v, key=lambda i: (i.round, i.when)) for k, v in grouped.items()}


# ---------------------------------------------------------------- main history (one git log)
def main_ref(ctx) -> str:
    ref = ctx.sources.get("main_ref")
    if ref:
        return ref
    return "origin/main" if git(ctx, "rev-parse", "--verify", "-q", "origin/main").strip() else "HEAD"


def history(ctx, days: int) -> dict:
    key = ("history", days)
    if key in ctx.cache:
        return ctx.cache[key]
    since = (ctx.now - dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = git(ctx, "log", main_ref(ctx), f"--since={since}", "--format=%H%x09%P%x09%ct%x09%s", timeout=20)
    commits, tip = {}, ""
    for line in out.splitlines():
        parts = line.split("\t", 3)
        if len(parts) < 4:
            continue
        sha, parents, ct, subject = parts
        tip = tip or sha
        commits[sha] = (parents.split(), int(ct), subject)
    chain, cur = [], tip
    while cur in commits:
        chain.append(cur)
        parents = commits[cur][0]
        cur = parents[0] if parents else ""
    hist = {"commits": commits, "chain": chain, "chain_set": set(chain), "available": bool(out.strip())}
    ctx.cache[key] = hist
    return hist


def route_class(ctx, text: str) -> str:
    for cls, pattern in ctx.cfg.get("route_patterns") or ROUTE_PATTERNS:
        if re.search(pattern, text):
            return cls
    return "unknown"


def closed_work(ctx, days: int) -> list:
    """Merges into main (first-parent) in the window: id, route class, start (first own commit), merge time."""
    key = ("closed", days)
    if key in ctx.cache:
        return ctx.cache[key]
    hist = history(ctx, days + 30)   # extra history so a branch's first commit is inside the log
    commits, chain_set = hist["commits"], hist["chain_set"]
    cutoff = (ctx.now - dt.timedelta(days=days)).timestamp()
    exclude = ctx.cfg.get("merge_exclude_regex") or MERGE_EXCLUDE
    id_rx = ctx.cfg.get("merge_id_regex") or ID_IN_TEXT
    out = []
    for sha in hist["chain"]:
        parents, ct, subject = commits[sha]
        if len(parents) < 2 or ct < cutoff or re.search(exclude, subject):
            continue
        match = re.search(id_rx, subject)
        branch = re.search(r"from \S+?/(\S+)|Merge (?:branch )?'?([\w./-]+)", subject)
        work_id = match.group(1).upper() if match else f"branch:{(branch.group(1) or branch.group(2)) if branch else sha[:9]}"
        start, cur, seen = None, parents[1], 0
        while cur in commits and cur not in chain_set and seen < 500:
            start = commits[cur][1] if start is None else min(start, commits[cur][1])
            cur = commits[cur][0][0] if commits[cur][0] else ""
            seen += 1
        if cur and cur not in commits:
            start = None   # the branch began before the log window: unknown, not guessed
        out.append({"id": work_id, "cls": route_class(ctx, subject), "merged": ts(ct), "sha": sha,
                    "start": ts(start) if start else None, "subject": subject,
                    "minutes": int((ct - start) // 60) if start else None})
    ctx.cache[key] = out
    return out


def expected_minutes(ctx, cls: str, closed: list) -> tuple:
    """(minutes, how): median of the same route class from closed work, or the fixed fallback below 5 samples."""
    samples = [c["minutes"] for c in closed if c["cls"] == cls and c["minutes"] is not None]
    if len(samples) >= MIN_SAMPLES:
        return int(statistics.median(samples)), f"median of {len(samples)} closed {cls}"
    fallback = (ctx.cfg.get("expected_fallback_min") or {}).get(cls, FALLBACK_MIN.get(cls))
    return fallback, f"fallback ({len(samples)} closed {cls} sample(s), need {MIN_SAMPLES})"


def mentions(ctx, work_id: str, days: int) -> list:
    """Merge times (first-parent merges into main) whose subject names the id."""
    hist = history(ctx, days)
    rx = re.compile(r"(?<![A-Z0-9-])" + re.escape(work_id.upper()) + r"(?![A-Z0-9])")
    return sorted(ts(hist["commits"][sha][1]) for sha in hist["chain"]
                  if len(hist["commits"][sha][0]) > 1 and rx.search(hist["commits"][sha][2].upper()))


def worktrees(ctx) -> list:
    out, cur = [], {}
    for line in git(ctx, "worktree", "list", "--porcelain").splitlines() + [""]:
        if not line.strip():
            if cur:
                out.append(cur)
            cur = {}
        elif " " in line:
            k, v = line.split(" ", 1)
            cur[k] = v
        else:
            cur[line] = True
    return out


def processes(ctx) -> list:
    if "ps" not in ctx.cache:
        try:
            out = subprocess.run(["ps", "-Ao", "pid=,command="], capture_output=True, text=True, timeout=5).stdout
        except (OSError, subprocess.TimeoutExpired):
            out = ""
        rows = []
        for line in out.splitlines():
            parts = line.strip().split(None, 1)
            if len(parts) == 2 and parts[0].isdigit() and int(parts[0]) != os.getpid():
                rows.append((int(parts[0]), parts[1]))
        ctx.cache["ps"] = rows
    return ctx.cache["ps"]


def read_jsonl(path: Path, since: dt.datetime = None) -> list:
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text(errors="replace").splitlines():
        try:
            row = json.loads(line)
            row["_ts"] = read_iso(row["ts"])
        except (ValueError, KeyError, TypeError):
            continue
        if since is None or row["_ts"] >= since:
            rows.append(row)
    return rows


def read_iso(raw: str) -> dt.datetime:
    raw = raw.strip()
    raw = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    value = dt.datetime.fromisoformat(raw)
    return (value if value.tzinfo else value.astimezone()).astimezone(UTC)
