"""Machine capacity.

Question: Is runner capacity idle while work waits, or is one project holding a runner while another project waits?
Source: sources.slot_events (JSONL lines: ts, host, slot, project, owner, event take | release | wait | cancel; a wait may list eligible hosts); thresholds.machine.capacity {host: slot count} (default: the slots seen in the log)
Rule: a waiter exists while an eligible host has a free slot, on confirm_polls consecutive polls; or one project holds every slot of a host for more than hog_min while another project waits for that host
Threshold: confirm_polls=2, hog_min=30, window_h=24
Owner: merge-operator
Scope: acef
Kind: budget
Tags: infra,runner
"""
import _lib

DEFAULTS = {"confirm_polls": 2, "hog_min": 30, "window_h": 24, "capacity": {}}


def detect(ctx):
    s = ctx.settings
    log = ctx.source("slot_events")
    rows = _lib.read_jsonl(ctx.path(log), ctx.now - _lib.dt.timedelta(hours=s["window_h"]))
    held, waiting, slots_seen = {}, {}, {}
    for row in sorted(rows, key=lambda r: r["_ts"]):
        host, slot, owner, event = row.get("host", "?"), row.get("slot", "?"), row.get("owner", "?"), row.get("event")
        if event in ("take", "release"):
            slots_seen.setdefault(host, set()).add(slot)
        if event == "take":
            held[(host, slot)] = row
            waiting.pop(owner, None)
        elif event == "release":
            held.pop((host, slot), None)
        elif event == "wait":
            waiting[owner] = row
        elif event == "cancel":
            waiting.pop(owner, None)
    capacity = {h: len(v) for h, v in slots_seen.items()}
    capacity.update(s["capacity"] or {})
    out = []
    for owner, row in waiting.items():
        hosts = row.get("hosts") or list(capacity)
        free = [h for h in hosts if capacity.get(h, 0) > sum(1 for (hh, _) in held if hh == h)]
        waited = _lib.minutes(row["_ts"], ctx.now)
        if free:
            out.append({"subject": f"idle:{owner}", "evidence": str(ctx.path(log)), "loss_min": waited,
                        "loss_kind": "time",
                        "summary": f"{owner} ({row.get('project', '?')}) waits {waited} min while "
                                   f"{', '.join(free)} has a free slot"})
        for host in hosts:
            holders = [r for (h, _), r in held.items() if h == host]
            projects = {r.get("project") for r in holders}
            if holders and len(holders) >= capacity.get(host, 0) and len(projects) == 1 and \
                    row.get("project") not in projects:
                since = min(r["_ts"] for r in holders)
                hold = _lib.minutes(since, ctx.now)
                if hold > s["hog_min"]:
                    out.append({"subject": f"hog:{host}:{projects.pop()}", "evidence": str(ctx.path(log)),
                                "loss_min": waited, "loss_kind": "time", "confirm_polls": 1,
                                "summary": f"{holders[0].get('project')} holds every {host} slot for {hold} min "
                                           f"while {owner} ({row.get('project', '?')}) waits {waited} min"})
    return out
