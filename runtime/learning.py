"""Turn explicitly supplied observations into reviewable suggestions.

This module is deliberately deterministic. It does not observe sessions, read
files, call a model, persist data, change workflows, or execute suggestions.
All supplied text is untrusted data. A host owns any UI, user identity,
authorization, data retention, and application of an accepted suggestion.
"""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import json
import re
from typing import Any, Sequence


_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$")
_MAX_OBSERVATIONS = 1000
_RECOMMENDATIONS = {
    "missing_verification": (
        "Add a verification step that reports what was checked and what could not be checked."
    ),
    "failed_verification": (
        "Investigate failed checks, fix the underlying cause, and rerun the affected checks."
    ),
    "missing_evidence": (
        "Attach available evidence to completion claims and mark unavailable checks as not run."
    ),
    "missing_source": (
        "Record reliable sources for factual claims and flag claims that cannot be verified."
    ),
    "repeated_revision": (
        "Review the repeated revision pattern and add a relevant check before delivery."
    ),
    "unavailable_capability": (
        "Check host capabilities before planning the step and provide an honest fallback."
    ),
}


def _text(value: str, name: str, limit: int, *, required: bool = True) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{name} must be a string")
    value = value.strip()
    if required and not value:
        raise ValueError(f"{name} must not be empty")
    if len(value) > limit:
        raise ValueError(f"{name} is too long")
    if any(
        (ord(char) < 32 and char not in "\n\t\r") or 0xD800 <= ord(char) <= 0xDFFF
        for char in value
    ):
        raise ValueError(f"{name} contains invalid characters")
    return value


def _identifier(value: str, name: str) -> str:
    value = _text(value, name, 80)
    if not _ID_PATTERN.fullmatch(value):
        raise ValueError(f"{name} must be a simple identifier")
    return value


@dataclass(frozen=True)
class Observation:
    """One host-supplied observation; an evidence reference is not verified."""

    observation_id: str
    workflow_id: str
    kind: str
    detail: str
    evidence: str = ""
    recommendation: str = ""

    def __post_init__(self) -> None:
        object.__setattr__(self, "observation_id", _identifier(self.observation_id, "observation_id"))
        object.__setattr__(self, "workflow_id", _identifier(self.workflow_id, "workflow_id"))
        kind = _text(self.kind, "kind", 64)
        if kind not in _RECOMMENDATIONS and kind != "custom":
            raise ValueError("kind is not supported")
        object.__setattr__(self, "kind", kind)
        object.__setattr__(self, "detail", _text(self.detail, "detail", 1000))
        object.__setattr__(self, "evidence", _text(self.evidence, "evidence", 1000, required=False))
        recommendation = _text(self.recommendation, "recommendation", 1000, required=False)
        if kind == "custom" and not recommendation:
            raise ValueError("custom observations require a recommendation")
        object.__setattr__(self, "recommendation", recommendation)

    def to_dict(self) -> dict[str, str]:
        return {
            "observation_id": self.observation_id,
            "workflow_id": self.workflow_id,
            "kind": self.kind,
            "detail": self.detail,
            "evidence": self.evidence,
            "recommendation": self.recommendation,
        }


@dataclass(frozen=True)
class Proposal:
    """A suggestion whose identity binds it to every included observation."""

    proposal_id: str
    workflow_id: str
    kind: str
    recommendation: str
    observations: tuple[Observation, ...]

    @property
    def observation_count(self) -> int:
        return len(self.observations)

    def to_dict(self) -> dict[str, Any]:
        return {
            "proposal_id": self.proposal_id,
            "workflow_id": self.workflow_id,
            "kind": self.kind,
            "recommendation": self.recommendation,
            "observation_count": self.observation_count,
            "observations": [item.to_dict() for item in self.observations],
        }


@dataclass(frozen=True)
class Review:
    """An explicit decision record; it never applies or executes a proposal."""

    proposal_id: str
    decision: str
    reviewer: str
    reason: str

    def to_dict(self) -> dict[str, str]:
        return {
            "proposal_id": self.proposal_id,
            "decision": self.decision,
            "reviewer": self.reviewer,
            "reason": self.reason,
        }


def _proposal_id(
    workflow_id: str, kind: str, recommendation: str, observations: tuple[Observation, ...]
) -> str:
    payload = {
        "schema_version": 1,
        "workflow_id": workflow_id,
        "kind": kind,
        "recommendation": recommendation,
        "observations": [item.to_dict() for item in observations],
    }
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return "proposal_" + sha256(encoded.encode("utf-8")).hexdigest()


def propose_improvements(
    observations: Sequence[Observation], *, minimum_observations: int = 2
) -> tuple[Proposal, ...]:
    """Group supplied observations into suggestions, without changing anything.

    Counts represent unique supplied observation IDs, not independent proof or
    statistical confidence. A lower threshold of one must be explicitly chosen.
    """

    if isinstance(observations, (str, bytes)) or not isinstance(observations, Sequence):
        raise ValueError("observations must be a sequence")
    if len(observations) > _MAX_OBSERVATIONS:
        raise ValueError("too many observations")
    if isinstance(minimum_observations, bool) or not isinstance(minimum_observations, int):
        raise ValueError("minimum_observations must be an integer")
    if not 1 <= minimum_observations <= _MAX_OBSERVATIONS:
        raise ValueError("minimum_observations is out of range")

    groups: dict[tuple[str, str, str], list[Observation]] = {}
    seen_ids: set[str] = set()
    for observation in observations:
        if not isinstance(observation, Observation):
            raise ValueError("every observation must be an Observation")
        if observation.observation_id in seen_ids:
            raise ValueError("duplicate observation_id")
        seen_ids.add(observation.observation_id)
        recommendation = observation.recommendation or _RECOMMENDATIONS[observation.kind]
        key = (observation.workflow_id, observation.kind, recommendation)
        groups.setdefault(key, []).append(observation)

    proposals: list[Proposal] = []
    for (workflow_id, kind, recommendation), items in sorted(groups.items()):
        if len(items) < minimum_observations:
            continue
        selected = tuple(sorted(items, key=lambda item: item.observation_id))
        proposals.append(Proposal(
            _proposal_id(workflow_id, kind, recommendation, selected),
            workflow_id, kind, recommendation, selected,
        ))
    return tuple(proposals)


def review_proposal(
    proposal: Proposal,
    *,
    expected_proposal_id: str,
    decision: str,
    reviewer: str,
    reason: str = "",
) -> Review:
    """Record an explicit review of precisely the presented suggestion.

    The fingerprint detects stale or altered proposal content. It is not an
    authentication mechanism: the host must authenticate and authorize review.
    """

    if not isinstance(proposal, Proposal):
        raise ValueError("proposal must be a Proposal")
    if (
        not isinstance(proposal.observations, tuple)
        or not proposal.observations
        or len(proposal.observations) > _MAX_OBSERVATIONS
    ):
        raise ValueError("proposal must contain observations")
    if not all(isinstance(item, Observation) for item in proposal.observations):
        raise ValueError("proposal observations are invalid")
    if (
        len({item.observation_id for item in proposal.observations}) != len(proposal.observations)
        or tuple(sorted(proposal.observations, key=lambda item: item.observation_id)) != proposal.observations
        or any(item.workflow_id != proposal.workflow_id or item.kind != proposal.kind for item in proposal.observations)
    ):
        raise ValueError("proposal observations do not match the proposal")
    if any(
        (item.recommendation or _RECOMMENDATIONS.get(item.kind)) != proposal.recommendation
        for item in proposal.observations
    ):
        raise ValueError("proposal recommendation does not match the observations")
    actual = _proposal_id(proposal.workflow_id, proposal.kind, proposal.recommendation, proposal.observations)
    if expected_proposal_id != proposal.proposal_id or proposal.proposal_id != actual:
        raise ValueError("proposal ID does not match reviewed content")
    if decision not in ("accept", "reject"):
        raise ValueError("decision must be accept or reject")
    reviewer = _text(reviewer, "reviewer", 120)
    reason = _text(reason, "reason", 1000, required=False)
    return Review(proposal.proposal_id, decision, reviewer, reason)
