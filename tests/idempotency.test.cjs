const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createIdempotencyStore, createFileIdempotencyStore, createIdempotentHost } = require('../adapters/idempotency');

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

test('same key cannot replay a different plan', async () => {
  let executions = 0;
  const host = createIdempotentHost({ store: createIdempotencyStore(), host: {
    execute: async () => ({ run_id: `run_${++executions}`, status: 'completed', outputs: {}, events: [] })
  } });
  await host.execute({ goal: 'first', steps: [] }, { idempotencyKey: 'same' });
  await assert.rejects(() => host.execute({ goal: 'second', steps: [] }, { idempotencyKey: 'same' }), /different plan/);
  assert.equal(executions, 1);
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

test('concurrent identical requests execute the host once', async () => {
  let executions = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const host = createIdempotentHost({
    store: createIdempotencyStore(),
    host: {
      execute: async () => {
        executions += 1;
        await gate;
        return { run_id: 'run-concurrent', status: 'completed', outputs: {}, events: [] };
      }
    }
  });
  const first = host.execute({}, { idempotencyKey: 'concurrent' });
  const second = host.execute({}, { idempotencyKey: 'concurrent' });
  await new Promise((resolve) => setImmediate(resolve));
  release();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(executions, 1);
  assert.equal(firstResult.replayed, undefined);
  assert.equal(secondResult.replayed, true);
});

test('namespaces isolate identical keys between workspaces', async () => {
  let executions = 0;
  const store = createIdempotencyStore();
  const makeHost = (namespace) => createIdempotentHost({
    namespace,
    store,
    host: { execute: async () => ({ run_id: `run-${++executions}`, status: 'completed', outputs: {}, events: [] }) }
  });
  await makeHost('workspace-a').execute({}, { idempotencyKey: 'publish-1' });
  await makeHost('workspace-b').execute({}, { idempotencyKey: 'publish-1' });
  await makeHost('workspace-a').execute({}, { idempotencyKey: 'publish-1' });
  assert.equal(executions, 2);
});

test('idempotency validates key and bounds memory', () => {
  assert.throws(() => createIdempotencyStore({ maxKeys: 0 }), /positive integer/);
  assert.throws(() => createIdempotencyStore({ ttlMs: 0 }), /positive integer/);
  const store = createIdempotencyStore({ maxKeys: 1 });
  store.set('a', { status: 'completed' });
  store.set('b', { status: 'completed' });
  assert.equal(store.get('a'), null);
  assert.throws(() => store.set('', {}), /required/);
});

test('memory idempotency keys expire after the configured TTL', () => {
  let clock = 1000;
  const store = createIdempotencyStore({ ttlMs: 10, now: () => clock });
  store.set('expiring', { run_id: 'r1' });
  assert.deepEqual(store.get('expiring'), { run_id: 'r1' });
  clock += 11;
  assert.equal(store.get('expiring'), null);
  assert.equal(store.has('expiring'), false);
});

test('file idempotency store survives a restart and remains bounded', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jrh-idempotency-'));
  const filePath = path.join(directory, 'keys.json');
  try {
    const first = createFileIdempotencyStore({ filePath, maxKeys: 1 });
    await first.set('old', { run_id: 'old' });
    await first.set('new', { run_id: 'new' });
    const second = createFileIdempotencyStore({ filePath });
    assert.equal(await second.get('old'), null);
    assert.equal((await second.get('new')).run_id, 'new');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('file idempotency store fails closed on malformed data', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jrh-idempotency-'));
  const filePath = path.join(directory, 'keys.json');
  try {
    await fs.writeFile(filePath, '{broken}', 'utf8');
    await assert.rejects(() => createFileIdempotencyStore({ filePath }).load(), /Unable to load idempotency file/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

