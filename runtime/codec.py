"""JSON boundary for passing reviewed plans and run results between hosts."""

from __future__ import annotations

from typing import Any, Mapping

from .core import ExecutionResult, RunEvent, StepSpec, WorkflowPlan

SCHEMA_VERSION = 1


def plan_from_dict(value: Mapping[str, Any]) -> WorkflowPlan:
    """Validate and decode a plain JSON workflow plan.

    The decoder is intentionally strict about the shape of the plan but does
    not execute anything or infer a handler from user input.
    """

    if value.get("schema_version") != SCHEMA_VERSION:
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
        steps.append(StepSpec(str(raw.get("id", "")), str(raw.get("skill_id", "")), dict(inputs)))

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
