# JRHagents Unified Host Runtime

`createJRHHost` composes explicit adapters into one execution surface. A host
can combine GitHub, Cloudflare, Supabase, and MCP adapters in one workflow.

Security properties:

- only adapters passed by the host are available;
- optional `allowedSkills` narrows the surface further;
- duplicate skill IDs are rejected;
- high-risk skills must declare approval;
- missing handlers fail closed;
- structured approvals require a matching plan ID, content fingerprint, and step IDs;
- the validated JSON plan is copied before execution so caller mutations cannot
  alter a later approved step while an earlier step is running;
- an optional `AbortSignal` cancels between handler boundaries;
- retries are opt-in, bounded, and disabled for high-risk skills;
- completed and interrupted runs include timestamps, duration, and per-step attempt metrics;
- execution budgets can cap steps and wall-clock duration;
- credentials remain inside their adapter and never enter the plan.

The host runtime does not discover or connect services by itself. The host
application owns adapter construction, authentication, lifecycle, and audit
storage.

After the host application has authenticated the user and obtained an actual
approval, generate an execution envelope with the planner and pass it to the
host. Retry and cancellation are explicit at execution time:

```js
const prepared = planner.prepareExecution(plan, ['publish'], { ttlMs: 60_000 });
await host.execute(prepared.plan, {
  approval: prepared.execution,
  signal: controller.signal,
  retryPolicy: { maxAttempts: 2, retryableSkills: ['demo.read'] },
  executionPolicy: { maxSteps: 10, maxDurationMs: 30_000, maxOutputBytes: 100_000 }
});
```

An approval envelope must contain a non-empty `plan_id`, a matching
`plan_fingerprint`, and `approvedSteps` from that plan. A missing or mismatched
field is rejected before any handler starts. The fingerprint is a consistency
check, not a signature: the host application must authenticate the approving
user, authorize their action, and protect the approval envelope from tampering.
If `expires_at` is present, it is checked both before execution and immediately
before each approval-required step.
Accepted approvals emit `approval.accepted`; rejected approval envelopes use
`APPROVAL_REJECTED` with a reason such as `expired` or `fingerprint_mismatch`.

For existing in-process integrations, `{ approvedSteps: new Set(['publish']) }`
is still supported as a trusted host-only shortcut. It checks step IDs but is
not bound to a plan fingerprint or expiration. Do not accept it directly from
an untrusted caller. Structured approval envelopes lacking a fingerprint,
which older releases accepted, now fail closed.

Plans and step inputs must be plain, acyclic JSON data. Non-finite numbers,
functions, special objects, accessors, sparse arrays, and circular references
are rejected rather than silently converted. Plan copying does not make the
injected handlers or their downstream services safe; these remain host-owned.

`maxAttempts` means additional attempts after the first attempt. A cancelled
run reports `status: 'cancelled'` on the thrown error and preserves its events;
the handler itself must honor cancellation if it performs long external work.
Successful results expose `metrics.started_at`, `metrics.ended_at`,
`metrics.duration_ms`, and a `metrics.steps` map for timeline dashboards.
When a budget is exceeded, the host throws `RUN_BUDGET_EXCEEDED`, emits
`run.budget_exceeded`, and preserves the partial metrics for audit.
`maxOutputBytes` applies per step and emits `step.output_rejected` when a
handler returns a payload above the configured limit.

Handler failures emit only a fixed `handler_error` reason and a bounded error
category; raw handler messages and handler-controlled error names or codes are
not copied into the failure or retry events. The original exception is still
thrown to the calling host, so its message must be handled as potentially
sensitive. The event rule does not sanitize plan fields, handler output, or
arbitrary audit records: the host must prevent secrets from entering those
values and must protect access to its logs and audit store.

The audit wrapper receives failure events directly from a unified host, even
when a handler throws `null` or an immutable error. For other host wrappers it
records a conservative generic failure instead of trusting exception fields.
If recording a failed run also fails, the original exception is preserved and
gets `audit_record_failed: true` when it can accept a property. For immutable
or primitive thrown values that flag cannot be attached. If a successful action
is followed by an audit-store failure, the action may already have happened;
check its outcome before retrying.
