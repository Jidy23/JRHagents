"""Small, host-agnostic orchestration primitives for JRHagents.

The runtime does not call a model, network, shell, or external service. A host
adapter supplies the handlers and decides which permissions are available.
"""

from .core import (
    ApprovalRequired,
    ExecutionResult,
    Risk,
    RunEvent,
    RunManager,
    SkillRegistry,
    SkillSpec,
    StepSpec,
    WorkflowPlan,
)

__all__ = [
    "ApprovalRequired",
    "ExecutionResult",
    "RunEvent",
    "RunManager",
    "Risk",
    "SkillRegistry",
    "SkillSpec",
    "StepSpec",
    "WorkflowPlan",
]
