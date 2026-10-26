const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuditStore, createAuditedHost } = require('../adapters/audit');

test('audit store records runs, bounds history, and redacts sensitive keys', () => {
  let tick = 0;
  const store = createAuditStore({ maxRuns: 3, now: () => `t${++tick}` });
  store.record({ run_id: 'r1', status: 'completed', outputs: { api_key: 'do-not-save', ok: true }, events: [] });
  store.record({ run_id: 'r2', status: 'completed', outputs: {}, events: [] });
  store.record({ run_id: 'r3', status: 'completed', outputs: {}, events: [] });
  assert.equal(store.get('r1').outputs.api_key, '[redacted]');
  assert.equal(store.get('r3').outputs.ok, undefined);
  assert.equal(store.get('r3').recorded_at, 't3');
  store.record({ run_id: 'r4', status: 'completed', outputs: {}, events: [] });
  assert.equal(store.get('r1'), null);
  assert.equal(store.list().length, 3);
  assert.match(store.exportJson(), /r3/);
});

test('audited host stores successful and failed executions', async () => {
  const store = createAuditStore();
  const host = createAuditedHost({
    store,
    host: {
      execute: async (plan) => {
        if (plan.fail) throw new Error('planned failure');
        return { run_id: 'ok1', status: 'completed', outputs: {}, events: [] };
      }
    }
  });
  await host.execute({});
  await assert.rejects(() => host.execute({ fail: true }), /planned failure/);
  assert.equal(store.get('ok1').status, 'completed');
  assert.equal(store.list()[0].status, 'failed');
});

test('audit store rejects invalid configuration and records', () => {
  assert.throws(() => createAuditStore({ maxRuns: 0 }), /positive integer/);
  const store = createAuditStore();
  assert.throws(() => store.record({ status: 'failed' }), /run_id/);
});
