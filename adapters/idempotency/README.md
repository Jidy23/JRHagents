# JRHagents Idempotency Boundary

`createIdempotentHost` prevents accidental duplicate execution when a client
retries the same request. The caller supplies a stable `idempotencyKey` for a
single intended action.

- only successful results are cached;
- failed, paused, cancelled, or budget-exceeded runs can be retried;
- concurrent requests with the same key share one in-process execution;
- a key is bound to the complete plan and execution options, including
  approval, host-supplied `actorId`, execution policy and host-specific data;
  reuse with different data or execution authority fails closed;
- optional namespaces isolate keys between tenants, brands, or workspaces;
- a replay returns the cached result with `replayed: true`;
- the default store is bounded in-memory storage;
- `createFileIdempotencyStore` persists bounded keys with serialized writes and atomic rename;
- optional `ttlMs` expires keys and permits a fresh execution after the window;
- tenant scoping belongs to the host application.

The plan and execution options are copied before any asynchronous store
operation. Plans and completed results must contain acyclic plain JSON data.
Options must be plain data; `approvedSteps` also accepts a Set or another
iterable, and an AbortSignal remains live so cancellation can still work.
Signals and the idempotency key itself are not fingerprinted. Each completed
result and replay is returned as an independent copy.

If the host completes but storing the result fails, the same wrapper retains
the result in memory. A retry with the same key retries the store write without
rerunning the host. Retained writes and in-flight calls are bounded by
`maxOutstanding` (default 1,000); when the limit is reached, new calls fail
closed until pending writes are resolved. If a completed result is not JSON,
the wrapper attempts to save a blocked tombstone, so later calls do not repeat
the completed action. Recovery is limited to this wrapper instance until the
result or tombstone is persisted.

```js
const store = createIdempotencyStore({ maxKeys: 1000, ttlMs: 86_400_000 });
const safeHost = createIdempotentHost({ host, store, namespace: 'brand-a' });
await safeHost.execute(plan, { idempotencyKey: 'publish:brand-a:2026-10-27:01' });
```

For restart-safe local persistence:

```js
const store = createFileIdempotencyStore({ filePath: './data/idempotency.json' });
```

The host application owns directory creation, permissions, encryption at rest,
tenant scoping, and multi-process locking. The wrapper's concurrency lock and
pending-write guard are process-local. They do not guarantee exactly-once
effects: a crash after a side effect but before successful storage, a partial
failed run, key expiration or eviction, and multiple workers can all permit
another execution. For stronger guarantees use an atomic durable reservation
and a destination that supports its own idempotency keys; coordinate multiple
workers with a distributed lock or transactional store.

Use a key scoped to the intended operation and authorization context. Never
reuse one key for unrelated goals. The namespace should be derived from the
already-authenticated tenant/workspace context, not from untrusted request text.
Pass `actorId` from the authenticated host context for user level isolation.
Previously stored bare results and records using an earlier fingerprint format
cannot be replayed; let those keys expire or use a new key after upgrading.
