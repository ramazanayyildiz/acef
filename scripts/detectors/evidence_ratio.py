"""Evidence ratio.

Question: Does a merge into main carry far more docs and evidence lines than code lines (R-7, evidence ceiling)?
Source: git history of main (first-parent merges in the window) and `git diff --numstat <merge>^1 <merge>` per merge
Rule: added+deleted lines of docs and evidence (docs_regex) over those of code (every path that is neither docs nor a test, test_regex) above ratio; tests count for neither side; a merge without code lines is not judged; one alert per host lists the count and the five worst merges
Threshold: ratio=3, window_days=7
Owner: coordinator
Scope: acef
Kind: ratio
Tags: ceremony,method
"""
import re

import _lib

DEFAULTS = {"ratio": 3, "window_days": 7,
            # route.py's docs_paths plus evidence directories (generated evidence counts on the docs side)
            "docs_regex": r"(^|/)(docs|evidence)/|\.(md|txt|log|png|jpe?g)$",
            "test_regex": r"(^|/)(tests?|__tests__)/|\.(test|spec)\.[A-Za-z]+$|_test\.\w+$"}


def split_lines(numstat: str, docs, tests) -> tuple:
    """(docs+evidence lines, code lines) of one numstat; binary files ("-") count 0."""
    doc = code = 0
    for line in numstat.splitlines():
        parts = line.split("\t", 2)
        if len(parts) < 3 or not parts[0].isdigit() or not parts[1].isdigit():
            continue
        n, path = int(parts[0]) + int(parts[1]), parts[2].split(" => ")[-1].rstrip("}")
        if tests.search(path):
            continue
        if docs.search(path):
            doc += n
        else:
            code += n
    return doc, code


def detect(ctx):
    s = ctx.settings
    if not _lib.is_git_repo(ctx):
        raise ctx.Skip("no source: git repository")
    docs, tests = re.compile(s["docs_regex"]), re.compile(s["test_regex"])
    over, judged, unjudged = [], 0, []
    for c in _lib.closed_work(ctx, s["window_days"]):
        doc, code = split_lines(_lib.git(ctx, "diff", "--numstat", "--no-renames", f"{c['sha']}^1", c["sha"], timeout=20), docs, tests)
        # no work id in the subject ("Merge pull request #n from ..." reads as branch:pull): name the merge instead
        name = f"merge {c['sha'][:9]}" if c["id"].startswith("branch:") else c["id"]
        if not code:
            unjudged.append(name)
            continue
        judged += 1
        if doc > s["ratio"] * code:
            over.append((doc / code, f"{name} {doc}:{code} ({doc / code:.1f}:1)"))
    if unjudged:
        ctx.note(f"merges without code lines, not judged: {', '.join(sorted(unjudged)[:8])}")
    if not over:
        ctx.clear("ratio")
        return []
    # one alert per host, not per merge: the ceiling is a trend to bring down, not an ack queue
    worst = ", ".join(text for _r, text in sorted(over, reverse=True)[:5])
    return [{"subject": "ratio", "evidence": f"{len(over)} merge(s)",
             "summary": f"{len(over)} of {judged} merges in {s['window_days']} days above {s['ratio']}:1 docs+evidence "
                        f"to code lines (tests excluded); worst: {worst}"}]
