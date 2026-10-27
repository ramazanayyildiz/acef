"""Review loop.

Question: Is a piece of work going round and round in review, or does the same finding class keep coming back?
Source: sources.reviews (run items or review files with a verdict line; the item name carries the work id and the round); git history of main (a merge that names the id ends the loop)
Rule: an id with revise_rounds or more REVISE rounds whose latest round is not an ACCEPT and that has not merged into main since (the 3rd REVISE round); or one finding class (finding_class_regex in REVISE results) in class_slices or more ids within window_days
Threshold: revise_rounds=3, class_slices=3, window_days=7
Owner: coordinator
Scope: acef
Kind: trend
Tags: rounds,method
"""
import re

import _lib

DEFAULTS = {
    "revise_rounds": 3,
    "class_slices": 3,
    "window_days": 7,
    "work_id_regex": r"^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+[A-Z]?$",
    "finding_class_regex": r"(?im)^\s*[-*|]?\s*(?:reason|sebep|neden|bulgu[- ]s[ıi]n[ıi]f[ıi]|finding[- ]class)\s*[:=|]\s*\**`?([a-zçğıöşü][a-zçğıöşü-]+)",
}


def detect(ctx):
    s = ctx.settings
    reviews = _lib.items(ctx, "reviews", s["window_days"] * 24)
    out, classes, revise_items = [], {}, 0
    for work_id, rounds in _lib.rounds_by_id(reviews).items():
        if not re.match(s["work_id_regex"], work_id):
            continue
        revised = sorted({r.round for r in rounds if r.verdict == "REVISE"})
        latest = rounds[-1]
        if len(revised) >= s["revise_rounds"] and latest.verdict != "ACCEPT" and not any(
                m >= latest.when for m in _lib.mentions(ctx, work_id, s["window_days"] + 1)):
            state = latest.verdict or ("running" if latest.running else "no verdict")
            out.append({"subject": work_id, "evidence": str(latest.path),
                        "summary": f"{len(revised)} REVISE rounds (rounds {', '.join(map(str, revised))}), "
                                   f"latest round {latest.round}: {state}"})
        elif latest.verdict == "ACCEPT" or any(
                m >= latest.when for m in _lib.mentions(ctx, work_id, s["window_days"] + 1)):
            ctx.clear(work_id)   # accepted or merged; fewer rounds because old ones left the window is UNSEEN
        for r in rounds:
            if r.verdict == "REVISE":
                revise_items += 1
                for cls in set(m.lower() for m in r.findall(s["finding_class_regex"])):
                    classes.setdefault(cls, set()).add(work_id)
    firing = set()
    for cls, ids in sorted(classes.items()):
        if len(ids) >= s["class_slices"]:
            firing.add(f"class:{cls}")
            out.append({"subject": f"class:{cls}", "evidence": ", ".join(sorted(ids)),
                        "summary": f"finding class '{cls}' in {len(ids)} pieces of work within {s['window_days']} "
                                   f"days: {', '.join(sorted(ids)[:6])}"})
    for subject in ctx.open_subjects:
        if subject.startswith("class:"):
            continue   # a class falling below the threshold as rounds leave the window is not a recovery
        elif _lib.mentions(ctx, subject, 30):
            ctx.clear(subject)       # aged out of the window, but merged since
    if revise_items and not classes:
        ctx.note(f"no finding-class data in {revise_items} REVISE result(s) of the window (finding_class_regex "
                 f"matched nothing); the class rule did not run")
    return out
