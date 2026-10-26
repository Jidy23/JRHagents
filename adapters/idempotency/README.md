# JRHagents Idempotency Boundary

`createIdempotentHost` prevents accidental duplicate execution when a client
retries the same request. The caller supplies a stable `idempotencyKey` for a
single intended action.

- only successful results are cached;
- failed, paused, cancelled, or budget-exceeded runs can be retried;
- a replay returns the cached result with `replayed: true`;
- the default store is bounded in-memory storage;
- durable storage, expiry, and tenant scoping belong to the host application.

```js
const store = createIdempotencyStore({ maxKeys: 1000 });
const safeHost = createIdempotentHost({ host, store });
await safeHost.execute(plan, { idempotencyKey: 'publish:brand-a:2026-10-27:01' });
```

Use a key scoped to the intended operation and authorization context. Never
reuse one key for unrelated goals or across tenants.
