"""Stuck agent.

Question: Is an agent, lane or review run making no progress, or retrying the same failure?
Source: sources.agent_runs (run items: start/finish stamps, logs, optional numbered attempt logs); sources.command_log (JSONL lines: ts, cmd, rc, err, tree)
Rule: a running item whose newest file is older than stuck_min; or the same command failing with the same error repeat_fail times in a row with no file change between (same tree hash, or the same attempt-log tail and no result)
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
    try:
        with open(path, "rb") as handle:
            handle.seek(0, 2)
            handle.seek(max(0, handle.tell() - 4096))
            lines = [l.strip() for l in handle.read().decode("utf-8", "replace").splitlines() if l.strip()]
    except OSError:
        return ""
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
    for item in _lib.items(ctx, "agent_runs", s["max_age_h"], required=False) if runs else []:
        if item.running:
            idle = _lib.minutes(item.last, ctx.now)
            if idle >= s["stuck_min"]:
                out.append({"subject": item.name, "evidence": str(item.path), "loss_min": idle, "loss_kind": "time",
                            "summary": f"running since {item.started:%Y-%m-%d %H:%MZ}, no file change for {idle} min"})
                continue
        attempts = item.attempts[-s["repeat_fail"]:]
        if len(attempts) >= s["repeat_fail"] and not item.result.strip():
            tails = {tail_line(a) for a in attempts}
            if len(tails) == 1 and "" not in tails:
                times = [_lib.mtime(_lib.Path(a)) for a in item.attempts]
                span = _lib.minutes(min(times), max(times))
                out.append({"subject": f"{item.name}:repeat", "evidence": str(item.path), "loss_min": span,
                            "loss_kind": "lost-results" if item.done else "time",
                            "summary": f"{len(item.attempts)} attempts, no result, same last line: "
                                       f"{tails.pop()[:120]}"})
    if log:
        since = ctx.now - dt.timedelta(hours=s["max_age_h"])
        by_cmd = {}
        for row in _lib.read_jsonl(ctx.path(log), since):
            by_cmd.setdefault(str(row.get("cmd", "")), []).append(row)
        for cmd, rows in by_cmd.items():
            last = rows[-s["repeat_fail"]:]
            if len(last) < s["repeat_fail"] or any(int(r.get("rc", 0) or 0) == 0 for r in last):
                continue
            errors = {normalise(str(r.get("err", ""))) for r in last}
            trees = {str(r.get("tree", "")) for r in last}
            if len(errors) == 1 and len(trees) == 1:
                span = _lib.minutes(last[0]["_ts"], last[-1]["_ts"])
                out.append({"subject": f"cmd:{cmd[:80]}", "evidence": str(ctx.path(log)), "loss_min": span,
                            "loss_kind": "time",
                            "summary": f"'{cmd[:80]}' failed {len(last)}x in a row with the same error and no file "
                                       f"change: {errors.pop()[:120]}"})
    return out
