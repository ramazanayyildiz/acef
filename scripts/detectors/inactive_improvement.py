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


def scan(path, label, today, grace, out, status_ok=True, scanned_labels=None):
    text = _lib.read_text(path, "activation lines")   # unreadable -> SourceError, never "no lines"
    if scanned_labels is not None:
        scanned_labels.add(label)
    for match in LINE.finditer(text):
        value = match.group(1).strip()
        if NONE.search(value) or ACTIVE.search(value) or not status_ok:
            continue
        subject = f"{label}:{re.sub(r'[^a-z0-9]+', '-', value.lower())[:48].strip('-')}"
        owner = OWNER.search(value)
        due = None
        for d in DATE.findall(value):
            try:
                parsed = dt.date.fromisoformat(d)
            except ValueError:   # 2026-99-99 is unknown, not "no date": this file cannot clear anything this poll
                raise _lib.SourceError("activation lines", f"{path}: invalid activation date {d}")
            due = due or parsed
        if not owner:
            out.append({"subject": subject, "evidence": str(path),
                        "summary": f"{label}: activation without an owner: {value[:140]}"})
        elif due and due + dt.timedelta(days=grace) < today:
            out.append({"subject": subject, "evidence": str(path), "loss_kind": "inactive-improvement",
                        "summary": f"{label}: activation date {due} passed, not marked active: {value[:140]}"})


def detect(ctx):
    s = ctx.settings
    today = ctx.now.astimezone().date()
    out, scanned, labels = [], 0, set()
    rules_dir = ctx.store / "rules"
    with ctx.guard("store rules"):
        # Path.glob on an unreadable directory silently yields nothing: use the checked glob
        for rule in sorted(map(_lib.Path, _lib.glob_paths(ctx, str(rules_dir / "R-*.md"), "store rules"))) \
                if rules_dir.is_dir() else []:
            status = re.search(r"(?m)^Status:\s*(\S+)", _lib.read_text(rule, "store rules"))
            scan(rule, rule.stem, today, s["grace_days"], out,
                 status_ok=not status or status.group(1) not in ("retained", "retired", "narrowed"),
                 scanned_labels=labels)
            scanned += 1
    changelogs = ctx.sources.get("changelogs")
    if changelogs is None:
        changelogs = ["CHANGELOG.md"] if (ctx.repo / "CHANGELOG.md").exists() else []
    with ctx.guard("changelogs"):
        for raw in changelogs if isinstance(changelogs, list) else [changelogs]:
            path = ctx.path(raw)
            if not path.exists():
                raise _lib.SourceError("changelogs", f"{path} is missing")
            scan(path, path.name, today, s["grace_days"], out, scanned_labels=labels)
            scanned += 1
    slices_dir = ctx.sources.get("slices_dir")
    if slices_dir:
        cutoff = (ctx.now - dt.timedelta(days=s["notes_days"])).timestamp()
        with ctx.guard("slices_dir"):
            for raw in _lib.glob_paths(ctx, f"{slices_dir}/*.md", "slices_dir"):
                path = _lib.Path(raw)
                try:
                    recent = path.stat().st_mtime >= cutoff
                except OSError as exc:
                    raise _lib.SourceError("slices_dir", f"{path}: {exc.__class__.__name__}")
                if recent:
                    scan(path, path.stem, today, s["grace_days"], out, scanned_labels=labels)
                    scanned += 1
    if not scanned and not ctx.source_errors:
        raise ctx.Skip("no source: store rules, changelogs, slices_dir")
    firing = {f["subject"] for f in out}
    for subject in ctx.open_subjects - firing:
        if subject.split(":", 1)[0] in labels:
            ctx.clear(subject)   # its file was read: the line is fine now, or gone
    return out
