# JRHagents Unified Host Runtime

`createJRHHost` composes explicit adapters into one execution surface. A host
can combine GitHub, Cloudflare, Supabase, and MCP adapters in one workflow.

Security properties:

- only adapters passed by the host are available;
- optional `allowedSkills` narrows the surface further;
- duplicate skill IDs are rejected;
- high-risk skills must declare approval;
- missing handlers fail closed;
- approval is checked against the exact workflow step ID;
- an optional `AbortSignal` cancels between handler boundaries;
- retries are opt-in, bounded, and disabled for high-risk skills;
- completed and interrupted runs include timestamps, duration, and per-step attempt metrics;
- execution budgets can cap steps and wall-clock duration;
- credentials remain inside their adapter and never enter the plan.

The host runtime does not discover or connect services by itself. The host
application owns adapter construction, authentication, lifecycle, and audit
storage.

Retry and cancellation are explicit at execution time:

```js
await host.execute(plan, {
  approval: { plan_id: plan.plan_id, approvedSteps: ['publish'] },
  signal: controller.signal,
  retryPolicy: { maxAttempts: 2, retryableSkills: ['demo.read'] },
  executionPolicy: { maxSteps: 10, maxDurationMs: 30_000 }
});
```

An approval envelope is bound to the exact `plan_id`; a mismatched plan is
rejected before any handler starts. The envelope is a workflow-binding check,
not a replacement for the host's authentication or authorization system.

`maxAttempts` means additional attempts after the first attempt. A cancelled
run reports `status: 'cancelled'` on the thrown error and preserves its events;
the handler itself must honor cancellation if it performs long external work.
Successful results expose `metrics.started_at`, `metrics.ended_at`,
`metrics.duration_ms`, and a `metrics.steps` map for timeline dashboards.
When a budget is exceeded, the host throws `RUN_BUDGET_EXCEEDED`, emits
`run.budget_exceeded`, and preserves the partial metrics for audit.
