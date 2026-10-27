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
    git_ok = False
    if s["merged_worktrees"]:
        with ctx.guard("git"):
            git_ok = _lib.is_git_repo(ctx)
    if not runs and not slots and not git_ok and not ctx.source_errors:
        raise ctx.Skip("no source: agent_runs, slot_events, git worktrees")
    out = []
    held_takes, releases, slots_read = {}, {}, False
    if slots:
        with ctx.guard("slot_events"):
            src = "slot_events"
            for row in _lib.read_jsonl(ctx, src, ctx.path(slots), ctx.now - _lib.dt.timedelta(hours=s["max_age_h"] * 2)):
                event = _lib.field(ctx, src, row, "event")
                if event not in ("take", "release"):
                    continue
                host, slot = _lib.field(ctx, src, row, "host"), _lib.field(ctx, src, row, "slot")
                owner = _lib.field(ctx, src, row, "owner") if event == "take" else ""
                if host is None or slot is None or owner is None:
                    continue   # unknown row: recorded, not judged
                if event == "take":
                    held_takes[(host, slot)] = row
                else:
                    held_takes.pop((host, slot), None)
                    releases.setdefault((host, slot), []).append(row["_ts"])
            slots_read = True
    if runs:
        with ctx.guard("agent_runs"):
            check_runs(ctx, s, slots if slots_read else None, held_takes, releases, out)
    if git_ok:
        with ctx.guard("git worktrees"):
            check_worktrees(ctx, s, out)
    return out


def check_runs(ctx, s, slots, held_takes, releases, out):
    found = _lib.items(ctx, "agent_runs", s["max_age_h"], required=False)
    names = {i.name for i in found}
    for subject in ctx.open_subjects:   # an open alert's run that aged out of the window is looked up directly
        name = subject.split(":", 1)[0]
        if not subject.startswith("worktree:") and name not in names:
            item = _lib.find_item(ctx, "agent_runs", name)
            if item:
                found.append(item)
                names.add(name)
    table = None
    with ctx.guard("process table"):
        table = _lib.processes(ctx)   # None after a failure: process alerts are neither raised nor cleared
    for item in found:
        if not item.done:
            continue
        done_at = item.finished or item.last
        late = _lib.minutes(done_at, ctx.now)
        if late < s["held_min"]:
            continue
        path = str(item.path)
        if table is not None:
            procs = [pid for pid, cmd in table if path in cmd]
            if not procs:
                ctx.clear(f"{item.name}:process")   # the process table was read and has no process for it
            else:
                out.append({"subject": f"{item.name}:process", "evidence": path, "loss_min": late,
                            "loss_kind": "time",
                            "summary": f"done {late} min ago, process(es) {', '.join(map(str, procs[:5]))} still "
                                       f"run with its path"})
        if slots is not None:
            held_now = {f"{item.name}:slot:{h}/{sl}" for (h, sl), r in held_takes.items()
                        if r.get("owner") in (item.name, item.id) and r["_ts"] <= done_at}
            for subject in ctx.open_subjects:
                if subject.startswith(f"{item.name}:slot:") and subject not in held_now:
                    host, _, slot = subject.split(":slot:", 1)[1].partition("/")
                    since = ctx.open_since.get(subject, ctx.now)
                    if any(t >= since for t in releases.get((host, slot), [])):
                        ctx.clear(subject)   # a release seen after the alert opened; an aged-out take is UNSEEN
            for (host, slot), row in held_takes.items():
                if row.get("owner") in (item.name, item.id) and row["_ts"] <= done_at:
                    out.append({"subject": f"{item.name}:slot:{host}/{slot}", "evidence": str(ctx.path(slots)),
                                "loss_min": late, "loss_kind": "time",
                                "summary": f"done {late} min ago, still holds {host} {slot} (taken {row['ts']})"})
        for template in s["leftovers"]:
            left = ctx.path(template.format(name=item.name, id=item.id))
            try:
                exists = left.exists() or left.is_symlink()
                left.parent.stat()   # the parent must be readable for "it is gone" to mean anything
            except OSError as exc:
                raise _lib.SourceError("leftovers", f"{left}: {exc.__class__.__name__}")
            if not exists:
                ctx.clear(f"{item.name}:leftover")
            else:
                out.append({"subject": f"{item.name}:leftover", "evidence": str(left),
                            "summary": f"done {late} min ago, leftover {left} still on disk"})


def check_worktrees(ctx, s, out):
    hist = _lib.history(ctx, s["history_days"])
    merged_at = {}
    for sha in hist["chain"]:
        parents, ct, subject = hist["commits"][sha]
        for p in parents[1:]:
            merged_at.setdefault(p, (ct, sha))
    listed = _lib.worktrees(ctx)   # raises on failure: an empty listing never means "all gone"
    names_now = {f"worktree:{_lib.Path(w.get('worktree', '')).name}" for w in listed}
    for subject in ctx.open_subjects:
        if subject.startswith("worktree:") and subject not in names_now:
            ctx.clear(subject)   # a successful git worktree list no longer has it
    ref = _lib.main_ref(ctx)
    for wt in listed:
        path, head, branch = wt.get("worktree", ""), wt.get("HEAD", ""), wt.get("branch", "")
        if not branch or _lib.Path(path).resolve() == ctx.repo.resolve():
            continue
        subject = f"worktree:{_lib.Path(path).name}"
        if head not in merged_at:
            if subject in ctx.open_subjects:
                # the merge may only have left the history window: ask git directly
                rc = _lib.git_rc(ctx, "merge-base", "--is-ancestor", head, ref)
                if rc == 0:
                    out.append({"subject": subject, "evidence": path,
                                "summary": f"branch {branch.replace('refs/heads/', '')} merged before the "
                                           f"{s['history_days']}-day history window, worktree still on disk"})
                elif rc == 1:
                    ctx.clear(subject)   # git's definite answer: not merged (for example new commits)
                else:   # 128: no answer, so nothing resolves this poll
                    ctx.mark_error("git", f"{subject}: merge-base --is-ancestor gave no answer (exit {rc})")
            continue
        ct, sha = merged_at[head]
        late = _lib.minutes(_lib.ts(ct), ctx.now)
        if late >= s["held_min"]:
            out.append({"subject": subject, "evidence": path,
                        "summary": f"branch {branch.replace('refs/heads/', '')} merged {late // 60} h ago "
                                   f"({sha[:9]}), worktree still on disk"})
