"""JSON boundary for passing reviewed plans and run results between hosts."""

from __future__ import annotations

import math
from typing import Any, Mapping

from .core import ExecutionResult, RunEvent, StepSpec, WorkflowPlan

SCHEMA_VERSION = 1


def _validate_json(value: Any, ancestors: set[int] | None = None, depth: int = 0) -> None:
    """Reject non-JSON values and non-finite numbers before a host sees a plan."""
    if depth > 100:
        raise ValueError("plan JSON exceeds maximum nesting depth")
    if value is None or type(value) in (bool, int):
        return
    if isinstance(value, str):
        try:
            value.encode("utf-8")
        except UnicodeEncodeError as exc:
            raise ValueError("plan strings must be valid UTF-8") from exc
        return
    if type(value) is float:
        if not math.isfinite(value):
            raise ValueError("plan numbers must be finite")
        return
    if not isinstance(value, (list, Mapping)):
        raise ValueError("plan must contain only JSON values")
    if ancestors is None:
        ancestors = set()
    if id(value) in ancestors:
        raise ValueError("plan must not contain cyclic data")
    ancestors.add(id(value))
    try:
        if isinstance(value, Mapping):
            for key, item in value.items():
                if not isinstance(key, str):
                    raise ValueError("plan object keys must be strings")
                _validate_json(key, ancestors, depth + 1)
                _validate_json(item, ancestors, depth + 1)
        else:
            for item in value:
                _validate_json(item, ancestors, depth + 1)
    finally:
        ancestors.remove(id(value))


def plan_from_dict(value: Mapping[str, Any]) -> WorkflowPlan:
    """Validate and decode a plain JSON workflow plan.

    The decoder is intentionally strict about the shape of the plan but does
    not execute anything or infer a handler from user input.
    """

    if not isinstance(value, Mapping):
        raise ValueError("plan must be an object")
    _validate_json(value)
    if type(value.get("schema_version")) is not int or value.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"unsupported schema_version: {value.get('schema_version')!r}")
    goal = value.get("goal")
    raw_steps = value.get("steps")
    if not isinstance(goal, str) or not goal.strip():
        raise ValueError("plan.goal must be a non-empty string")
    if not isinstance(raw_steps, list):
        raise ValueError("plan.steps must be a list")

    steps: list[StepSpec] = []
    for index, raw in enumerate(raw_steps):
        if not isinstance(raw, Mapping):
            raise ValueError(f"plan.steps[{index}] must be an object")
        inputs = raw.get("input", {})
        if not isinstance(inputs, Mapping):
            raise ValueError(f"plan.steps[{index}].input must be an object")
        step_id, skill_id = raw.get("id"), raw.get("skill_id")
        if not isinstance(step_id, str) or not isinstance(skill_id, str):
            raise ValueError(f"plan.steps[{index}].id and skill_id must be strings")
        steps.append(StepSpec(step_id, skill_id, dict(inputs)))

    plan_id = value.get("plan_id")
    if plan_id is not None and (not isinstance(plan_id, str) or not plan_id.strip()):
        raise ValueError("plan_id must be a non-empty string when supplied")
    return WorkflowPlan(goal, tuple(steps), plan_id=plan_id or WorkflowPlan.__dataclass_fields__["plan_id"].default_factory())


def plan_to_dict(plan: WorkflowPlan) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "plan_id": plan.plan_id,
        "goal": plan.goal,
        "steps": [
            {"id": step.id, "skill_id": step.skill_id, "input": dict(step.input)}
            for step in plan.steps
        ],
    }


def result_to_dict(result: ExecutionResult) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "run_id": result.run_id,
        "status": result.status,
        "outputs": dict(result.outputs),
        "events": [event_to_dict(event) for event in result.events],
    }


def event_to_dict(event: RunEvent) -> dict[str, Any]:
    return {
        "run_id": event.run_id,
        "type": event.type,
        "at": event.at,
        "step_id": event.step_id,
        "detail": dict(event.detail),
    }
