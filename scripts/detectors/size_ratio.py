"""Size ratio.

Question: Is open work running far past the usual time for its route class?
Source: git worktrees with a branch not yet in main (start = first own commit, else the worktree's creation); route class from the work file in the worktree (sources.slices_dir/<ID>.md) or the branch's commit subjects; expected = median cycle time (first own commit to merge, git timestamps) of the same class from closed work in main's history
Rule: open longer than ratio x expected; expected falls back to native 60 / HAFIF 180 / TAM 480 min below 5 closed samples of that class
Threshold: ratio=2, open_window_days=14, expected_window_days=30
Owner: coordinator
Scope: acef
Kind: ratio
Tags: sizing,method
"""
import re

import _lib

DEFAULTS = {"ratio": 2, "open_window_days": 14, "expected_window_days": 30,
            "branch_id_regex": r"(?:^|/)(?P<id>[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d+[A-Za-z]?)$",
            "class_regex": r"(?im)(?:İnceleme sınıfı|Derinlik|Review class|Route|Yol|Sınıf)\s*:?\s*\**\s*(TAM|HAF[İI]F|native|full|light)\b"}
CLASS_NAMES = {"TAM": "TAM", "FULL": "TAM", "HAFİF": "HAFIF", "HAFIF": "HAFIF", "LIGHT": "HAFIF", "NATIVE": "native"}


def detect(ctx):
    s = ctx.settings
    if not _lib.is_git_repo(ctx):   # no .git at all; an unreadable one raises SourceError
        raise ctx.Skip("no source: git repository")
    hist = _lib.history(ctx, s["expected_window_days"] + 30)   # raises when git log fails
    closed = _lib.closed_work(ctx, s["expected_window_days"])
    slices_dir = ctx.sources.get("slices_dir") or ""
    out, unknown, open_ids, merged_ids = [], [], set(), set()
    for wt in _lib.worktrees(ctx):
        path, head, branch = wt.get("worktree", ""), wt.get("HEAD", ""), wt.get("branch", "")
        if not branch or _lib.Path(path).resolve() == ctx.repo.resolve():
            continue
        short = branch.replace("refs/heads/", "")
        match = re.search(s["branch_id_regex"], short)
        if not match:
            continue
        work_id = match.group("id").upper()
        if head in hist["commits"]:
            merged_ids.add(work_id)   # its tip is in main: positively no longer open
            continue
        open_ids.add(work_id)
        own = _lib.git(ctx, "log", "--format=%ct%x09%s", f"{_lib.main_ref(ctx)}..{head}").splitlines()
        if own:
            start = _lib.ts(min(int(line.split("\t", 1)[0]) for line in own))
        else:
            git_file = _lib.Path(path) / ".git"
            start = _lib.mtime(git_file) if git_file.exists() else None
        if not start or start < ctx.now - _lib.dt.timedelta(days=s["open_window_days"]):
            continue   # outside the window: not judged, so not cleared either (UNSEEN)
        cls = "unknown"
        spec = _lib.Path(path) / slices_dir / f"{work_id}.md" if slices_dir else None
        if spec and spec.exists():
            found = re.search(s["class_regex"], _lib.read_text(spec, "slices_dir")[:20000])
            if found:
                cls = CLASS_NAMES.get(found.group(1).upper(), "unknown")
        if cls == "unknown":
            cls = _lib.route_class(ctx, " ".join(line.split("\t", 1)[-1] for line in own))
        if cls == "unknown":
            unknown.append(work_id)
            continue
        expected, how = _lib.expected_minutes(ctx, cls, closed)
        elapsed = _lib.minutes(start, ctx.now)
        if expected and elapsed > s["ratio"] * expected:
            out.append({"subject": work_id, "evidence": path,
                        "summary": f"{cls} work open {elapsed // 60} h {elapsed % 60} min (wall clock since "
                                   f"{'first own commit' if own else 'worktree creation'}), expected {expected} min "
                                   f"({how}), ratio {elapsed / expected:.1f}"})
        else:
            ctx.clear(work_id)
    for subject in ctx.open_subjects - {f["subject"] for f in out}:
        if subject in merged_ids or _lib.mentions(ctx, subject, s["expected_window_days"]):
            ctx.clear(subject)   # merged into main; a worktree that is merely gone or aged out is UNSEEN
    if unknown:
        ctx.note(f"route class unknown, not sized: {', '.join(sorted(unknown)[:8])}")
    return out
