# JRHagents Audit Run Store

Dependency-free in-memory audit store for the host runtime.

- stores completed and failed runs;
- preserves outputs and ordered events;
- redacts keys containing `token`, `secret`, `password`, `authorization`,
  `api_key`, or `private_key`;
- bounds retained history with `maxRuns`;
- exports JSON for a database, file store, or dashboard adapter;
- does not claim durability until the host supplies persistent storage.

Wrap the unified host with `createAuditedHost({ host, store })` before exposing
it to the planner or web adapter.
