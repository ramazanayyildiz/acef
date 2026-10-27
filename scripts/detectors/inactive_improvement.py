"""Inactive improvement.

Question: Is an approved or merged improvement still not in effect because its activation has no owner or its date has passed?
Source: central store rules (rules/R-*.md "Activation:" and "Status:"); sources.changelogs (files, default the host's CHANGELOG.md); closing notes in sources.slices_dir (*.md changed within notes_days); lines "Activation:", "Aktivasyon:" or "Etkinleşme:"
Rule: an activation precondition (anything but none / yok / immediate / active) with no owner ("owner: <name>", "sahip: <name>" or "@name"), or with a date (YYYY-MM-DD) before today while it is not marked active or done
Threshold: grace_days=0, notes_days=60
Owner: coordinator
Scope: acef
Kind: absence
Tags: method
"""
import datetime as dt
import re

import _lib

DEFAULTS = {"grace_days": 0, "notes_days": 60}
LINE = re.compile(r"(?im)^\s*[-*]?\s*\**(?:activation|aktivasyon|etkinle[şs]me)\**\s*:\s*(.+)$")
NONE = re.compile(r"(?i)^\W*(none|yok|immediate|hemen|n/?a|-|—)\W*$|^\W*(none|yok|immediate|hemen)\b")
ACTIVE = re.compile(r"(?i)\b(active|activated|in effect|etkin(?:leşti)?|done|live|tamam)\b")
OWNER = re.compile(r"(?i)(?:owner|sahip|sorumlu)\s*[:=]\s*([^\s,;)]+)|@([\w.-]+)")
DATE = re.compile(r"\b(\d{4}-\d{2}-\d{2})\b")


def scan(path, label, today, grace, out, status_ok=True):
    try:
        text = path.read_text(errors="replace")
    except OSError:
        return
    for match in LINE.finditer(text):
        value = match.group(1).strip()
        if NONE.search(value) or ACTIVE.search(value) or not status_ok:
            continue
        subject = f"{label}:{re.sub(r'[^a-z0-9]+', '-', value.lower())[:48].strip('-')}"
        owner = OWNER.search(value)
        dates = [d for d in DATE.findall(value)]
        due = None
        for d in dates:
            try:
                due = dt.date.fromisoformat(d)
                break
            except ValueError:
                continue
        if not owner:
            out.append({"subject": subject, "evidence": str(path),
                        "summary": f"{label}: activation without an owner: {value[:140]}"})
        elif due and due + dt.timedelta(days=grace) < today:
            out.append({"subject": subject, "evidence": str(path), "loss_kind": "inactive-improvement",
                        "summary": f"{label}: activation date {due} passed, not marked active: {value[:140]}"})


def detect(ctx):
    s = ctx.settings
    today = ctx.now.astimezone().date()
    out, scanned = [], 0
    rules_dir = ctx.store / "rules"
    for rule in sorted(rules_dir.glob("R-*.md")) if rules_dir.is_dir() else []:
        status = re.search(r"(?m)^Status:\s*(\S+)", rule.read_text(errors="replace"))
        scan(rule, rule.stem, today, s["grace_days"], out,
             status_ok=not status or status.group(1) not in ("retained", "retired", "narrowed"))
        scanned += 1
    changelogs = ctx.sources.get("changelogs")
    if changelogs is None:
        changelogs = ["CHANGELOG.md"] if (ctx.repo / "CHANGELOG.md").exists() else []
    for raw in changelogs if isinstance(changelogs, list) else [changelogs]:
        path = ctx.path(raw)
        if path.exists():
            scan(path, path.name, today, s["grace_days"], out)
            scanned += 1
    slices_dir = ctx.sources.get("slices_dir")
    if slices_dir and ctx.path(slices_dir).is_dir():
        cutoff = (ctx.now - dt.timedelta(days=s["notes_days"])).timestamp()
        for path in ctx.path(slices_dir).glob("*.md"):
            if path.stat().st_mtime >= cutoff:
                scan(path, path.stem, today, s["grace_days"], out)
                scanned += 1
    if not scanned:
        raise ctx.Skip("no source: store rules, changelogs, slices_dir")
    return out
