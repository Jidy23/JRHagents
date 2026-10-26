"""Deterministic workflow execution primitives.

This module intentionally has no model, API, filesystem, browser, or shell
integration. Those are host capabilities and must be injected as handlers.
The design keeps planning, permission checks, execution, and audit events
separate so an adapter can be tested without giving an agent broad access.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Mapping, Sequence
from uuid import uuid4


class Risk(str, Enum):
    LOW = "low"
    HIGH = "high"


class ApprovalRequired(RuntimeError):
    """Raised when a step needs explicit approval before execution."""


@dataclass(frozen=True)
class SkillSpec:
    """Describes a capability without granting the capability itself."""

    id: str
    description: str
    capabilities: tuple[str, ...] = ()
    risk: Risk = Risk.LOW
    requires_approval: bool = False

    def __post_init__(self) -> None:
        if not self.id.strip():
            raise ValueError("skill id must not be empty")
        if self.risk is Risk.HIGH and not self.requires_approval:
            raise ValueError("high-risk skills must require approval")


class SkillRegistry:
    """Explicit registry; duplicate IDs are rejected to prevent shadowing."""

    def __init__(self, skills: Sequence[SkillSpec] = ()) -> None:
        self._skills: dict[str, SkillSpec] = {}
        for skill in skills:
            self.register(skill)

    def register(self, skill: SkillSpec) -> None:
        if skill.id in self._skills:
            raise ValueError(f"skill already registered: {skill.id}")
        self._skills[skill.id] = skill

    def get(self, skill_id: str) -> SkillSpec:
        try:
            return self._skills[skill_id]
        except KeyError as exc:
            raise KeyError(f"unknown skill: {skill_id}") from exc

    def list(self) -> tuple[SkillSpec, ...]:
        return tuple(self._skills.values())


@dataclass(frozen=True)
class StepSpec:
    id: str
    skill_id: str
    input: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.id.strip() or not self.skill_id.strip():
            raise ValueError("step id and skill id must not be empty")


@dataclass(frozen=True)
class WorkflowPlan:
    goal: str
    steps: tuple[StepSpec, ...]
    plan_id: str = field(default_factory=lambda: f"plan_{uuid4().hex[:12]}")

    def __post_init__(self) -> None:
        if not self.goal.strip():
            raise ValueError("workflow goal must not be empty")
        ids = [step.id for step in self.steps]
        if len(ids) != len(set(ids)):
            raise ValueError("step IDs must be unique")


@dataclass(frozen=True)
class RunEvent:
    run_id: str
    type: str
    at: str
    step_id: str | None = None
    detail: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ExecutionResult:
    run_id: str
    status: str
    outputs: Mapping[str, Any]
    events: tuple[RunEvent, ...]


Handler = Callable[[Mapping[str, Any]], Any]


class RunManager:
    """Execute an already-reviewed plan using explicitly injected handlers."""

    def __init__(self, registry: SkillRegistry) -> None:
        self.registry = registry

    @staticmethod
    def _event(run_id: str, event_type: str, step_id: str | None = None, **detail: Any) -> RunEvent:
        return RunEvent(
            run_id=run_id,
            type=event_type,
            at=datetime.now(timezone.utc).isoformat(),
            step_id=step_id,
            detail=detail,
        )

    def execute(
        self,
        plan: WorkflowPlan,
        handlers: Mapping[str, Handler],
        *,
        approved_steps: set[str] | frozenset[str] = frozenset(),
    ) -> ExecutionResult:
        """Run steps in order; fail closed on missing handlers or approvals."""

        run_id = f"run_{uuid4().hex[:12]}"
        events: list[RunEvent] = [self._event(run_id, "run.started", detail=plan.goal)]
        outputs: dict[str, Any] = {}

        for step in plan.steps:
            skill = self.registry.get(step.skill_id)
            events.append(self._event(run_id, "step.ready", step.id, skill_id=skill.id))

            if skill.requires_approval and step.id not in approved_steps:
                events.append(self._event(run_id, "step.blocked", step.id, reason="approval_required"))
                events.append(self._event(run_id, "run.paused", detail="approval_required"))
                raise ApprovalRequired(f"approval required for step: {step.id}")

            handler = handlers.get(skill.id)
            if handler is None:
                events.append(self._event(run_id, "step.failed", step.id, reason="handler_missing"))
                raise KeyError(f"no handler supplied for skill: {skill.id}")

            events.append(self._event(run_id, "step.started", step.id))
            try:
                outputs[step.id] = handler(step.input)
            except Exception as exc:
                events.append(self._event(run_id, "step.failed", step.id, error=type(exc).__name__))
                raise
            events.append(self._event(run_id, "step.completed", step.id))

        events.append(self._event(run_id, "run.completed"))
        return ExecutionResult(run_id, "completed", outputs, tuple(events))
