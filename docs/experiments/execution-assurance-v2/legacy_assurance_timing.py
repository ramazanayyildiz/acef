#!/usr/bin/env python3
"""Event-level timing reconstruction for legacy story assurance.

Top-level assurance turns are decomposed into mutually exclusive wall-clock
buckets. Nested reviewer turns are reported separately and are never added to
the parent wall total because they execute inside parent wait/coordination time.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


HERE = Path(__file__).resolve().parent
BASE_ANALYSIS_PATH = HERE / "legacy_phase_analysis.py"
SPEC = importlib.util.spec_from_file_location("legacy_phase_analysis", BASE_ANALYSIS_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load {BASE_ANALYSIS_PATH}")
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)

ASSURANCE_CATEGORIES = {
    "Code review",
    "Verify patch",
    "Story test review",
    "Process judge",
}

BUCKET_LABELS = {
    "agent_residual": "Agent reasoning/composition or uninstrumented gap",
    "workflow_loading": "Workflow/skill loading",
    "inspection": "Repository, diff, test, and evidence inspection",
    "git_inspection": "Git lineage/status inspection",
    "test_execution": "Test execution",
    "product_audit": "Product-done audit",
    "validation": "Validation, evidence, and selfcheck commands",
    "artifact_editing": "Report/evidence/artifact editing",
    "commit": "Git staging and commit",
    "subagent_dispatch": "Nested reviewer dispatch",
    "subagent_wait": "Nested reviewer wait",
    "subagent_coordination": "Nested reviewer coordination",
    "other_tool": "Other tool execution",
}

RESIDUAL_PHASE_LABELS = {
    "before_first_tool": "Before the first tool call",
    "between_tools": "Between tool calls",
    "after_last_tool": "After the last tool result",
    "no_tool_turn": "Turn with no observed tool call",
}


def story_for(task_name: str) -> str:
    match = re.search(r"acef_(s[1-4])_", task_name)
    return match.group(1).upper() if match else "EPIC"


def first_line(value: str, limit: int = 180) -> str:
    line = " ".join(value.strip().split())
    return line[:limit] + ("…" if len(line) > limit else "")


def command_bucket(commands: list[str], tool_input: str) -> str:
    combined = "\n".join(commands)
    kinds = set()
    for command in commands:
        kinds.update(BASE.command_kinds(command))
    if "test" in kinds:
        return "test_execution"
    if "product-audit" in kinds:
        return "product_audit"
    if re.search(r"\bgit\s+(?:commit|add)\b", combined):
        return "commit"
    if "tools.apply_patch" in tool_input or re.search(r"\bapply_patch\b", combined):
        return "artifact_editing"
    if re.search(
        r"(?:\.agents/skills|\.codex/skills|/SKILL\.md|/workflow\.md|"
        r"/instructions\.md|/checklist\.md|/steps[-/])",
        combined,
    ):
        return "workflow_loading"
    if re.search(
        r"(?:selfcheck|acef-process-validator|acef-state\s+(?:verify|evidence)|"
        r"git\s+diff\s+--check|php\s+-l\b|validate|validator)",
        combined,
        re.IGNORECASE,
    ):
        return "validation"
    if re.search(
        r"\bgit\s+(?:show|diff|status|log|rev-parse|merge-base|ls-tree|cat-file)\b",
        combined,
    ) and not re.search(r"\b(?:sed|rg|jq|find|cat|head|tail|wc)\b", combined):
        return "git_inspection"
    if re.search(
        r"\b(?:sed|rg|jq|find|cat|head|tail|wc|shasum|git\s+(?:show|diff|status|log|"
        r"rev-parse|merge-base|ls-tree|cat-file))\b",
        combined,
    ):
        return "inspection"
    if commands:
        return "other_tool"
    if "tools.apply_patch" in tool_input:
        return "artifact_editing"
    return "other_tool"


def tool_summary(payload: dict[str, Any], bucket: str) -> str:
    name = payload.get("name", "unknown")
    if payload.get("type") == "function_call":
        try:
            arguments = json.loads(payload.get("arguments", "{}"))
        except json.JSONDecodeError:
            arguments = {}
        if name == "spawn_agent":
            return f"spawn {arguments.get('task_name', 'nested reviewer')}"
        if name == "wait_agent":
            return "wait for nested reviewer result"
        if name == "send_message":
            return f"message {arguments.get('target', 'nested reviewer')}"
        return name
    tool_input = payload.get("input", "")
    commands = BASE.extract_exec_commands(tool_input)
    if commands:
        return first_line(commands[0])
    if bucket == "artifact_editing":
        return "apply patch to report/evidence artifact"
    return first_line(tool_input or name)


def output_index(records: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    result = {}
    for record in records:
        payload = record.get("payload", {})
        if record.get("type") != "response_item":
            continue
        payload_type = payload.get("type")
        if payload_type == "custom_tool_call_output":
            result[("custom_tool_call", payload.get("call_id"))] = record
        elif payload_type == "function_call_output":
            result[("function_call", payload.get("call_id"))] = record
    return result


def event_bucket(payload: dict[str, Any]) -> str:
    if payload.get("type") == "function_call":
        return {
            "spawn_agent": "subagent_dispatch",
            "wait_agent": "subagent_wait",
            "send_message": "subagent_coordination",
            "list_agents": "subagent_coordination",
            "interrupt_agent": "subagent_coordination",
        }.get(payload.get("name"), "other_tool")
    tool_input = payload.get("input", "")
    return command_bucket(BASE.extract_exec_commands(tool_input), tool_input)


def turn_tool_events(
    records: list[dict[str, Any]], start: datetime, end: datetime
) -> tuple[list[dict[str, Any]], int]:
    outputs = output_index(records)
    events = []
    missing_outputs = 0
    for record in records:
        payload = record.get("payload", {})
        if record.get("type") != "response_item" or payload.get("type") not in {
            "custom_tool_call",
            "function_call",
        }:
            continue
        event_start = BASE.parse_timestamp(record["timestamp"])
        if event_start < start or event_start > end:
            continue
        output = outputs.get((payload["type"], payload.get("call_id")))
        if output is None:
            event_end = event_start
            missing_outputs += 1
        else:
            event_end = min(BASE.parse_timestamp(output["timestamp"]), end)
        bucket = event_bucket(payload)
        events.append(
            {
                "call_id": payload.get("call_id"),
                "tool": payload.get("name", "unknown"),
                "bucket": bucket,
                "start": event_start,
                "end": max(event_start, event_end),
                "duration_seconds": max(0.0, (event_end - event_start).total_seconds()),
                "summary": tool_summary(payload, bucket),
            }
        )
    return events, missing_outputs


def allocate_turn(
    start: datetime, end: datetime, events: list[dict[str, Any]]
) -> tuple[
    dict[str, float],
    dict[str, float],
    dict[str, float],
    list[dict[str, Any]],
]:
    points = sorted(
        {start, end}
        | {
            boundary
            for event in events
            for boundary in (max(start, event["start"]), min(end, event["end"]))
            if start <= boundary <= end
        }
    )
    buckets: defaultdict[str, float] = defaultdict(float)
    event_seconds: defaultdict[str, float] = defaultdict(float)
    residual_phases: defaultdict[str, float] = defaultdict(float)
    residual_gaps = []
    first_event_start = min((event["start"] for event in events), default=None)
    last_event_end = max((event["end"] for event in events), default=None)
    for left, right in zip(points, points[1:]):
        seconds = (right - left).total_seconds()
        live = [
            event
            for event in events
            if event["start"] <= left and event["end"] >= right
        ]
        if not live:
            buckets["agent_residual"] += seconds
            if first_event_start is None or last_event_end is None:
                phase = "no_tool_turn"
            elif right <= first_event_start:
                phase = "before_first_tool"
            elif left >= last_event_end:
                phase = "after_last_tool"
            else:
                phase = "between_tools"
            residual_phases[phase] += seconds
            residual_gaps.append(
                {
                    "phase": phase,
                    "start": left,
                    "end": right,
                    "duration_seconds": seconds,
                }
            )
            continue
        share = seconds / len(live)
        for event in live:
            buckets[event["bucket"]] += share
            event_seconds[event["call_id"]] += share
    return (
        dict(buckets),
        dict(event_seconds),
        dict(residual_phases),
        residual_gaps,
    )


def nested_reviewers(
    records: list[dict[str, Any]], session_dir: Path, start: datetime, end: datetime
) -> list[dict[str, Any]]:
    reviewers = []
    for record in records:
        payload = record.get("payload", {})
        if not (
            record.get("type") == "event_msg"
            and payload.get("type") == "sub_agent_activity"
            and payload.get("kind") == "started"
        ):
            continue
        event_time = BASE.parse_timestamp(record["timestamp"])
        if not start <= event_time <= end:
            continue
        candidates = list(session_dir.glob(f"*{payload['agent_thread_id']}.jsonl"))
        if len(candidates) != 1:
            reviewers.append(
                {
                    "task": payload["agent_path"].split("/")[-1],
                    "thread_id": payload["agent_thread_id"],
                    "active_seconds": None,
                    "session_found": False,
                }
            )
            continue
        turns = BASE.child_turns(candidates[0])
        active_seconds = (
            sum((turn["end"] - turn["start"]).total_seconds() for turn in turns)
            if turns
            else None
        )
        reviewers.append(
            {
                "task": payload["agent_path"].split("/")[-1],
                "thread_id": payload["agent_thread_id"],
                "active_seconds": active_seconds,
                "active_minutes": round(active_seconds / 60, 2)
                if active_seconds is not None
                else None,
                "turn_count": len(turns),
                "session_found": True,
            }
        )
    return reviewers


def turn_model_telemetry(
    records: list[dict[str, Any]], start: datetime, end: datetime
) -> dict[str, Any]:
    """Return first-turn model configuration and cumulative token telemetry."""
    model = None
    effort = None
    model_cycles = 0
    token_usage = None
    for record in records:
        timestamp = BASE.parse_timestamp(record["timestamp"])
        if not start <= timestamp <= end:
            continue
        payload = record.get("payload", {})
        if record.get("type") == "turn_context":
            model = payload.get("model", model)
            effort = payload.get("effort", effort)
        elif (
            record.get("type") == "event_msg"
            and payload.get("type") == "token_count"
            and payload.get("info", {}).get("total_token_usage")
        ):
            model_cycles += 1
            token_usage = payload["info"]["total_token_usage"]
    return {
        "model": model,
        "effort": effort,
        "model_cycles": model_cycles,
        "token_usage": token_usage or {},
    }


def reconstruct(include_events: bool = False) -> dict[str, Any]:
    row = BASE.legacy_row()
    parent_path = Path(row["collaborationEvidence"]["sessionPath"])
    session_dir = parent_path.parent
    top_level_sessions = {}
    for record in BASE.read_jsonl(parent_path):
        payload = record.get("payload", {})
        if (
            record.get("type") == "event_msg"
            and payload.get("type") == "sub_agent_activity"
            and payload.get("kind") == "started"
        ):
            top_level_sessions[payload["agent_path"].split("/")[-1]] = payload[
                "agent_thread_id"
            ]

    base_result = BASE.reconstruct()
    assurance_turns = [
        actor
        for actor in base_result["actors"]
        if actor["category"] in ASSURANCE_CATEGORIES and actor["turn_index"] == 1
    ]
    actor_rows = []
    event_rows = []
    nested_rows = []
    residual_gap_rows = []
    missing_outputs = 0

    for actor in assurance_turns:
        task = actor["task"]
        thread_id = top_level_sessions[task]
        session_candidates = list(session_dir.glob(f"*{thread_id}.jsonl"))
        if len(session_candidates) != 1:
            raise RuntimeError(f"Missing assurance session for {task}")
        records = list(BASE.read_jsonl(session_candidates[0]))
        turns = BASE.child_turns(session_candidates[0])
        if not turns:
            raise RuntimeError(f"Missing assurance turn for {task}")
        turn = turns[0]
        model_telemetry = turn_model_telemetry(records, turn["start"], turn["end"])
        events, missing = turn_tool_events(records, turn["start"], turn["end"])
        missing_outputs += missing
        (
            bucket_seconds,
            allocated_event_seconds,
            residual_phase_seconds,
            residual_gaps,
        ) = allocate_turn(turn["start"], turn["end"], events)
        reviewers = nested_reviewers(
            records, session_dir, turn["start"], turn["end"]
        )
        nested_rows.extend(
            {"parent_task": task, "control": actor["category"], **reviewer}
            for reviewer in reviewers
        )
        elapsed_seconds = (turn["end"] - turn["start"]).total_seconds()
        actor_rows.append(
            {
                "story": story_for(task),
                "control": actor["category"],
                "task": task,
                "started_at": turn["start"].isoformat(),
                "finished_at": turn["end"].isoformat(),
                "elapsed_seconds": round(elapsed_seconds, 3),
                "elapsed_minutes": round(elapsed_seconds / 60, 2),
                "tool_event_count": len(events),
                "model": model_telemetry["model"],
                "effort": model_telemetry["effort"],
                "model_cycle_count": model_telemetry["model_cycles"],
                "token_usage": model_telemetry["token_usage"],
                "nested_reviewer_count": len(reviewers),
                "nested_active_minutes_non_additive": round(
                    sum(
                        reviewer["active_seconds"] or 0.0 for reviewer in reviewers
                    )
                    / 60,
                    2,
                ),
                "bucket_seconds": {
                    bucket: round(seconds, 3)
                    for bucket, seconds in sorted(bucket_seconds.items())
                },
                "bucket_minutes": {
                    bucket: round(seconds / 60, 2)
                    for bucket, seconds in sorted(bucket_seconds.items())
                },
                "residual_phase_seconds": {
                    phase: round(seconds, 3)
                    for phase, seconds in sorted(residual_phase_seconds.items())
                },
                "residual_phase_minutes": {
                    phase: round(seconds / 60, 2)
                    for phase, seconds in sorted(residual_phase_seconds.items())
                },
            }
        )
        if include_events:
            for event in events:
                event_rows.append(
                    {
                        "story": story_for(task),
                        "control": actor["category"],
                        "task": task,
                        "call_id": event["call_id"],
                        "tool": event["tool"],
                        "bucket": event["bucket"],
                        "bucket_label": BUCKET_LABELS[event["bucket"]],
                        "started_at": event["start"].isoformat(),
                        "finished_at": event["end"].isoformat(),
                        "observed_duration_seconds": round(
                            event["duration_seconds"], 3
                        ),
                        "allocated_duration_seconds": round(
                            allocated_event_seconds[event["call_id"]], 3
                        ),
                        "summary": event["summary"],
                    }
                )
            for gap in residual_gaps:
                residual_gap_rows.append(
                    {
                        "story": story_for(task),
                        "control": actor["category"],
                        "task": task,
                        "phase": gap["phase"],
                        "phase_label": RESIDUAL_PHASE_LABELS[gap["phase"]],
                        "started_at": gap["start"].isoformat(),
                        "finished_at": gap["end"].isoformat(),
                        "duration_seconds": round(gap["duration_seconds"], 3),
                    }
                )

    bucket_totals: defaultdict[str, float] = defaultdict(float)
    control_totals: defaultdict[str, float] = defaultdict(float)
    story_totals: defaultdict[str, float] = defaultdict(float)
    residual_phase_totals: defaultdict[str, float] = defaultdict(float)
    control_model_usage: defaultdict[str, defaultdict[str, int]] = defaultdict(
        lambda: defaultdict(int)
    )
    overall_model_usage: defaultdict[str, int] = defaultdict(int)
    for actor in actor_rows:
        control_totals[actor["control"]] += actor["elapsed_seconds"]
        story_totals[actor["story"]] += actor["elapsed_seconds"]
        for bucket, seconds in actor["bucket_seconds"].items():
            bucket_totals[bucket] += seconds
        for phase, seconds in actor["residual_phase_seconds"].items():
            residual_phase_totals[phase] += seconds
        control_model_usage[actor["control"]]["actor_count"] += 1
        control_model_usage[actor["control"]]["model_cycles"] += actor[
            "model_cycle_count"
        ]
        overall_model_usage["actor_count"] += 1
        overall_model_usage["model_cycles"] += actor["model_cycle_count"]
        for field, value in actor["token_usage"].items():
            control_model_usage[actor["control"]][field] += value
            overall_model_usage[field] += value
    assurance_seconds = sum(actor["elapsed_seconds"] for actor in actor_rows)

    def rows_from_totals(values: dict[str, float], field: str):
        return [
            {
                field: key,
                "seconds": round(seconds, 3),
                "minutes": round(seconds / 60, 2),
                "share_of_assurance": round(seconds / assurance_seconds, 4),
            }
            for key, seconds in sorted(values.items(), key=lambda item: item[1], reverse=True)
        ]

    result = {
        "summary": {
            "attempt_run_id": row["attemptRunId"],
            "assurance_seconds": round(assurance_seconds, 3),
            "assurance_minutes": round(assurance_seconds / 60, 2),
            "top_level_turn_count": len(actor_rows),
            "top_level_tool_event_count": sum(
                actor["tool_event_count"] for actor in actor_rows
            ),
            "nested_reviewer_count": len(nested_rows),
            "nested_active_minutes_non_additive": round(
                sum(row["active_seconds"] or 0.0 for row in nested_rows) / 60, 2
            ),
            "missing_tool_outputs": missing_outputs,
            "model_usage": dict(overall_model_usage),
            "allocation_note": "Top-level buckets are mutually exclusive and sum to assurance wall time. Nested reviewer minutes are non-additive context inside parent coordination/wait time.",
        },
        "controls": rows_from_totals(control_totals, "control"),
        "stories": rows_from_totals(story_totals, "story"),
        "buckets": [
            {"bucket": row["bucket"], "label": BUCKET_LABELS[row["bucket"]], **{k: v for k, v in row.items() if k != "bucket"}}
            for row in rows_from_totals(bucket_totals, "bucket")
        ],
        "residual_phases": [
            {
                "phase": row["phase"],
                "label": RESIDUAL_PHASE_LABELS[row["phase"]],
                **{k: v for k, v in row.items() if k != "phase"},
            }
            for row in rows_from_totals(residual_phase_totals, "phase")
        ],
        "control_model_usage": [
            {"control": control, **dict(values)}
            for control, values in sorted(
                control_model_usage.items(),
                key=lambda item: item[1]["total_tokens"],
                reverse=True,
            )
        ],
        "actors": sorted(actor_rows, key=lambda row: row["elapsed_seconds"], reverse=True),
        "nested_reviewers": sorted(
            nested_rows,
            key=lambda row: row["active_seconds"] or 0.0,
            reverse=True,
        ),
    }
    if include_events:
        result["events"] = sorted(event_rows, key=lambda row: row["started_at"])
        result["residual_gaps"] = sorted(
            residual_gap_rows,
            key=lambda row: row["duration_seconds"],
            reverse=True,
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--events", action="store_true", help="Include every tool event")
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()
    print(
        json.dumps(
            reconstruct(include_events=args.events),
            indent=None if args.compact else 2,
            sort_keys=False,
        )
    )


if __name__ == "__main__":
    main()
