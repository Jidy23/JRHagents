# JRHagents Idempotency Boundary

`createIdempotentHost` prevents accidental duplicate execution when a client
retries the same request. The caller supplies a stable `idempotencyKey` for a
single intended action.

- only successful results are cached;
- failed, paused, cancelled, or budget-exceeded runs can be retried;
- a replay returns the cached result with `replayed: true`;
- the default store is bounded in-memory storage;
- `createFileIdempotencyStore` persists bounded keys with serialized writes and atomic rename;
- expiry and tenant scoping belong to the host application.

```js
const store = createIdempotencyStore({ maxKeys: 1000 });
const safeHost = createIdempotentHost({ host, store });
await safeHost.execute(plan, { idempotencyKey: 'publish:brand-a:2026-10-27:01' });
```

For restart-safe local persistence:

```js
const store = createFileIdempotencyStore({ filePath: './data/idempotency.json' });
```

The host application owns directory creation, permissions, encryption at rest,
expiry, and multi-process locking.

Use a key scoped to the intended operation and authorization context. Never
reuse one key for unrelated goals or across tenants.
