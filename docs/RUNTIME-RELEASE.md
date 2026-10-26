# Agent Runtime release status

JRHagents remains a portable Agent Skill. The optional runtime and adapters
are reference components for applications that supply their own handlers,
credentials, storage, and deployment environment.

## Shipped on `main`

- Reviewed plans with skill registration and exact-step approval.
- Server-side GitHub, Cloudflare Pages, and Supabase adapters, plus an MCP
  client boundary. Adapters require host configuration and credentials.
- Unified host with cancellation, bounded retries, execution budgets,
  timestamped events, and per-step metrics.
- Planner approval envelopes bound to plan ID and content fingerprint,
  optional expiration, and approval decision audit events.
- Bounded audit and idempotency stores with optional local JSON persistence.
  File stores are intended for a single host process; multi-process locking,
  access control, and backups are the integrating application's responsibility.

## What the public website does

The GitHub Pages site is documentation and a local instruction-copy interface.
It does not execute workflows, connect accounts, or expose the server adapters.
Deploying `docs/` publishes documentation only. To run an agent, a host
application must explicitly integrate the runtime and configure its handlers.

## Verification

Before this documentation update: 53 Python tests and 56 Node tests passed,
the 66-workflow catalog matched generated files, and the Skill ZIP builder
completed. The GitHub Pages workflow runs on changes to `docs/**` in `main`.
