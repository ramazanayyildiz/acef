"""Stuck agent.

Question: Is an agent, lane or review run making no progress, or retrying the same failure?
Source: sources.agent_runs (run items: start/finish stamps, logs, optional numbered attempt logs); sources.command_log (JSONL lines: ts, cmd, rc, err, tree)
Rule: a running item whose newest file is older than stuck_min; or the same command failing with the same error repeat_fail times in a row with no file change between (the same non-empty tree hash; a missing hash is unknown, not "no change"; or the same attempt-log tail and no result). Resolves only on an observed finish, observed progress, a produced result or differing attempt endings; missing stamps or logs leave the alert open
Threshold: stuck_min=30, repeat_fail=3, max_age_h=12
Owner: coordinator
Scope: acef
Kind: age
Tags: infra,runner
"""
import datetime as dt
import re

import _lib

DEFAULTS = {"stuck_min": 30, "repeat_fail": 3, "max_age_h": 12}


def tail_line(path: str) -> str:
    """Last non-empty line of an attempt log ("" = the log is empty). An unreadable log is a SourceError."""
    try:
        with open(path, "rb") as handle:
            handle.seek(0, 2)
            handle.seek(max(0, handle.tell() - 4096))
            lines = [l.strip() for l in handle.read().decode("utf-8", "replace").splitlines() if l.strip()]
    except OSError as exc:
        raise _lib.SourceError("agent_runs", f"{path}: {exc.__class__.__name__}")
    return normalise(lines[-1]) if lines else ""


def normalise(text: str) -> str:
    return re.sub(r"\d+", "#", re.sub(r"[0-9a-f]{7,40}", "<sha>", text or ""))[:200]


def detect(ctx):
    s = ctx.settings
    runs = _lib.specs(ctx, "agent_runs", required=False)
    log = ctx.source("command_log", required=False)
    if not runs and not log:
        raise ctx.Skip("no source: agent_runs, command_log")
    out = []
    with ctx.guard("agent_runs"):
        found = _lib.items(ctx, "agent_runs", s["max_age_h"], required=False) if runs else []
        names = {i.name for i in found}
        for subject in ctx.open_subjects:   # an open alert's run that aged out of the window is looked up directly
            name = subject.rsplit(":repeat", 1)[0]
            if runs and not subject.startswith("cmd:") and name not in names:
                item = _lib.find_item(ctx, "agent_runs", name)
                if item:
                    found.append(item)
                    names.add(name)
        for item in found:
            if item.running and _lib.minutes(item.last, ctx.now) >= s["stuck_min"]:
                idle = _lib.minutes(item.last, ctx.now)
                out.append({"subject": item.name, "evidence": str(item.path), "loss_min": idle, "loss_kind": "time",
                            "summary": f"running since {item.started:%Y-%m-%d %H:%MZ}, no file change for {idle} min"})
                continue
            if item.done or item.running:
                ctx.clear(item.name)   # observed finish, or observed progress (a running item with a recent change)
            # neither: no start stamp and no finish -> no evidence either way, the alert stays open (UNSEEN)
            attempts = item.attempts[-s["repeat_fail"]:]
            tails = {tail_line(a) for a in attempts}
            has_result = item.has_result
            if has_result:
                ctx.clear(f"{item.name}:repeat")   # a result was produced
                continue
            if len(attempts) < s["repeat_fail"] or "" in tails:
                continue   # attempt logs missing or unreadable: no evidence, not a recovery
            if len(tails) == 1:
                times = [_lib.mtime(_lib.Path(a)) for a in item.attempts]
                span = _lib.minutes(min(times), max(times))
                out.append({"subject": f"{item.name}:repeat", "evidence": str(item.path), "loss_min": span,
                            "loss_kind": "lost-results" if item.done else "time",
                            "summary": f"{len(item.attempts)} attempts, no result, same last line: "
                                       f"{tails.pop()[:120]}"})
            else:
                ctx.clear(f"{item.name}:repeat")   # the last attempts ended differently: not the same failure
    if log:
        with ctx.guard("command_log"):
            check_log(ctx, s, log, out)
    return out


def check_log(ctx, s, log, out):
    since = ctx.now - dt.timedelta(hours=s["max_age_h"])
    by_cmd, src = {}, "command_log"
    for row in _lib.read_jsonl(ctx, src, ctx.path(log), since):
        cmd = _lib.field(ctx, src, row, "cmd")
        rc = _lib.field(ctx, src, row, "rc", int)
        if cmd is None or rc is None:
            continue   # unknown row: recorded as a source error, never read as a success
        row["_rc"] = rc
        by_cmd.setdefault(cmd, []).append(row)
    unknown = []
    for cmd, rows in by_cmd.items():
        subject = f"cmd:{cmd[:80]}"
        last = rows[-s["repeat_fail"]:]
        if last[-1]["_rc"] == 0:
            ctx.clear(subject)   # the latest run of the command succeeded (an explicit rc 0)
            continue
        if len(last) < s["repeat_fail"] or any(r["_rc"] == 0 for r in last):
            continue   # too few rows in the window to judge: not a recovery
        errs = [_lib.field(ctx, src, r, "err") for r in last]
        if any(e is None for e in errs):
            continue   # error text unknown: cannot say "the same error"
        errors = {normalise(e) for e in errs}
        trees = [str(r.get("tree") or "").strip() for r in last]
        if any(not t for t in trees):
            unknown.append(cmd[:40])   # no tree hash: "no file change between" cannot be known
            continue
        if len(errors) == 1 and len(set(trees)) == 1:
            span = _lib.minutes(last[0]["_ts"], last[-1]["_ts"])
            out.append({"subject": subject, "evidence": str(ctx.path(log)), "loss_min": span,
                        "loss_kind": "time",
                        "summary": f"'{cmd[:80]}' failed {len(last)}x in a row with the same error and no file "
                                   f"change: {errors.pop()[:120]}"})
        else:
            ctx.clear(subject)
    if unknown:
        ctx.note(f"repeated failures without a tree hash, file change unknown, not judged: {', '.join(unknown)}")
