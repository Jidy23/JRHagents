const assert = require('node:assert/strict');
const test = require('node:test');
const { createIdempotencyStore, createIdempotentHost } = require('../adapters/idempotency');

test('idempotent host replays successful results without executing twice', async () => {
  let executions = 0;
  const host = createIdempotentHost({
    store: createIdempotencyStore(),
    host: {
      execute: async () => {
        executions += 1;
        return { run_id: 'run_1', status: 'completed', outputs: { ok: true }, events: [] };
      }
    }
  });
  const first = await host.execute({}, { idempotencyKey: 'same-action' });
  const second = await host.execute({}, { idempotencyKey: 'same-action' });
  assert.equal(executions, 1);
  assert.equal(first.replayed, undefined);
  assert.equal(second.replayed, true);
  assert.equal(second.outputs.ok, true);
});

test('idempotent host does not cache failed or paused runs', async () => {
  let executions = 0;
  const host = createIdempotentHost({
    store: createIdempotencyStore(),
    host: {
      execute: async () => {
        executions += 1;
        return { run_id: `run_${executions}`, status: executions === 1 ? 'failed' : 'completed', outputs: {}, events: [] };
      }
    }
  });
  await host.execute({}, { idempotencyKey: 'retryable' });
  await host.execute({}, { idempotencyKey: 'retryable' });
  assert.equal(executions, 2);
});

test('idempotency validates key and bounds memory', () => {
  assert.throws(() => createIdempotencyStore({ maxKeys: 0 }), /positive integer/);
  const store = createIdempotencyStore({ maxKeys: 1 });
  store.set('a', { status: 'completed' });
  store.set('b', { status: 'completed' });
  assert.equal(store.get('a'), null);
  assert.throws(() => store.set('', {}), /required/);
});

