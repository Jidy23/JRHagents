# JRHagents Idempotency Boundary

`createIdempotentHost` prevents accidental duplicate execution when a client
retries the same request. The caller supplies a stable `idempotencyKey` for a
single intended action.

- only successful results are cached;
- failed, paused, cancelled, or budget-exceeded runs can be retried;
- concurrent requests with the same key share one in-process execution;
- a replay returns the cached result with `replayed: true`;
- the default store is bounded in-memory storage;
- `createFileIdempotencyStore` persists bounded keys with serialized writes and atomic rename;
- optional `ttlMs` expires keys and permits a fresh execution after the window;
- tenant scoping belongs to the host application.

```js
const store = createIdempotencyStore({ maxKeys: 1000, ttlMs: 86_400_000 });
const safeHost = createIdempotentHost({ host, store });
await safeHost.execute(plan, { idempotencyKey: 'publish:brand-a:2026-10-27:01' });
```

For restart-safe local persistence:

```js
const store = createFileIdempotencyStore({ filePath: './data/idempotency.json' });
```

The host application owns directory creation, permissions, encryption at rest,
tenant scoping, and multi-process locking. The wrapper's concurrency lock is
process-local; use a distributed lock when multiple workers share a store.

Use a key scoped to the intended operation and authorization context. Never
reuse one key for unrelated goals or across tenants.
