# JRHagents Goal Planner Boundary

The planner turns a natural-language goal into a proposed `WorkflowPlan`, but
never executes tools. The host injects `propose`, which may call an LLM or a
deterministic template engine. The planner then validates every proposed skill
against the unified host runtime and returns a review list.

Required flow:

```text
goal → injected proposal → strict validation → human review/ACC → host.execute
```

An unavailable skill, duplicate step, missing goal, or invalid proposal is
rejected before it reaches execution. Planner output is untrusted input.
