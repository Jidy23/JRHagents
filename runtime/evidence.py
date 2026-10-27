"""Summarize host-supplied verification results without executing checks.

The host is responsible for running checks and for the truth and safety of
their evidence. This module never calls a shell, opens a URL, reads files, or
turns successful workflow execution into a claim that checks passed.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Sequence


class CheckStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    NOT_RUN = "NOT RUN"


MAX_CHECKS = 128


def _text(value: object, field: str, *, max_length: int, required: bool = True) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    value = value.strip()
    if required and not value:
        raise ValueError(f"{field} must not be empty")
    if len(value) > max_length:
        raise ValueError(f"{field} must be at most {max_length} characters")
    return value


@dataclass(frozen=True)
class CheckResult:
    """An explicitly supplied result, with an evidence source when run.

    A source identifies where the host obtained the result; it is not itself a
    guarantee the evidence is authentic. Callers must avoid recording secrets.
    """

    name: str
    status: CheckStatus
    source: str = ""
    detail: str = ""
    exit_code: int | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "name", _text(self.name, "name", max_length=120))
        try:
            status = CheckStatus(self.status)
        except (ValueError, TypeError) as exc:
            raise ValueError("status must be PASSED, FAILED, or NOT RUN") from exc
        object.__setattr__(self, "status", status)
        object.__setattr__(
            self, "source", _text(self.source, "source", max_length=256, required=False)
        )
        object.__setattr__(
            self, "detail", _text(self.detail, "detail", max_length=500, required=False)
        )

        if status is CheckStatus.NOT_RUN:
            if not self.detail:
                raise ValueError("a NOT RUN result requires a reason in detail")
            if self.exit_code is not None:
                raise ValueError("a NOT RUN result cannot have an exit code")
        elif not self.source:
            raise ValueError("a completed check requires an evidence source")
        elif self.exit_code is None and not self.detail:
            raise ValueError("a completed check needs an exit code or observation detail")

        if self.exit_code is not None:
            if type(self.exit_code) is not int:
                raise ValueError("exit_code must be an integer, not a boolean")
            if (self.exit_code == 0) != (status is CheckStatus.PASSED):
                raise ValueError("status does not match exit_code")

    @classmethod
    def from_exit_code(
        cls, name: str, exit_code: int, *, source: str, detail: str = ""
    ) -> "CheckResult":
        """Record an exit code observed by the caller; do not run a command."""
        if type(exit_code) is not int:
            raise ValueError("exit_code must be an integer, not a boolean")
        status = CheckStatus.PASSED if exit_code == 0 else CheckStatus.FAILED
        return cls(name, status, source, detail, exit_code)

    @classmethod
    def from_observation(
        cls, name: str, passed: bool, *, source: str, detail: str
    ) -> "CheckResult":
        """Record a host-observed check, such as an inspected browser state."""
        if type(passed) is not bool:
            raise ValueError("passed must be a boolean")
        _text(detail, "detail", max_length=500)
        status = CheckStatus.PASSED if passed else CheckStatus.FAILED
        return cls(name, status, source, detail)

    @classmethod
    def not_run(cls, name: str, *, reason: str) -> "CheckResult":
        """Record a check that did not run, including why it was omitted."""
        return cls(name, CheckStatus.NOT_RUN, detail=reason)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "source": self.source or None,
            "detail": self.detail or None,
            "exit_code": self.exit_code,
        }


@dataclass(frozen=True)
class VerificationSummary:
    """Ordered check results and an aggregate that never treats missing as pass."""

    status: CheckStatus
    checks: tuple[CheckResult, ...]

    def to_dict(self) -> dict[str, Any]:
        counts = {status.value: 0 for status in CheckStatus}
        for check in self.checks:
            counts[check.status.value] += 1
        return {
            "status": self.status.value,
            "counts": counts,
            "checks": [check.to_dict() for check in self.checks],
        }


def summarize_checks(
    required_checks: Sequence[str], results: Sequence[CheckResult]
) -> VerificationSummary:
    """Summarize required checks, marking every absent result NOT RUN.

    Unknown and duplicate results are rejected. A failure takes precedence
    over missing checks; a fully empty checklist is NOT RUN, not PASSED.
    """
    if isinstance(required_checks, (str, bytes)) or not isinstance(required_checks, Sequence):
        raise ValueError("required_checks must be a sequence of check names")
    if isinstance(results, (str, bytes)) or not isinstance(results, Sequence):
        raise ValueError("results must be a sequence of CheckResult objects")
    if len(required_checks) > MAX_CHECKS or len(results) > MAX_CHECKS:
        raise ValueError(f"at most {MAX_CHECKS} checks are supported")

    required = tuple(_text(name, "check name", max_length=120) for name in required_checks)
    if len(required) != len(set(required)):
        raise ValueError("required check names must be unique")
    indexed: dict[str, CheckResult] = {}
    required_set = set(required)
    for result in results:
        if not isinstance(result, CheckResult):
            raise ValueError("each result must be a CheckResult")
        if result.name not in required_set:
            raise ValueError(f"result is not a required check: {result.name}")
        if result.name in indexed:
            raise ValueError(f"duplicate check result: {result.name}")
        indexed[result.name] = result

    checks = tuple(
        indexed[name] if name in indexed else CheckResult.not_run(name, reason="No result supplied")
        for name in required
    )
    if any(check.status is CheckStatus.FAILED for check in checks):
        status = CheckStatus.FAILED
    elif not checks or any(check.status is CheckStatus.NOT_RUN for check in checks):
        status = CheckStatus.NOT_RUN
    else:
        status = CheckStatus.PASSED
    return VerificationSummary(status, checks)
