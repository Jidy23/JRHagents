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
- credentials remain inside their adapter and never enter the plan.

The host runtime does not discover or connect services by itself. The host
application owns adapter construction, authentication, lifecycle, and audit
storage.

Retry and cancellation are explicit at execution time:

```js
await host.execute(plan, {
  signal: controller.signal,
  retryPolicy: { maxAttempts: 2, retryableSkills: ['demo.read'] }
});
```

`maxAttempts` means additional attempts after the first attempt. A cancelled
run reports `status: 'cancelled'` on the thrown error and preserves its events;
the handler itself must honor cancellation if it performs long external work.
