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

test('replay with missing approval or a different actor fails closed', async () => {
  const host = createIdempotentHost({ store: createIdempotencyStore(), host: {
    execute: async () => ({ run_id: 'run_1', status: 'completed', outputs: {}, events: [] })
  } });
  const plan = { plan_id: 'p1', goal: 'write', steps: [{ id: 'write', skill_id: 'demo.write' }] };
  await host.execute(plan, { idempotencyKey: 'write:1', approvedSteps: ['write'], actorId: 'alice' });
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'write:1', actorId: 'alice' }), /different plan/);
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'write:1', approvedSteps: ['write'], actorId: 'bob' }), /different plan/);
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

test('snapshots the plan and authority before waiting for the store', async () => {
  let unblock;
  const gate = new Promise((resolve) => { unblock = resolve; });
  const underlyingStore = createIdempotencyStore();
  let executions = 0;
  let received;
  const host = createIdempotentHost({
    store: {
      get: async (key) => { await gate; return underlyingStore.get(key); },
      set: (key, value) => underlyingStore.set(key, value)
    },
    host: { execute: async (plan, options) => {
      executions += 1;
      received = { plan, options };
      return { status: 'completed', outputs: { amount: plan.steps[0].input.amount } };
    } }
  });
  const plan = { plan_id: 'p1', goal: 'write', steps: [{ id: 'write', skill_id: 'demo.write', input: { amount: 1 } }] };
  const options = { idempotencyKey: 'snapshot', actorId: 'alice', approval: { approvedSteps: ['write'] }, approvedSteps: new Set(['write']), retryPolicy: { maxAttempts: 1, retryableSkills: ['demo.write'] } };
  const running = host.execute(plan, options);
  plan.steps[0].input.amount = 999;
  options.actorId = 'bob';
  options.approval.approvedSteps.push('extra');
  options.approvedSteps.add('extra');
  options.retryPolicy.retryableSkills.push('other');
  unblock();
  assert.equal((await running).outputs.amount, 1);
  assert.equal(received.options.actorId, 'alice');
  assert.deepEqual(received.options.approval.approvedSteps, ['write']);
  assert.deepEqual([...received.options.approvedSteps], ['write']);
  assert.deepEqual(received.options.retryPolicy.retryableSkills, ['demo.write']);
  assert.equal(executions, 1);
});

test('replay cannot be changed through nested result references', async () => {
  let executions = 0;
  const host = createIdempotentHost({ store: createIdempotencyStore(), host: {
    execute: async () => ({ status: 'completed', outputs: { nested: { value: ++executions } } })
  } });
  const first = await host.execute({ goal: 'x', steps: [] }, { idempotencyKey: 'result-copy' });
  first.outputs.nested.value = 999;
  const replay = await host.execute({ goal: 'x', steps: [] }, { idempotencyKey: 'result-copy' });
  assert.equal(replay.outputs.nested.value, 1);
  replay.outputs.nested.value = 777;
  assert.equal((await host.execute({ goal: 'x', steps: [] }, { idempotencyKey: 'result-copy' })).outputs.nested.value, 1);
  assert.equal(executions, 1);
});

test('a failed cache write retains a completed result for safe retry in the same process', async () => {
  let writes = 0;
  let executions = 0;
  const backing = createIdempotencyStore();
  const host = createIdempotentHost({
    store: {
      get: (key) => backing.get(key),
      set: (key, value) => { if (++writes === 1) throw new Error('storage unavailable'); return backing.set(key, value); }
    },
    host: { execute: async () => ({ status: 'completed', outputs: { execution: ++executions } }) }
  });
  const plan = { goal: 'send once', steps: [] };
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'uncertain-write' }), /storage unavailable/);
  await assert.rejects(() => host.execute({ goal: 'different', steps: [] }, { idempotencyKey: 'uncertain-write' }), /different plan/);
  const replay = await host.execute(plan, { idempotencyKey: 'uncertain-write' });
  assert.equal(replay.replayed, true);
  assert.equal(replay.outputs.execution, 1);
  assert.equal(executions, 1);
  assert.equal(writes, 2);
});

test('a completed non-JSON result blocks replay instead of re-executing side effects', async () => {
  let executions = 0;
  const backing = createIdempotencyStore();
  const host = createIdempotentHost({ store: backing, host: {
    execute: async () => { executions += 1; return { status: 'completed', outputs: { invalid: () => 1 } }; }
  } });
  const plan = { goal: 'write', steps: [] };
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'non-json' }), /JSON|replay/i);
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'non-json' }), /already|replay|blocked/i);
  const restarted = createIdempotentHost({ store: backing, host: {
    execute: async () => { executions += 1; return { status: 'completed' }; }
  } });
  await assert.rejects(() => restarted.execute(plan, { idempotencyKey: 'non-json' }), /already|replay|blocked/i);
  assert.equal(executions, 1);
});

test('a live cancellation signal is preserved while options are otherwise captured', async () => {
  let unblock;
  const gate = new Promise((resolve) => { unblock = resolve; });
  const controller = new AbortController();
  let seen;
  const host = createIdempotentHost({
    store: { get: async () => { await gate; return null; }, set: async () => {} },
    host: { execute: async (_plan, options) => {
      seen = options.signal;
      return { status: 'completed', outputs: { cancelled: options.signal.aborted } };
    } }
  });
  const options = { idempotencyKey: 'signal', signal: controller.signal };
  const running = host.execute({}, options);
  options.signal = new AbortController().signal;
  controller.abort();
  unblock();
  assert.equal((await running).outputs.cancelled, true);
  assert.equal(seen, controller.signal);
});

test('replay binds execution policies and host-specific data', async () => {
  let executions = 0;
  const host = createIdempotentHost({ store: createIdempotencyStore(), host: {
    execute: async () => ({ status: 'completed', outputs: { execution: ++executions } })
  } });
  const plan = { goal: 'x', steps: [] };
  await host.execute(plan, { idempotencyKey: 'policy', executionPolicy: { maxSteps: 2 }, target: { region: 'a' } });
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'policy', executionPolicy: { maxSteps: 3 }, target: { region: 'a' } }), /different plan/);
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'policy', executionPolicy: { maxSteps: 2 }, target: { region: 'b' } }), /different plan/);
  assert.equal(executions, 1);
});

test('a failed tombstone write keeps the non-JSON action blocked until storage recovers', async () => {
  let writes = 0;
  let executions = 0;
  const backing = createIdempotencyStore();
  const host = createIdempotentHost({
    store: { get: (key) => backing.get(key), set: (key, value) => { if (++writes === 1) throw new Error('offline'); return backing.set(key, value); } },
    host: { execute: async () => { executions += 1; return { status: 'completed', outputs: { invalid: () => 1 } }; } }
  });
  const plan = { goal: 'write', steps: [] };
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'tombstone' }), /JSON/);
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'tombstone' }), /already/);
  await assert.rejects(() => host.execute(plan, { idempotencyKey: 'tombstone' }), /already/);
  assert.equal(executions, 1);
  assert.equal(writes, 2);
});

test('outstanding-action limit fails closed instead of discarding an unsaved result', async () => {
  let failWrite = true;
  let executions = 0;
  const backing = createIdempotencyStore();
  const host = createIdempotentHost({
    maxOutstanding: 1,
    store: { get: (key) => backing.get(key), set: (key, value) => { if (failWrite) throw new Error('offline'); return backing.set(key, value); } },
    host: { execute: async () => ({ status: 'completed', outputs: { execution: ++executions } }) }
  });
  await assert.rejects(() => host.execute({}, { idempotencyKey: 'one' }), /offline/);
  await assert.rejects(() => host.execute({}, { idempotencyKey: 'two' }), /outstanding/);
  assert.equal(executions, 1);
  failWrite = false;
  assert.equal((await host.execute({}, { idempotencyKey: 'one' })).replayed, true);
  await host.execute({}, { idempotencyKey: 'two' });
  assert.equal(executions, 2);
});

test('request accessors and non-JSON plans are rejected without calling the host', async () => {
  let calls = 0;
  let getterCalls = 0;
  const host = createIdempotentHost({ store: createIdempotencyStore(), host: {
    execute: async () => { calls += 1; return { status: 'completed' }; }
  } });
  const dangerous = { goal: 'x', steps: [] };
  Object.defineProperty(dangerous, 'payload', { enumerable: true, get() { getterCalls += 1; return 'bad'; } });
  await assert.rejects(() => host.execute(dangerous, { idempotencyKey: 'getter' }), /enumerable JSON data/);
  await assert.rejects(() => host.execute({ goal: 'x', value: NaN }, { idempotencyKey: 'nan' }), /JSON/);
  assert.equal(getterCalls, 0);
  assert.equal(calls, 0);
});

