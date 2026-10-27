"""Shared helpers for acef-detect detectors and acef-retro. Not a detector: files starting with "_" are skipped.

Neutral shapes a host maps its files onto (all settings live in the host config, "sources"):
  run item     a directory (or a single file) one agent/lane/review run leaves behind: a start stamp, a finish stamp or a
               status file, log files, an optional result file with a verdict line, optional numbered attempt logs.
               The item name carries the work id and round (id_regex).
  main history one `git log <main_ref>` over a window: merges into main name the work id; the merged branch's first
               commit is the start (git timestamps, not self-reported minutes).

Read contract (review r4): every read of a source returns data or raises SourceError; nothing here turns a failed
read into an empty list, an empty string or a success. A detector that hits a SourceError (raised, or recorded with
ctx.mark_error / ctx.guard) resolves no alert in that poll; acef-detect prints SOURCE_ERROR and UNSEEN. A missing or
unparseable field is unknown: the caller records it with ctx.mark_error and does not judge that row.

Per-poll sharing (speed, 2026-10-27): ctx.cache is one dict for every detector of a poll. Main's history is fetched
once (one git log over the widest window) and each window is an exact view of it; worktree branches' own commits come
from one git log; glob listings, directory listings, file reads and run items are read once per poll whatever the
number of detectors or windows asking. Only successful reads are cached: a read that fails raises SourceError every
time it is asked, so each detector sees the failure. A persistent index (ctx.index, in the central store) carries
parsed finished run items from one poll to the next, keyed on the files' mtime and size.
"""
import datetime as dt
import fnmatch
import glob
import json
import hashlib
import os
import re
import stat as statmod
import statistics
import subprocess
import time
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
HISTORY_MIN_DAYS = 60   # one git log per poll covers every window up to this; a wider request widens it once
MENTION_ID = re.compile(r"^[A-Z0-9-]+$")


STAT_KEYS = ("git_calls", "git_ms", "reads", "items", "dirs")


def _counters(cache: dict) -> dict:
    st = cache.setdefault("_stats", {})
    for k in STAT_KEYS:
        st.setdefault(k, 0)
    return st


def stats(ctx) -> dict:
    """Per-poll counters for the timing line: git calls and their time, files read, dirs listed, run items loaded."""
    return _counters(ctx.cache)


def _run_git(ctx, args, timeout, text=True):
    st = stats(ctx)
    t0 = time.monotonic()
    try:
        return subprocess.run(["git", "-C", str(ctx.repo), *args], capture_output=True, text=text, timeout=timeout)
    finally:
        st["git_calls"] += 1
        st["git_ms"] += int((time.monotonic() - t0) * 1000)


def resolve(repo: Path, raw) -> Path:
    path = Path(os.path.expanduser(str(raw)))
    return path if path.is_absolute() else repo / path


class SourceError(Exception):
    """A configured source could not be read, or gave no definite answer."""

    def __init__(self, source: str, detail: str = ""):
        super().__init__(f"{source}: {detail}" if detail else source)
        self.source = source


def git_rc(ctx, *args, timeout: int = 10) -> int:
    """Exit code of a git question (for example merge-base --is-ancestor). OSError or a timeout is a SourceError."""
    try:
        return _run_git(ctx, args, timeout, text=False).returncode
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise SourceError("git", f"{' '.join(args[:2])}: {exc.__class__.__name__}")


def git(ctx, *args, timeout: int = 10) -> str:
    """stdout of a git command that must succeed; a non-zero exit, OSError or timeout is a SourceError."""
    key = ("git",) + args
    if key not in ctx.cache:
        try:
            out = _run_git(ctx, args, timeout)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise SourceError("git", f"{' '.join(args[:2])}: {exc.__class__.__name__}")
        if out.returncode != 0:
            first = (out.stderr.strip().splitlines() or [""])[0][:120]
            raise SourceError("git", f"{' '.join(args[:2])} exit {out.returncode}: {first}")
        ctx.cache[key] = out.stdout
    return ctx.cache[key]


def is_git_repo(ctx) -> bool:
    """False when the host has no .git at all; a .git that git cannot read is a SourceError, not "no repository"."""
    if not (ctx.repo / ".git").exists():
        return False
    git(ctx, "rev-parse", "--git-dir")
    return True


def ts(value: float) -> dt.datetime:
    return dt.datetime.fromtimestamp(value, UTC)


def mtime(path: Path) -> dt.datetime:
    return ts(path.stat().st_mtime)


def read_text(path: Path, source: str, cache: dict = None) -> str:
    """Text of a file; an unreadable file is a SourceError. With a cache (ctx.cache), a file is read once per poll."""
    key = ("read", str(path))
    if cache is not None and key in cache:
        return cache[key]
    try:
        text = path.read_text(errors="replace")
    except OSError as exc:
        raise SourceError(source, f"{path}: {exc.__class__.__name__}")
    if cache is not None:
        cache[key] = text
        _counters(cache)["reads"] += 1
    return text


def read_stamp(path: Path, source: str = "run stamp", cache: dict = None) -> dt.datetime:
    """A stamp file holds an ISO time (date -u +%FT%TZ). The file's existence is the evidence (started, finished);
    when its text is not a time, the time is when the file was written (its mtime). An unreadable file is an error."""
    text = read_text(path, source, cache).strip()
    try:
        raw = text.splitlines()[0][:40]
        raw = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
        value = dt.datetime.fromisoformat(raw)
        return (value if value.tzinfo else value.astimezone()).astimezone(UTC)
    except (IndexError, ValueError):
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


def listdir(path: Path, cache: dict = None) -> dict:
    """name -> os.DirEntry of one directory, listed once per poll with a cache. OSError propagates (the caller turns
    it into a SourceError for its source)."""
    key = ("scandir", str(path))
    if cache is not None and key in cache:
        return cache[key]
    with os.scandir(path) as it:
        entries = {e.name: e for e in it}
    if cache is not None:
        cache[key] = entries
        _counters(cache)["dirs"] += 1
    return entries


def _exists(entries: dict, name: str) -> bool:
    """Path.exists() answered from a directory listing: the entry is there and (following a symlink) a file or a
    directory. An empty name (a stamp that is not configured) never exists."""
    entry = entries.get(name) if name else None
    if entry is None:
        return False
    return entry.is_file() or entry.is_dir()


def _present(path: Path, entries: dict, name: str) -> bool:
    """Does the configured file `name` exist under the item directory? A plain name is answered from the listing; a
    nested one ("reports/result.md") is stat-ed at its real path. Not found is False; any other OSError propagates."""
    if not name:
        return False
    if "/" not in name:
        return _exists(entries, name)
    try:
        os.stat(path / name)
    except (FileNotFoundError, NotADirectoryError):
        return False
    return True


def spec_key(spec: dict) -> str:
    return json.dumps(spec, sort_keys=True)


def _fact_key(regex: str) -> str:
    return hashlib.sha1(regex.encode("utf-8", "replace")).hexdigest()[:12]


class Item:
    """One run directory or file. Reading it raises SourceError (never a partial item).

    cache: ctx.cache (directory listings and file reads shared with every other item and detector of the poll).
    index: ctx.index, the persistent index of finished items (see load_index); None reads everything fresh."""

    def __init__(self, path: Path, spec: dict, source: str = "runs", cache: dict = None, index=None):
        self._cache, self._index, self._facts = cache, index, {}
        try:
            self._load(path, spec, source)
        except OSError as exc:
            raise SourceError(source, f"{path}: {exc.__class__.__name__}")

    def _load(self, path: Path, spec: dict, source: str):
        self.source = source
        self.path, self.spec, self.name = path, spec, path.name if path.is_dir() else path.stem
        match = re.match(spec["id_regex"], self.name)
        groups = match.groupdict() if match else {}
        self.id = (groups.get("id") or self.name).upper()
        self.round = int(groups["round"]) if groups.get("round") else 1
        self.is_dir = path.is_dir()
        self._result = None
        if self.is_dir:
            entries = listdir(path, self._cache)
            if self._from_index(path, spec, entries):
                return
            files = [e for e in entries.values() if e.is_file(follow_symlinks=False)]
            self.last = max([ts(e.stat(follow_symlinks=False).st_mtime) for e in files] + [mtime(path)])
            started = path / spec["started_file"]
            self.started = (read_stamp(started, source, self._cache)
                            if _present(path, entries, spec["started_file"]) else None)
            self.finished = next((read_stamp(path / f, source, self._cache) for f in spec["finished_files"]
                                  if _present(path, entries, f)), None)
            status = spec["status_file"] if spec["status_file"] else ""
            self.status = (read_text(path / status, source, self._cache).strip()
                           if _present(path, entries, status) else "")
            self.attempts = self._attempts(path, spec, entries)
            self._to_index(path, spec, entries)
        else:
            self.last = self.started = self.finished = mtime(path)
            self.status, self.attempts = "done", []

    @staticmethod
    def _attempts(path: Path, spec: dict, entries: dict) -> list:
        pattern = spec["attempt_glob"]
        if not pattern:
            return []
        if "/" in pattern or glob.has_magic(pattern.replace("*", "").replace("?", "")):
            return sorted(glob.glob(str(path / pattern)))   # anything but a plain name pattern: glob as before
        hidden_ok = pattern.startswith(".")
        return sorted(str(path / n) for n in entries
                      if (hidden_ok or not n.startswith(".")) and fnmatch.fnmatchcase(n, pattern))

    # ---- persistent index (finished items only; see load_index)
    def _signature(self, path: Path, spec: dict, entries: dict) -> dict:
        """mtime_ns and size of the directory and of every stamp, status and result file the item reads (nested
        names are stat-ed at their real path; a file that is not there is None). Any other OSError propagates: the
        caller treats it as a cache miss and reads fresh, so the error surfaces as a SourceError."""
        names = [spec["started_file"], spec["status_file"], spec["result_file"], *spec["finished_files"]]
        sig = {".": _sig(os.stat(path))}
        for name in names:
            if name and name not in sig:
                if "/" in name:
                    try:
                        sig[name] = _sig(os.stat(path / name))
                    except (FileNotFoundError, NotADirectoryError):
                        sig[name] = None
                else:
                    entry = entries.get(name)
                    sig[name] = _sig(entry.stat()) if entry is not None and _exists(entries, name) else None
        return sig

    @staticmethod
    def _readable(path: Path, sig: dict) -> bool:
        """Every file the uncached path would read can still be read: a chmod changes neither mtime nor size, so a
        cached row must not hide a read that would now fail (failed read -> SourceError, never an old answer)."""
        return all(v is None or k == "." or os.access(path / k, os.R_OK) for k, v in sig.items())

    def _index_key(self, path: Path, spec: dict) -> str:
        return f"{path}\t{_fact_key(spec_key(spec))}"

    def _from_index(self, path: Path, spec: dict, entries: dict) -> bool:
        if self._index is None:
            return False
        row = self._index.rows.get(self._index_key(path, spec))
        restored = Index.restore(row)
        try:
            sig = _jsonable(self._signature(path, spec, entries))
        except OSError:
            sig = None   # no definite signature: read fresh (and let that read raise)
        if restored is None or sig is None or row["sig"] != sig or not self._readable(path, sig):
            self._index.misses += 1
            return False
        self.started, self.finished, self.status, self.last, self._facts = restored
        self.attempts = self._attempts(path, spec, entries)
        self._index.hits += 1
        self._index.keep(self._index_key(path, spec), row)
        return True

    def _to_index(self, path: Path, spec: dict, entries: dict):
        """Only finished items are indexed: a running item's appended logs do not move any signature."""
        if self._index is None or not self.finished:
            return
        try:
            sig = _jsonable(self._signature(path, spec, entries))
        except OSError:
            return   # no definite signature: not indexed (the item itself was read fine)
        self._index.put(self._index_key(path, spec), {
            "sig": sig, "started": iso_or_empty(self.started), "finished": iso_or_empty(self.finished),
            "status": self.status, "last": iso_or_empty(self.last), "facts": self._facts})

    def _fact(self, name: str, compute):
        """A value derived from the result file, remembered in the index while the result file is unchanged."""
        if name in self._facts:
            return self._facts[name]
        value = compute()
        self._facts[name] = value
        if self._index is not None and self.finished and self.is_dir:
            self._index.add_fact(self._index_key(self.path, self.spec), name, value)
        return value

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
            # no result file yet is data ("no result"); a result file that cannot be read is an error
            exists = target is not None and (_present(self.path, listdir(self.path, self._cache),
                                                      self.spec["result_file"]) if self.is_dir else target.exists())
            self._result = read_text(target, self.source, self._cache) if exists else ""
        return self._result

    @property
    def verdict(self) -> str:
        regex = self.spec["verdict_regex"]
        word = self._fact("verdict:" + _fact_key(regex), lambda: _first_group(regex, self.result))
        if not word:
            return ""
        word = word.upper()
        return "ACCEPT" if word in ACCEPT else "REVISE" if word in REVISE else word

    @property
    def has_result(self) -> bool:
        return self._fact("nonblank", lambda: bool(self.result.strip()))

    def findall(self, regex: str) -> list:
        """re.findall(regex, result), remembered in the index for a finished item."""
        return self._fact("findall:" + _fact_key(regex), lambda: [m if isinstance(m, str) else list(m)
                                                                   for m in re.findall(regex, self.result)])

    @property
    def when(self) -> dt.datetime:
        return self.finished or self.last


def _first_group(regex: str, text: str) -> str:
    match = re.search(regex, text)
    return match.group(1) if match else ""


def _sig(st) -> list:
    return [st.st_mtime_ns, st.st_size]


def _jsonable(sig: dict) -> dict:
    return {k: (list(v) if v is not None else None) for k, v in sig.items()}


def iso_or_empty(value) -> str:
    return value.astimezone(UTC).isoformat() if value else ""


class Index:
    """Persistent index of finished run items, kept in the central store between polls (never in the host).

    rows: "<path>\t<spec hash>" -> {sig, started, finished, status, last, facts}. A row is used only when the item's
    directory and every stamp/status/result file still have the recorded mtime_ns and size; otherwise the item is read
    fresh and the row replaced. Rows not seen in a poll are dropped when the index is saved (no unbounded growth)."""

    VERSION = 1

    def __init__(self, rows: dict = None):
        self.rows, self.seen, self.hits, self.misses, self.dirty = dict(rows or {}), {}, 0, 0, False

    @staticmethod
    def restore(row):
        """(started, finished, status, last, facts) of a well-formed row, else None (a cache miss, never a crash)."""
        if not isinstance(row, dict) or not isinstance(row.get("sig"), dict) or not row["sig"]:
            return None
        try:
            started, finished, last = row.get("started", ""), row["finished"], row["last"]
            status, facts = row.get("status", ""), row.get("facts") or {}
            if not all(isinstance(v, str) for v in (started, finished, last, status)) or not finished or not last \
                    or not isinstance(facts, dict) or not all(Index.valid_fact(k, v) for k, v in facts.items()):
                return None
            return (read_iso(started) if started else None, read_iso(finished), status, read_iso(last), dict(facts))
        except (KeyError, ValueError, TypeError, AttributeError, OverflowError):
            return None   # e.g. "0001-01-01T00:00:00+23:00" overflows in the UTC conversion

    @staticmethod
    def valid_fact(name, value) -> bool:
        """A cached fact has exactly the type the uncached path produces (Item.verdict / has_result / findall);
        anything else (an unknown name, "false" for a bool, a number for a verdict) makes the row a cache miss."""
        if not isinstance(name, str):
            return False
        if name == "nonblank":
            return isinstance(value, bool)
        if name.startswith("verdict:"):
            return value is None or isinstance(value, str)
        if name.startswith("findall:"):
            return isinstance(value, list) and all(
                isinstance(m, str) or (isinstance(m, list) and all(isinstance(x, str) for x in m))
                for m in value)
        return False

    def keep(self, key: str, row: dict):
        self.seen[key] = row

    def put(self, key: str, row: dict):
        self.rows[key] = self.seen[key] = row
        self.dirty = True

    def add_fact(self, key: str, name: str, value):
        row = self.seen.get(key) or self.rows.get(key)
        if row is not None:
            row.setdefault("facts", {})[name] = value
            self.seen[key] = row
            self.dirty = True

    def dump(self) -> dict:
        return {"version": self.VERSION, "rows": self.seen}


def done_marker(path: Path, spec: dict, source: str, cache: dict = None) -> bool:
    if any((path / f).exists() for f in spec["finished_files"]):
        return True
    status = path / spec["status_file"] if spec["status_file"] else None
    return bool(status and status.exists() and read_text(status, source, cache).strip() in spec["done_status"])


def glob_paths(ctx, pattern: str, source: str) -> list:
    """Paths of a configured glob. The directory the glob starts in must exist and be readable: a missing or
    unreadable base is a SourceError, not an empty source."""
    full = str(resolve(ctx.repo, pattern))
    base = Path(full)
    while glob.has_magic(str(base)) and base != base.parent:
        base = base.parent
    if not base.exists() or (base.is_dir() and not os.access(base, os.R_OK | os.X_OK)):
        raise SourceError(source, f"{base} is missing or unreadable")
    return walk_glob(base, Path(full).relative_to(base).parts if full != str(base) else (), source)


def walk_glob(base: Path, parts: tuple, source: str) -> list:
    """glob.glob without its silence: every directory the pattern descends into is listed with os.scandir, and a
    listing that fails (permission, I/O) raises SourceError instead of hiding the subtree. A literal component that
    does not exist is simply no match (not every worktree has every folder)."""
    current = [base]
    for depth, part in enumerate(parts):
        last = depth == len(parts) - 1
        nxt = []
        for folder in current:
            if not glob.has_magic(part):
                candidate = folder / part
                try:
                    os.lstat(candidate)
                except (FileNotFoundError, NotADirectoryError):
                    continue
                except OSError as exc:
                    raise SourceError(source, f"{candidate}: {exc.__class__.__name__}")
                nxt.append(candidate)
                continue
            try:
                with os.scandir(folder) as entries:
                    names = [e.name for e in entries]
            except (FileNotFoundError, NotADirectoryError):
                continue
            except OSError as exc:
                raise SourceError(source, f"{folder}: {exc.__class__.__name__}")
            hidden_ok = part.startswith(".")
            for name in sorted(names):
                if (hidden_ok or not name.startswith(".")) and fnmatch.fnmatchcase(name, part):
                    nxt.append(folder / name)
        if not last:   # keep only directories to descend into; a stat failure is an error, not a skip
            dirs = []
            for path in nxt:
                try:
                    if path.is_dir():
                        dirs.append(path)
                except OSError as exc:
                    raise SourceError(source, f"{path}: {exc.__class__.__name__}")
            nxt = dirs
        current = nxt
    return [str(p) for p in current]


def _listing(ctx, pattern: str, source: str) -> list:
    """glob_paths once per poll per pattern (a failure is not cached: it raises again for the next caller)."""
    key = ("glob", pattern)
    if key not in ctx.cache:
        ctx.cache[key] = glob_paths(ctx, pattern, source)
    return ctx.cache[key]


def _item(ctx, path: Path, spec: dict, key: str) -> Item:
    ck = ("item", str(path), spec_key(spec), key)
    if ck not in ctx.cache:
        ctx.cache[ck] = Item(path, spec, key, ctx.cache, getattr(ctx, "index", None))
        stats(ctx)["items"] += 1
    return ctx.cache[ck]


def _rows(ctx, spec: dict, key: str) -> list:
    """The paths of one spec with their mtime and kind, stat-ed once per poll (every window filters these)."""
    ck = ("rows", spec_key(spec), key)
    if ck not in ctx.cache:
        rows = []
        for raw in _listing(ctx, spec["glob"], key):
            path = Path(raw)
            if spec["exclude_regex"] and re.search(spec["exclude_regex"], path.name):
                continue
            try:
                st = os.stat(path)
            except OSError as exc:
                raise SourceError(key, f"{path}: {exc.__class__.__name__}")
            rows.append({"path": path, "mtime": ts(st.st_mtime), "is_dir": statmod.S_ISDIR(st.st_mode),
                         "done": None})
        ctx.cache[ck] = rows
    return ctx.cache[ck]


def items(ctx, key: str, max_age_h: float, required: bool = True) -> list:
    """All run items of a source with activity within max_age_h. Cheap: an old directory that is marked done is skipped
    on two stats; an old directory that is not done is read, because appended logs do not move its mtime. Paths,
    stats and items are shared by every window and detector of the poll; each call returns a new list."""
    out = []
    for spec in specs(ctx, key, required):
        cutoff = ctx.now - dt.timedelta(hours=max_age_h)
        for row in _rows(ctx, spec, key):
            path = row["path"]
            if row["mtime"] < cutoff:
                # A directory's mtime moves when a file is created in it, not when a log is appended to.
                # An old directory is skipped cheaply only when it is marked done; otherwise its files decide.
                if not row["is_dir"]:
                    continue
                if row["done"] is None:
                    row["done"] = done_marker(path, spec, key, ctx.cache)
                if row["done"]:
                    continue
                item = _item(ctx, path, spec, key)
                if item.last >= cutoff:
                    out.append(item)
                continue
            out.append(_item(ctx, path, spec, key))
    return out


def find_item(ctx, key: str, name: str):
    """Look one run item up by name across a source's globs, whatever its age (for an open alert's subject)."""
    for spec in specs(ctx, key, required=False):
        for raw in _listing(ctx, spec["glob"], key):
            path = Path(raw)
            if (path.name if path.is_dir() else path.stem) == name:
                return _item(ctx, path, spec, key)
    return None   # looked and not there: the subject is gone (the caller decides; never a recovery by itself)


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
    rc = git_rc(ctx, "rev-parse", "--verify", "-q", "origin/main")
    if rc not in (0, 1):
        raise SourceError("git", f"rev-parse origin/main exit {rc}")
    return "origin/main" if rc == 0 else "HEAD"


def _raw_history(ctx, days: int) -> dict:
    """One git log of main per poll, over the widest window asked for (at least HISTORY_MIN_DAYS)."""
    raw = ctx.cache.get(("history_raw",))
    if raw is not None and raw["days"] >= days:
        return raw
    fetch = max(days, HISTORY_MIN_DAYS, raw["days"] if raw else 0)
    since = (ctx.now - dt.timedelta(days=fetch)).strftime("%Y-%m-%dT%H:%M:%SZ")
    out = git(ctx, "log", main_ref(ctx), f"--since={since}", "--format=%H%x09%P%x09%ct%x09%s", timeout=20)
    commits, tip = {}, ""
    for line in out.splitlines():
        parts = line.split("\t", 3)
        if len(parts) < 4:
            continue
        sha, parents, ct, subject = parts
        tip = tip or sha
        commits[sha] = (parents.split(), int(ct), subject)
    raw = {"days": fetch, "commits": commits, "tip": tip}
    ctx.cache[("history_raw",)] = raw
    return raw


def history(ctx, days: int) -> dict:
    """Main's history over `days`: exactly what `git log <main> --since=<now - days>` lists (git does not walk past a
    commit older than --since, so a view keeps only commits reachable from the tip through commits inside the
    window), cut from the one wide log of the poll."""
    key = ("history", days)
    if key in ctx.cache:
        return ctx.cache[key]
    raw = _raw_history(ctx, days)
    cutoff = int((ctx.now - dt.timedelta(days=days)).timestamp())
    allc, commits = raw["commits"], {}
    stack = [raw["tip"]] if raw["tip"] and allc[raw["tip"]][1] >= cutoff else []
    while stack:
        sha = stack.pop()
        if sha in commits or sha not in allc or allc[sha][1] < cutoff:
            continue
        commits[sha] = allc[sha]
        stack.extend(allc[sha][0])
    tip = raw["tip"] if commits else ""
    chain, cur = [], tip
    while cur in commits:
        chain.append(cur)
        parents = commits[cur][0]
        cur = parents[0] if parents else ""
    # git log succeeded: an empty window is data (no commits), not a failure
    hist = {"commits": commits, "chain": chain, "chain_set": set(chain), "available": True}
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


def _mention_index(hist: dict) -> dict:
    """token -> merge times, for every first-parent merge subject of a history view. A token is a run of
    [A-Z0-9-] in the uppercased subject, or such a run cut just before one of its dashes: exactly the strings the
    regex (?<![A-Z0-9-])<ID>(?![A-Z0-9]) can match."""
    if "mention_index" not in hist:
        index = {}
        for sha in hist["chain"]:
            parents, ct, subject = hist["commits"][sha]
            if len(parents) < 2:
                continue
            for run in re.findall(r"[A-Z0-9-]+", subject.upper()):
                cuts = {run} | {run[:i] for i, ch in enumerate(run) if ch == "-" and i}
                for token in cuts:
                    index.setdefault(token, []).append(ct)
        hist["mention_index"] = index
    return hist["mention_index"]


def mentions(ctx, work_id: str, days: int) -> list:
    """Merge times (first-parent merges into main) whose subject names the id."""
    hist = history(ctx, days)
    wid = work_id.upper()
    if wid and MENTION_ID.match(wid):
        return sorted(ts(ct) for ct in _mention_index(hist).get(wid, []))
    rx = re.compile(r"(?<![A-Z0-9-])" + re.escape(wid) + r"(?![A-Z0-9])")
    return sorted(ts(hist["commits"][sha][1]) for sha in hist["chain"]
                  if len(hist["commits"][sha][0]) > 1 and rx.search(hist["commits"][sha][2].upper()))


def own_commits(ctx, head: str) -> list:
    """[(commit time, subject)] of `git log <main>..<head>`. The heads of every worktree are asked in one git log
    (<heads> --not <main>), and each head's own commits are the part of that set reachable from it (an ancestor of
    main never leads back out of main). If the batch fails, each head is asked on its own as before, so one bad head
    fails only its own question."""
    ref = main_ref(ctx)
    batch = ctx.cache.get(("own_batch", ref))
    if batch is None:
        heads = sorted({w.get("HEAD", "") for w in worktrees(ctx)} - {""})
        batch = {}
        if heads:
            try:
                out = git(ctx, "log", "--format=%H%x09%P%x09%ct%x09%s", *heads, "--not", ref, "--", timeout=20)
                commits = {}
                for line in out.splitlines():
                    parts = line.split("\t", 3)
                    if len(parts) == 4:
                        commits[parts[0]] = (parts[1].split(), int(parts[2]), parts[3])
                batch = {"commits": commits, "heads": set(heads)}
            except SourceError:
                batch = {"commits": None, "heads": set()}
        ctx.cache[("own_batch", ref)] = batch
    if batch.get("commits") is None or head not in batch.get("heads", ()):
        own = git(ctx, "log", "--format=%ct%x09%s", f"{ref}..{head}").splitlines()
        return [(int(line.split("\t", 1)[0]), line.split("\t", 1)[-1]) for line in own]
    commits, seen, stack, out = batch["commits"], set(), [head], []
    while stack:
        sha = stack.pop()
        if sha in seen or sha not in commits:
            continue
        seen.add(sha)
        parents, ct, subject = commits[sha]
        out.append((ct, subject))
        stack.extend(parents)
    return sorted(out, key=lambda r: -r[0])


def worktrees(ctx) -> list:
    """git worktree list; a failed listing is a SourceError (an empty list would look like every worktree is gone)."""
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
    """The process table; a failed or timed-out ps is a SourceError (an empty table would clear process alerts)."""
    if "ps" not in ctx.cache:
        try:
            proc = subprocess.run(["ps", "-Ao", "pid=,command="], capture_output=True, text=True, timeout=5)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise SourceError("process table", exc.__class__.__name__)
        if proc.returncode != 0 or not proc.stdout.strip():
            raise SourceError("process table", f"ps exit {proc.returncode}")
        out = proc.stdout
        rows = []
        for line in out.splitlines():
            parts = line.strip().split(None, 1)
            if len(parts) == 2 and parts[0].isdigit() and int(parts[0]) != os.getpid():
                rows.append((int(parts[0]), parts[1]))
        ctx.cache["ps"] = rows
    return ctx.cache["ps"]


def read_jsonl(ctx, source: str, path: Path, since: dt.datetime = None) -> list:
    """Rows of a configured JSONL log. A missing or unreadable file is a SourceError. A line that does not parse, or
    has no valid ts, is unknown: it is recorded with ctx.mark_error (no alert resolves this poll) and skipped."""
    if not path.exists():
        raise SourceError(source, f"{path} is missing")
    rows, bad = [], 0
    for line in read_text(path, source).splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
            row["_ts"] = read_iso(row["ts"])
        except (ValueError, KeyError, TypeError, AttributeError):
            bad += 1
            continue
        if since is None or row["_ts"] >= since:
            rows.append(row)
    if bad:
        ctx.mark_error(source, f"{bad} unreadable line(s) in {path}")
    return rows


def field(ctx, source: str, row: dict, key: str, kind=str):
    """A required field of a log row, or None after recording it as unknown (never a default such as 0 or "")."""
    value = row.get(key)
    if kind is int:
        # only a real integer (not a bool, not a float) or a canonical integer string; false or 0.5 is unknown
        if isinstance(value, int) and not isinstance(value, bool):
            return value
        if isinstance(value, str) and re.fullmatch(r"-?(0|[1-9][0-9]*)", value.strip()):
            return int(value.strip())
    elif isinstance(value, str) and value.strip():
        return value
    ctx.mark_error(source, f"row at {row.get('ts', '?')} has no valid {key!r}")
    return None


def read_iso(raw: str) -> dt.datetime:
    raw = raw.strip()
    raw = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    value = dt.datetime.fromisoformat(raw)
    return (value if value.tzinfo else value.astimezone()).astimezone(UTC)
