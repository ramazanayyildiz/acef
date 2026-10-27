"""Waiting work.

Question: Is finished work waiting: accepted but not merged, waiting for a review, or accepted but missing from the merge queue?
Source: sources.reviews (verdicts with times); git history of main (merges that name the id); sources.dev_reports (glob of developer reports not yet on main, id from the file name); sources.merge_queue (the queue file, searched as text)
Rule: latest round ACCEPT and not merged for more than accepted_factor x the merge-service median (median of first merge minus accept time over the last median_days, fallback merge_fallback_min below 5 samples); a developer report with no review started after it for review_wait_min; accepted, not merged and its id not in the queue file after queue_grace_min
Threshold: accepted_factor=2, merge_fallback_min=120, review_wait_min=240, queue_grace_min=30, window_days=7, median_days=14
Owner: merge-operator
Scope: acef
Kind: age
Tags: state,host
"""
import re
import statistics

import _lib

DEFAULTS = {"accepted_factor": 2, "merge_fallback_min": 120, "review_wait_min": 240, "queue_grace_min": 30,
            "window_days": 7, "median_days": 14, "dev_report_regex": r"^(?P<id>.+?)-dev-report$",
            "work_id_regex": r"^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+[A-Z]?$"}


def detect(ctx):
    s = ctx.settings
    reviews = _lib.items(ctx, "reviews", s["median_days"] * 24)
    rounds = _lib.rounds_by_id(reviews)
    delays, accepted = [], []
    for work_id, items in rounds.items():
        if not re.match(s["work_id_regex"], work_id):
            continue   # reviews of things that never merge (plans, retros) are not waiting work
        latest = items[-1]
        if latest.verdict != "ACCEPT":
            continue
        merges = [m for m in _lib.mentions(ctx, work_id, s["median_days"] + 1) if m >= latest.when]
        if merges:
            delays.append(_lib.minutes(latest.when, merges[0]))
        elif latest.when >= ctx.now - _lib.dt.timedelta(days=s["window_days"]):
            accepted.append((work_id, latest))
    if len(delays) >= _lib.MIN_SAMPLES:
        median, how = int(statistics.median(delays)), f"median of {len(delays)} accept-to-merge delays"
    else:
        median, how = s["merge_fallback_min"], f"fallback ({len(delays)} accept-to-merge sample(s), need {_lib.MIN_SAMPLES})"
    limit = s["accepted_factor"] * median
    queue_path = ctx.source("merge_queue", required=False)
    queue = ctx.path(queue_path).read_text(errors="replace").upper() if queue_path and ctx.path(queue_path).exists() else None
    if queue_path and queue is None:
        ctx.note(f"merge_queue {queue_path} not found; the queue rule did not run")
    out = []
    for work_id, latest in accepted:
        age = _lib.minutes(latest.when, ctx.now)
        if age > limit:
            out.append({"subject": work_id, "evidence": str(latest.path),
                        "summary": f"accepted {age // 60} h {age % 60} min ago, not merged (limit {limit} min = "
                                   f"{s['accepted_factor']} x {how})"})
        if queue is not None and age > s["queue_grace_min"] and not re.search(
                r"(?<![A-Z0-9-])" + re.escape(work_id) + r"(?![A-Z0-9])", queue):
            out.append({"subject": f"{work_id}:queue", "evidence": str(ctx.path(queue_path)),
                        "summary": f"accepted {age} min ago, not merged, and not named in the merge queue"})
    on_main = None
    for item in _lib.items(ctx, "dev_reports", s["window_days"] * 24, required=False):
        match = re.match(s["dev_report_regex"], item.path.stem)
        if not match:
            continue
        if on_main is None:   # a report already on main belongs to merged work; checkouts reset file times
            on_main = {line.rsplit("/", 1)[-1] for line in
                       _lib.git(ctx, "ls-tree", "-r", "--name-only", _lib.main_ref(ctx)).splitlines()}
        if item.path.name in on_main:
            continue
        work_id = match.group("id").upper()
        age = _lib.minutes(item.when, ctx.now)
        started = [r for r in rounds.get(work_id, []) if (r.started or r.when) >= item.when]
        merged = [m for m in _lib.mentions(ctx, work_id, s["window_days"] + 1) if m >= item.when]
        if age > s["review_wait_min"] and not started and not merged:
            out.append({"subject": f"{work_id}:review", "evidence": str(item.path),
                        "summary": f"developer report {age // 60} h old, no review started after it"})
    seen, unique = set(), []
    for f in out:
        if f["subject"] not in seen:
            seen.add(f["subject"])
            unique.append(f)
    return unique
