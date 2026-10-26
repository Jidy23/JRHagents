# JRHagents Audit Run Store

Dependency-free audit stores for the host runtime.

- stores completed and failed runs;
- preserves outputs and ordered events;
- redacts keys containing `token`, `secret`, `password`, `authorization`,
  `api_key`, or `private_key`;
- bounds retained history with `maxRuns`;
- exports JSON for a database, file store, or dashboard adapter;
- `createAuditStore` is in-memory;
- `createFileAuditStore` persists JSON with serialized writes and atomic rename.

Wrap the unified host with `createAuditedHost({ host, store })` before exposing
it to the planner or web adapter. File-store methods are asynchronous:

```js
const { createFileAuditStore } = require('./');
const store = createFileAuditStore({ filePath: './data/jrh-runs.json' });
await store.record(run);
const recent = await store.list();
```

The host application owns directory creation, access permissions, backup, and
encryption at rest. Malformed files fail closed instead of being overwritten.
