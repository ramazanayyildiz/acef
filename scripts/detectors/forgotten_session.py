"""Forgotten session.

Question: Is an agent, lane or run that is already done or closed still holding a process, a runner slot, a leftover workspace or a merged worktree?
Source: sources.agent_runs (finished items) with the process table; sources.slot_events (take/release); leftover path templates (thresholds.forgotten_session.leftovers, {name} {id}); git worktrees whose branch tip is already merged into main
Rule: more than held_min after the item finished, a live process still names the item's path, a slot the item took is not released, or a leftover path still exists; a worktree whose branch tip was merged more than held_min ago
Threshold: held_min=30, max_age_h=24, merged_worktrees=true
Owner: coordinator
Scope: acef
Kind: age
Tags: infra,runner
"""
import _lib

DEFAULTS = {"held_min": 30, "max_age_h": 24, "merged_worktrees": True, "leftovers": [], "history_days": 14}


def detect(ctx):
    s = ctx.settings
    runs = _lib.specs(ctx, "agent_runs", required=False)
    slots = ctx.source("slot_events", required=False)
    git_ok = bool(_lib.git(ctx, "rev-parse", "--git-dir").strip())
    if not runs and not slots and not (git_ok and s["merged_worktrees"]):
        raise ctx.Skip("no source: agent_runs, slot_events, git worktrees")
    out = []
    held_takes = {}
    if slots:
        for row in _lib.read_jsonl(ctx.path(slots), ctx.now - _lib.dt.timedelta(hours=s["max_age_h"] * 2)):
            k = (row.get("host", ""), row.get("slot", ""))
            if row.get("event") == "take":
                held_takes[k] = row
            elif row.get("event") == "release":
                held_takes.pop(k, None)
    for item in _lib.items(ctx, "agent_runs", s["max_age_h"], required=False) if runs else []:
        if not item.done:
            continue
        done_at = item.finished or item.last
        late = _lib.minutes(done_at, ctx.now)
        if late < s["held_min"]:
            continue
        path = str(item.path)
        procs = [pid for pid, cmd in _lib.processes(ctx) if path in cmd]
        if procs:
            out.append({"subject": f"{item.name}:process", "evidence": path, "loss_min": late, "loss_kind": "time",
                        "summary": f"done {late} min ago, process(es) {', '.join(map(str, procs[:5]))} still run "
                                   f"with its path"})
        for (host, slot), row in held_takes.items():
            if row.get("owner") in (item.name, item.id) and row["_ts"] <= done_at:
                out.append({"subject": f"{item.name}:slot:{host}/{slot}", "evidence": str(ctx.path(slots)),
                            "loss_min": late, "loss_kind": "time",
                            "summary": f"done {late} min ago, still holds {host} {slot} (taken {row['ts']})"})
        for template in s["leftovers"]:
            left = ctx.path(template.format(name=item.name, id=item.id))
            if left.exists():
                out.append({"subject": f"{item.name}:leftover", "evidence": str(left),
                            "summary": f"done {late} min ago, leftover {left} still on disk"})
    if git_ok and s["merged_worktrees"]:
        hist = _lib.history(ctx, s["history_days"])
        merged_at = {}
        for sha in hist["chain"]:
            parents, ct, subject = hist["commits"][sha]
            for p in parents[1:]:
                merged_at.setdefault(p, (ct, sha))
        for wt in _lib.worktrees(ctx):
            path, head, branch = wt.get("worktree", ""), wt.get("HEAD", ""), wt.get("branch", "")
            if not branch or _lib.Path(path).resolve() == ctx.repo.resolve() or head not in merged_at:
                continue
            ct, sha = merged_at[head]
            late = _lib.minutes(_lib.ts(ct), ctx.now)
            if late >= s["held_min"]:
                out.append({"subject": f"worktree:{_lib.Path(path).name}", "evidence": path,
                            "summary": f"branch {branch.replace('refs/heads/', '')} merged {late // 60} h ago "
                                       f"({sha[:9]}), worktree still on disk"})
    return out
