# JRHagents Agent Runtime

JRHagents remains a portable Agent Skill. This document defines the optional
execution contract for a host application that wants to turn a user goal into
an auditable workflow. It does not grant tools, API keys, model access, or
permissions to the Skill itself.

## Product shape

```text
user goal
  -> host planner
  -> reviewed WorkflowPlan
  -> SkillRegistry lookup
  -> approval policy
  -> injected host handlers
  -> artifacts + audit events
```

The planner may use an LLM, but the runtime does not trust a model to grant
itself permissions. A host must explicitly register a `SkillSpec` and inject a
handler for every skill it allows.

## Safety contract

- A skill describes a capability; it does not provide the capability.
- Unknown skills and missing handlers fail closed.
- High-risk skills must declare `requires_approval=True`.
- Approval is tied to a specific step ID, not a vague conversation state.
- Handlers receive structured input and return a serializable result.
- Runtime events record start, pause, failure, and completion states.
- Credentials, tokens, model calls, storage, and network access belong to the
  adapter, never to the portable core.

## Minimal host integration

```python
from runtime import Risk, RunManager, SkillRegistry, SkillSpec
from runtime import StepSpec, WorkflowPlan

registry = SkillRegistry([
    SkillSpec("research.web", "Research approved sources", ("web",)),
    SkillSpec(
        "github.merge", "Merge a reviewed pull request", ("github",),
        risk=Risk.HIGH, requires_approval=True,
    ),
])

plan = WorkflowPlan("Review and merge the release", (
    StepSpec("research", "research.web", {"query": "release checks"}),
    StepSpec("merge", "github.merge", {"pull_request": 14}),
))

result = RunManager(registry).execute(
    plan,
    handlers={"research.web": research_handler, "github.merge": merge_handler},
    approved_steps={"merge"},
)
```

The example is an interface contract, not a claim that JRHagents supplies
`research_handler` or `merge_handler`.

## JSON adapter boundary

Hosts can exchange a reviewed plan without importing the Python classes:

```json
{
  "schema_version": 1,
  "plan_id": "plan_demo",
  "goal": "Echo a value",
  "steps": [
    {"id": "one", "skill_id": "echo", "input": {"value": 7}}
  ]
}
```

Validate it before execution with:

```bash
python tools/validate_workflow.py workflow.json
```

The validator only checks and normalizes the plan. It never calls a model,
browser, shell, network, or registered handler.

## Roadmap

1. **Core (implemented here):** registry, reviewed plans, fail-closed runner,
   approval boundary, and audit events.
2. **Adapters:** CLI, web app, MCP host, and AI-client-specific skill loader.
3. **Product layer:** run timeline, artifact viewer, retry policy, cost view,
   scheduled workflows, and team/shared workspaces.
4. **Quality layer:** replayable runs, policy tests, capability health checks,
   and benchmark fixtures.

The portable repository should ship the contract and reference implementation;
deployment-specific adapters should live in their own applications.
