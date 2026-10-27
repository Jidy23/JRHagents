const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuditStore, createAuditedHost } = require('../adapters/audit');
const { createJRHHost } = require('../adapters/host');

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
  assert.equal(store.list({ status: 'completed', limit: 1 })[0].run_id, 'r4');
  assert.equal(store.stats().by_status.completed, 3);
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

test('audited host preserves approval rejection reason', async () => {
  const store = createAuditStore();
  const plan = { plan_id: 'p1', goal: 'write', steps: [{ id: 's1', skill_id: 'demo.write' }] };
  const { planFingerprint } = require('../adapters/planner/fingerprint');
  const adapter = {
    skills: { 'demo.write': { id: 'demo.write', risk: 'high', requiresApproval: true } },
    handlers: { 'demo.write': async () => ({ saved: true }) }
  };
  const host = createAuditedHost({
    store,
    host: createJRHHost({ adapters: [adapter] })
  });
  await assert.rejects(() => host.execute(plan, { approval: {
    plan_id: 'p1', plan_fingerprint: planFingerprint(plan), approvedSteps: ['s1'], expires_at: '2020-01-01T00:00:00.000Z'
  } }), /expired/);
  assert.equal(store.list()[0].status, 'blocked');
  assert.equal(store.list()[0].events[0].reason, 'expired');
});

test('audit store rejects invalid configuration and records', () => {
  assert.throws(() => createAuditStore({ maxRuns: 0 }), /positive integer/);
  const store = createAuditStore();
  assert.throws(() => store.record({ status: 'failed' }), /run_id/);
});

test('failed and retried handler messages are excluded from audited events', async () => {
  const secret = 'EXAMPLE_SECRET_FOR_TEST_ONLY';
  const failure = new Error(`request failed Bearer ${secret}`);
  const store = createAuditStore();
  let attempts = 0;
  const adapter = {
    skills: { 'demo.fail': { id: 'demo.fail', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.fail': async () => { attempts += 1; throw failure; } }
  };
  const host = createAuditedHost({ store, host: createJRHHost({ adapters: [adapter] }) });
  await assert.rejects(
    () => host.execute({ goal: 'retry', steps: [{ id: 's1', skill_id: 'demo.fail' }] }, {
      retryPolicy: { maxAttempts: 1, retryableSkills: ['demo.fail'] }
    }),
    (error) => error === failure && error.message.includes(secret)
  );
  assert.equal(attempts, 2);
  const record = store.list()[0];
  assert.equal(record.status, 'failed');
  assert.equal(record.events.filter((event) => event.type === 'step.failed').length, 2);
  assert.equal(record.events.filter((event) => event.type === 'step.retrying').length, 1);
  assert.equal(store.exportJson().includes(secret), false);
});

test('a successful retry does not persist a previous handler error message', async () => {
  const secret = 'EXAMPLE_SECRET_FOR_TEST_ONLY';
  const store = createAuditStore();
  let attempts = 0;
  const adapter = {
    skills: { 'demo.flaky': { id: 'demo.flaky', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.flaky': async () => {
      attempts += 1;
      if (attempts === 1) {
        const error = new TypeError(`Bearer ${secret}`);
        error.name = secret;
        throw error;
      }
      return { ok: true };
    } }
  };
  const host = createAuditedHost({ store, host: createJRHHost({ adapters: [adapter] }) });
  const result = await host.execute({ goal: 'retry', steps: [{ id: 's1', skill_id: 'demo.flaky' }] }, {
    retryPolicy: { maxAttempts: 1, retryableSkills: ['demo.flaky'] }
  });
  assert.equal(result.status, 'completed');
  const failureEvent = store.list()[0].events.find((event) => event.type === 'step.failed');
  assert.equal(failureEvent.reason, 'handler_error');
  assert.equal(failureEvent.error_type, 'TypeError');
  assert.equal(store.exportJson().includes(secret), false);
});

test('audited host rethrows null and records a controlled failure', async () => {
  const store = createAuditStore();
  const adapter = {
    skills: { 'demo.fail': { id: 'demo.fail', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.fail': async () => { throw null; } }
  };
  const host = createAuditedHost({ store, host: createJRHHost({ adapters: [adapter] }) });
  try {
    await host.execute({ goal: 'fail', steps: [{ id: 's1', skill_id: 'demo.fail' }] });
    assert.fail('handler should have failed');
  } catch (error) {
    assert.equal(error, null);
  }
  assert.equal(store.list()[0].status, 'failed');
  assert.equal(store.list()[0].events.find((event) => event.type === 'step.failed').reason, 'handler_error');
});

test('frozen handler errors cannot inject sensitive fallback audit metadata', async () => {
  const secret = 'EXAMPLE_SECRET_FOR_TEST_ONLY';
  const failure = Object.freeze(Object.assign(new Error(`Bearer ${secret}`), {
    code: 'APPROVAL_REJECTED', reason: 'expired', status: 'blocked', run_id: secret,
    events: [{ type: 'approval.rejected', reason: secret, error: secret }]
  }));
  const store = createAuditStore();
  const adapter = {
    skills: { 'demo.fail': { id: 'demo.fail', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.fail': async () => { throw failure; } }
  };
  const host = createAuditedHost({ store, host: createJRHHost({ adapters: [adapter] }) });
  await assert.rejects(() => host.execute({ goal: 'fail', steps: [{ id: 's1', skill_id: 'demo.fail' }] }),
    (error) => error === failure);
  assert.equal(store.list()[0].status, 'failed');
  assert.equal(store.list()[0].events.find((event) => event.type === 'step.failed').reason, 'handler_error');
  assert.equal(store.exportJson().includes(secret), false);
});

test('failed audit persistence does not replace the original thrown handler error', async () => {
  const failure = new Error('handler failure');
  const host = createAuditedHost({
    store: { record: async () => { throw new Error('audit unavailable'); } },
    host: { execute: async () => { throw failure; } }
  });
  await assert.rejects(() => host.execute({}), (error) => error === failure && error.audit_record_failed === true);
});

test('audited and idempotent host wrappers compose without forwarding private options', async () => {
  const { createIdempotentHost, createIdempotencyStore } = require('../adapters/idempotency');
  const adapter = {
    skills: { 'demo.read': { id: 'demo.read', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.read': async () => ({ ok: true }) }
  };
  const auditStore = createAuditStore();
  const inner = createIdempotentHost({ host: createJRHHost({ adapters: [adapter] }), store: createIdempotencyStore() });
  const host = createAuditedHost({ host: inner, store: auditStore });
  const result = await host.execute({ goal: 'read', steps: [{ id: 'read', skill_id: 'demo.read' }] }, { idempotencyKey: 'read-1' });
  assert.equal(result.status, 'completed');
  assert.equal(auditStore.list().length, 1);
});
