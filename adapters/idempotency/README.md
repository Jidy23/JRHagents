# JRHagents Idempotency Boundary

`createIdempotentHost` prevents accidental duplicate execution when a client
retries the same request. The caller supplies a stable `idempotencyKey` for a
single intended action.

- only successful results are cached;
- failed, paused, cancelled, or budget-exceeded runs can be retried;
- concurrent requests with the same key share one in-process execution;
- a key is bound to the plan, approval, and host supplied `actorId`; reuse
  with different execution authority fails closed;
- optional namespaces isolate keys between tenants, brands, or workspaces;
- a replay returns the cached result with `replayed: true`;
- the default store is bounded in-memory storage;
- `createFileIdempotencyStore` persists bounded keys with serialized writes and atomic rename;
- optional `ttlMs` expires keys and permits a fresh execution after the window;
- tenant scoping belongs to the host application.

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
tenant scoping, and multi-process locking. The wrapper's concurrency lock is
process-local; use a distributed lock when multiple workers share a store.

Use a key scoped to the intended operation and authorization context. Never
reuse one key for unrelated goals. The namespace should be derived from the
already-authenticated tenant/workspace context, not from untrusted request text.
Pass `actorId` from the authenticated host context for user level isolation.
Previously stored bare results have no plan fingerprint and cannot be replayed;
let those keys expire or use a new key after upgrading.
