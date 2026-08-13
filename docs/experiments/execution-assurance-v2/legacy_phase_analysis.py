#!/usr/bin/env python3
"""Reconstruct the legacy P0 Full-BMAD timing profile from immutable run evidence.

The analysis intentionally does not rerun ACEF. It reads the frozen pilot row,
the recorded parent session, and child session files referenced by thread id.
Overlapping worker intervals are split equally so phase allocations sum to wall
time instead of overstating it by summing concurrent actor spans.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
PILOT_PATH = REPO_ROOT / "docs/experiments/execution-assurance-v2/runs/pilot.jsonl"


def parse_timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def read_jsonl(path: Path):
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def category_for(task_name: str) -> str:
    if "epic_test_quality_correct_course" in task_name:
        return "Correct course"
    if "epic_test_review" in task_name:
        return "Epic test review"
    rules = (
        ("readiness", "Readiness"),
        ("_nfr", "NFR"),
        ("_atdd", "ATDD"),
        ("_development", "Development"),
        ("code_review", "Code review"),
        ("verify_patch", "Verify patch"),
        ("test_review", "Story test review"),
        ("process_judge", "Process judge"),
        ("test_design", "Epic test design"),
        ("manual_qa", "Manual QA"),
        ("coverage_remediation", "Coverage remediation"),
        ("coverage_automation", "Coverage automation"),
        ("trace", "Traceability"),
    )
    for marker, category in rules:
        if marker in task_name:
            return category
    return "Other"


def stage_for(category: str) -> str:
    if category in {"Epic test design", "Readiness", "NFR"}:
        return "Readiness and risk design"
    if category in {"ATDD", "Development"}:
        return "Build path (ATDD + development)"
    if category in {
        "Code review",
        "Verify patch",
        "Story test review",
        "Process judge",
    }:
        return "Story assurance"
    if category in {
        "Manual QA",
        "Traceability",
        "Coverage automation",
        "Coverage remediation",
        "Epic test review",
        "Correct course",
    }:
        return "Epic closeout"
    return "Other actor work"


def legacy_row() -> dict[str, Any]:
    rows = [row for row in read_jsonl(PILOT_PATH) if row.get("attemptId") == "P0-legacy"]
    if len(rows) != 1:
        raise RuntimeError(f"Expected one P0-legacy row, found {len(rows)}")
    return rows[0]


def child_turns(session_path: Path) -> list[dict[str, Any]]:
    """Return active task turns, excluding idle time between resumed turns."""

    starts: list[datetime] = []
    completions: list[tuple[datetime, str]] = []
    for record in read_jsonl(session_path):
        payload = record.get("payload", {})
        if record.get("type") != "event_msg":
            continue
        if payload.get("type") == "task_started":
            starts.append(parse_timestamp(record["timestamp"]))
        elif payload.get("type") == "task_complete":
            completions.append(
                (
                    parse_timestamp(record["timestamp"]),
                    payload.get("last_agent_message", ""),
                )
            )

    turns = []
    for start in starts:
        completion = next((item for item in completions if item[0] >= start), None)
        if completion is None:
            continue
        turns.append(
            {
                "start": start,
                "end": completion[0],
                "last_agent_message": completion[1],
            }
        )
    return turns


def resumed_turn_category(last_agent_message: str) -> str:
    """Classify resumed child work from its durable completion receipt."""

    if "Backend reuse assessment" in last_agent_message:
        return "Coverage automation"
    return "Other"


def extract_exec_commands(tool_input: str) -> list[str]:
    decoder = json.JSONDecoder()
    commands = []
    for match in re.finditer(r"tools\.exec_command\(", tool_input):
        try:
            value, _ = decoder.raw_decode(tool_input[match.end() :].lstrip())
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict) and isinstance(value.get("cmd"), str):
            commands.append(value["cmd"])
    return commands


def command_kinds(command: str) -> set[str]:
    if "evidence-run" in command:
        segments = [command.rsplit(" -- ", 1)[-1].strip()]
    else:
        segments = [part.strip() for part in re.split(r"\n|&&|;", command)]
    kinds = set()
    for segment in segments:
        if re.match(
            r"^(?:env\s+\S+\s+)*(?:php artisan test|vendor/bin/phpunit|"
            r"\./vendor/bin/phpunit|pytest|npm (?:run )?test|pnpm (?:run )?test)",
            segment,
        ):
            kinds.add("test")
        if re.match(r"^php scripts/bmad/product-done-audit\.php", segment):
            kinds.add("product-audit")
    return kinds


def measure_test_runtime(parent_path: Path) -> dict[str, Any]:
    """Measure recognizable test/audit exec batches across recursive sessions."""

    session_dir = parent_path.parent
    queue: list[tuple[str, str | None, Path]] = [("conductor", None, parent_path)]
    seen = {parent_path}
    sessions: list[tuple[str, str, Path]] = []

    while queue:
        task_name, parent_category, session_path = queue.pop(0)
        if session_path == parent_path:
            category = "Conductor"
        elif task_name.startswith("acef_"):
            category = category_for(task_name)
        else:
            category = parent_category or "Nested reviewer"
        sessions.append((task_name, category, session_path))
        for record in read_jsonl(session_path):
            payload = record.get("payload", {})
            if not (
                record.get("type") == "event_msg"
                and payload.get("type") == "sub_agent_activity"
                and payload.get("kind") == "started"
            ):
                continue
            candidates = list(
                session_dir.glob(f"*{payload['agent_thread_id']}.jsonl")
            )
            if candidates and candidates[0] not in seen:
                seen.add(candidates[0])
                queue.append(
                    (
                        payload["agent_path"].split("/")[-1],
                        category,
                        candidates[0],
                    )
                )

    batches = []
    for task_name, category, session_path in sessions:
        records = list(read_jsonl(session_path))
        outputs = {
            record.get("payload", {}).get("call_id"): record
            for record in records
            if record.get("type") == "response_item"
            and record.get("payload", {}).get("type")
            == "custom_tool_call_output"
        }
        for record in records:
            payload = record.get("payload", {})
            if not (
                record.get("type") == "response_item"
                and payload.get("type") == "custom_tool_call"
                and payload.get("name") == "exec"
            ):
                continue
            kinds: set[str] = set()
            for command in extract_exec_commands(payload.get("input", "")):
                kinds.update(command_kinds(command))
            if not kinds:
                continue
            output = outputs.get(payload.get("call_id"))
            wall_seconds = 0.0
            if output:
                match = re.search(
                    r"Wall time ([0-9.]+) seconds",
                    str(output.get("payload", {}).get("output", "")),
                )
                if match:
                    wall_seconds = float(match.group(1))
            for kind in kinds:
                batches.append(
                    {
                        "kind": kind,
                        "category": category,
                        "task": task_name,
                        "wall_seconds": wall_seconds,
                    }
                )

    by_kind = {}
    for kind in ("test", "product-audit"):
        rows = [batch for batch in batches if batch["kind"] == kind]
        categories = []
        for category in sorted({row["category"] for row in rows}):
            category_rows = [row for row in rows if row["category"] == category]
            categories.append(
                {
                    "category": category,
                    "batch_count": len(category_rows),
                    "wall_seconds": round(
                        sum(row["wall_seconds"] for row in category_rows), 1
                    ),
                }
            )
        categories.sort(key=lambda row: row["wall_seconds"], reverse=True)
        by_kind[kind] = {
            "batch_count": len(rows),
            "wall_seconds": round(sum(row["wall_seconds"] for row in rows), 1),
            "categories": categories,
        }
    return {"recursive_session_count": len(sessions), **by_kind}


def reconstruct() -> dict[str, Any]:
    row = legacy_row()
    run_start = parse_timestamp(row["startedAt"])
    run_end = parse_timestamp(row["finishedAt"])
    parent_path = Path(row["collaborationEvidence"]["sessionPath"])
    if not parent_path.is_file():
        raise FileNotFoundError(parent_path)
    test_runtime = measure_test_runtime(parent_path)

    actors: list[dict[str, Any]] = []
    spawn_attempts = 0
    for record in read_jsonl(parent_path):
        payload = record.get("payload", {})
        if (
            record.get("type") == "response_item"
            and payload.get("type") == "function_call"
            and payload.get("name") == "spawn_agent"
        ):
            spawn_attempts += 1
        if (
            record.get("type") == "event_msg"
            and payload.get("type") == "sub_agent_activity"
            and payload.get("kind") == "started"
        ):
            task_name = payload["agent_path"].split("/")[-1]
            actors.append(
                {
                    "task": task_name,
                    "thread_id": payload["agent_thread_id"],
                    "start": parse_timestamp(record["timestamp"]),
                    "category": category_for(task_name),
                }
            )

    session_dir = parent_path.parent
    missing_sessions: list[str] = []
    session_span_seconds = 0.0
    intervals: list[dict[str, Any]] = []
    multi_turn_sessions = 0
    for actor in actors:
        candidates = list(session_dir.glob(f"*{actor['thread_id']}.jsonl"))
        if len(candidates) != 1:
            missing_sessions.append(actor["thread_id"])
            continue
        actor["session_path"] = str(candidates[0])
        actor["turns"] = child_turns(candidates[0])
        if not actor["turns"]:
            continue
        session_span_seconds += (
            actor["turns"][-1]["end"] - actor["start"]
        ).total_seconds()
        if len(actor["turns"]) > 1:
            multi_turn_sessions += 1
        for turn_index, turn in enumerate(actor["turns"], start=1):
            category = (
                actor["category"]
                if turn_index == 1
                else resumed_turn_category(turn["last_agent_message"])
            )
            intervals.append(
                {
                    "task": actor["task"]
                    if turn_index == 1
                    else f"{actor['task']}#turn{turn_index}",
                    "session_task": actor["task"],
                    "thread_id": actor["thread_id"],
                    "start": turn["start"],
                    "end": turn["end"],
                    "category": category,
                    "turn_index": turn_index,
                    "active_seconds": (turn["end"] - turn["start"]).total_seconds(),
                }
            )

    complete_actors = [actor for actor in actors if actor.get("turns")]
    points = sorted(
        {run_start, run_end}
        | {interval[key] for interval in intervals for key in ("start", "end")}
    )
    task_wall_seconds: defaultdict[str, float] = defaultdict(float)
    category_wall_seconds: defaultdict[str, float] = defaultdict(float)
    no_actor_seconds = 0.0
    actor_union_seconds = 0.0
    concurrent_seconds = 0.0
    max_concurrency = 0

    for left, right in zip(points, points[1:]):
        seconds = (right - left).total_seconds()
        live = [
            interval
            for interval in intervals
            if interval["start"] <= left and interval["end"] >= right
        ]
        max_concurrency = max(max_concurrency, len(live))
        if not live:
            no_actor_seconds += seconds
            continue
        actor_union_seconds += seconds
        if len(live) > 1:
            concurrent_seconds += seconds
        share = seconds / len(live)
        for interval in live:
            task_wall_seconds[interval["task"]] += share
            category_wall_seconds[interval["category"]] += share

    stage_wall_seconds: defaultdict[str, float] = defaultdict(float)
    for category, seconds in category_wall_seconds.items():
        stage_wall_seconds[stage_for(category)] += seconds
    stage_wall_seconds["Conductor-only / orchestration"] = no_actor_seconds

    accepted_tasks = {
        actor["taskName"] for actor in row["collaborationEvidence"].get("acceptedActors", [])
    }
    required_actor_starts = [
        interval["start"]
        for interval in intervals
        if interval["turn_index"] == 1 and interval["task"] in accepted_tasks
    ]
    timestamp_wall_seconds = (run_end - run_start).total_seconds()
    official_seconds = float(row["activeDeliverySeconds"])
    explicit_retry_seconds = sum(
        seconds for task, seconds in task_wall_seconds.items() if "retry" in task
    )
    superseded_first_attempts = {
        "acef_epic_test_design",
        "acef_s1_readiness",
        "acef_s2_middleware_idempotency_code_review",
        "acef_s2_middleware_idempotency_verify_patch",
        "acef_epic_trace",
    }
    superseded_first_attempt_seconds = sum(
        task_wall_seconds[task] for task in superseded_first_attempts
    )

    category_rows = [
        {
            "category": category,
            "actor_count": len(
                {
                    interval["thread_id"]
                    for interval in intervals
                    if interval["category"] == category
                }
            ),
            "allocated_wall_minutes": round(seconds / 60, 2),
            "share_of_timestamp_wall": round(seconds / timestamp_wall_seconds, 4),
        }
        for category, seconds in sorted(
            category_wall_seconds.items(), key=lambda item: item[1], reverse=True
        )
    ]
    stage_rows = [
        {
            "stage": stage,
            "allocated_wall_minutes": round(seconds / 60, 2),
            "share_of_timestamp_wall": round(seconds / timestamp_wall_seconds, 4),
        }
        for stage, seconds in sorted(
            stage_wall_seconds.items(), key=lambda item: item[1], reverse=True
        )
    ]
    actor_rows = [
        {
            "task": interval["task"],
            "category": interval["category"],
            "span_minutes": round(interval["active_seconds"] / 60, 2),
            "allocated_wall_minutes": round(
                task_wall_seconds[interval["task"]] / 60, 2
            ),
            "explicit_retry": "retry" in interval["task"],
            "turn_index": interval["turn_index"],
        }
        for interval in sorted(
            intervals, key=lambda item: task_wall_seconds[item["task"]], reverse=True
        )
    ]

    return {
        "run": {
            "attempt_id": row["attemptId"],
            "attempt_run_id": row["attemptRunId"],
            "started_at": row["startedAt"],
            "finished_at": row["finishedAt"],
            "official_active_delivery_seconds": official_seconds,
            "official_active_delivery_minutes": round(official_seconds / 60, 2),
            "timestamp_wall_seconds": timestamp_wall_seconds,
            "timestamp_vs_official_seconds": round(timestamp_wall_seconds - official_seconds, 3),
            "first_required_actor_seconds": round(
                (min(required_actor_starts) - run_start).total_seconds(), 3
            ),
            "parent_spawn_attempts": spawn_attempts,
            "durable_actor_sessions": len(complete_actors),
            "tool_calls": row["toolCalls"],
            "changed_path_count": len(row["changedPaths"]),
            "product_done": row["productDone"],
            "automated_oracle_passed": row["automatedOraclePassed"],
            "blind_judge_status": row["blindJudgeStatus"],
        },
        "quality": {
            "missing_child_sessions": missing_sessions,
            "actors_without_completion": len(actors) - len(complete_actors),
            "child_task_turns": len(intervals),
            "multi_turn_child_sessions": multi_turn_sessions,
            "parent_row_harness_wait_available": "harnessWait" in row,
            "product_done_timestamp_available": row.get("wallTimeToProductDoneSeconds") is not None,
            "nested_actor_intervals_in_parent_timeline": False,
            "allocation_method": "Each active child task turn is measured from task_started to task_complete; wall-clock segments are split equally across concurrent turns.",
        },
        "timing": {
            "actor_union_minutes": round(actor_union_seconds / 60, 2),
            "conductor_only_minutes": round(no_actor_seconds / 60, 2),
            "concurrent_actor_minutes": round(concurrent_seconds / 60, 2),
            "max_concurrency": max_concurrency,
            "sum_unadjusted_actor_turn_minutes": round(
                sum(interval["active_seconds"] for interval in intervals) / 60, 2
            ),
            "sum_unadjusted_session_spans_minutes": round(
                session_span_seconds / 60, 2
            ),
            "explicit_retry_actor_minutes": round(explicit_retry_seconds / 60, 2),
            "superseded_first_attempt_minutes": round(
                superseded_first_attempt_seconds / 60, 2
            ),
            "retry_cycle_minutes": round(
                (explicit_retry_seconds + superseded_first_attempt_seconds) / 60, 2
            ),
        },
        "test_runtime": test_runtime,
        "stages": stage_rows,
        "categories": category_rows,
        "actors": actor_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()
    print(json.dumps(reconstruct(), indent=None if args.compact else 2, sort_keys=False))


if __name__ == "__main__":
    main()
