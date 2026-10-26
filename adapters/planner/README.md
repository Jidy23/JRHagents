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

After review, call `planner.prepareExecution(plan, approvedSteps)` to create a
JSON-safe execution request bound to the plan's `plan_id`. It validates exact
step IDs and requires approval for every high-risk step, but it never calls
`host.execute`; the host remains the only execution boundary.
