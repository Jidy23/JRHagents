const assert = require('node:assert/strict');
const test = require('node:test');
const { createJRHHost } = require('../adapters/host');
const { planFingerprint } = require('../adapters/planner/fingerprint');

const readAdapter = {
  skills: { 'demo.read': { id: 'demo.read', description: 'Read demo', risk: 'low', requiresApproval: false } },
  handlers: { 'demo.read': async (input) => ({ value: input.value }) }
};
const writeAdapter = {
  skills: { 'demo.write': { id: 'demo.write', description: 'Write demo', risk: 'high', requiresApproval: true } },
  handlers: { 'demo.write': async () => ({ saved: true }) }
};

test('host composes adapters and runs an approved workflow in order', async () => {
  const host = createJRHHost({ adapters: [readAdapter, writeAdapter] });
  assert.equal(host.listSkills().length, 2);
  const result = await host.execute({ goal: 'demo', steps: [
    { id: 'read', skill_id: 'demo.read', input: { value: 3 } },
    { id: 'write', skill_id: 'demo.write' }
  ] }, { approvedSteps: new Set(['write']) });
  assert.deepEqual(result.outputs, { read: { value: 3 }, write: { saved: true } });
  assert.equal(result.events.at(-1).type, 'run.completed');
  assert.equal(result.metrics.status, 'completed');
  assert.equal(result.metrics.steps.read.attempts, 1);
  assert.equal(result.metrics.steps.write.status, 'completed');
  assert.ok(result.events.every((event) => event.at && event.run_id === result.run_id));
});

test('host blocks high-risk steps without exact approval', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  await assert.rejects(() => host.execute({ goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write' }] }), /Approval required: w1/);
});

test('host binds approval envelopes to the exact plan ID', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  const plan = { plan_id: 'plan-1', goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write' }] };
  await assert.rejects(
    () => host.execute(plan, { approval: { plan_id: 'plan-2', plan_fingerprint: planFingerprint(plan), approvedSteps: ['w1'] } }),
    (error) => error.code === 'APPROVAL_REJECTED' && error.reason === 'plan_id_mismatch'
  );
  const result = await host.execute(plan, { approval: { plan_id: 'plan-1', plan_fingerprint: planFingerprint(plan), approvedSteps: ['w1'] } });
  assert.equal(result.status, 'completed');
  assert.equal(result.events.find((event) => event.type === 'approval.accepted').approved_steps, 1);
});

test('host rejects approval when plan content changes under the same ID', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  const plan = { plan_id: 'plan-stable', goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write', input: { amount: 1 } }] };
  const approval = { plan_id: 'plan-stable', plan_fingerprint: planFingerprint(plan), approvedSteps: ['w1'] };
  const changed = { ...plan, steps: [{ ...plan.steps[0], input: { amount: 999 } }] };
  await assert.rejects(() => host.execute(changed, { approval }), /plan_fingerprint does not match/);
});

test('planner-generated approval executes with the real unified host', async () => {
  const { createGoalPlanner } = require('../adapters/planner');
  const host = createJRHHost({ adapters: [readAdapter, writeAdapter] });
  const planner = createGoalPlanner({
    host,
    propose: async ({ goal }) => ({ goal, steps: [
      { id: 'read', skill_id: 'demo.read', input: { value: 3 } },
      { id: 'write', skill_id: 'demo.write' }
    ] })
  });
  const { plan } = await planner.propose('Review and write');
  const prepared = planner.prepareExecution(plan, ['write'], { ttlMs: 60_000 });
  const result = await host.execute(prepared.plan, { approval: prepared.execution });
  assert.deepEqual(result.outputs, { read: { value: 3 }, write: { saved: true } });
  assert.equal(result.events.at(-1).type, 'run.completed');
});

test('host rejects expired approval envelopes before execution', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  const plan = { plan_id: 'plan-expired', goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write' }] };
  await assert.rejects(
    () => host.execute(plan, { approval: { plan_id: 'plan-expired', plan_fingerprint: planFingerprint(plan), approvedSteps: ['w1'], expires_at: '2020-01-01T00:00:00.000Z' } }),
    (error) => error.code === 'APPROVAL_REJECTED' && error.reason === 'expired'
  );
});

test('structured approvals require a plan ID, fingerprint and exact valid steps', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  const plan = { plan_id: 'plan-1', goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write' }] };
  const valid = { plan_id: 'plan-1', plan_fingerprint: planFingerprint(plan), approvedSteps: ['w1'] };
  await assert.rejects(() => host.execute(plan, { approval: { plan_id: 'plan-1', approvedSteps: ['w1'] } }),
    (error) => error.code === 'APPROVAL_REJECTED' && error.reason === 'malformed');
  await assert.rejects(() => host.execute({ goal: plan.goal, steps: plan.steps }, { approval: valid }),
    (error) => error.code === 'APPROVAL_REJECTED' && error.reason === 'plan_id_mismatch');
  await assert.rejects(() => host.execute(plan, { approval: { ...valid, approvedSteps: ['w1', 'not-in-plan'] } }),
    (error) => error.code === 'APPROVAL_REJECTED' && error.reason === 'unknown_step');
});

test('async execution uses the approved snapshot even if caller mutates the plan', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let received;
  const adapter = {
    skills: {
      'demo.wait': { id: 'demo.wait', risk: 'low', requiresApproval: false },
      'demo.write': { id: 'demo.write', risk: 'high', requiresApproval: true }
    },
    handlers: { 'demo.wait': async () => { await gate; return {}; }, 'demo.write': async (input) => { received = input; return { saved: true }; } }
  };
  const host = createJRHHost({ adapters: [adapter] });
  const plan = { plan_id: 'snapshot', goal: 'write', steps: [
    { id: 'wait', skill_id: 'demo.wait' },
    { id: 'write', skill_id: 'demo.write', input: { amount: 1, nested: { safe: true } } }
  ] };
  const execution = host.execute(plan, { approval: { plan_id: plan.plan_id, plan_fingerprint: planFingerprint(plan), approvedSteps: ['write'] } });
  await new Promise((resolve) => setImmediate(resolve));
  plan.steps[1].input.amount = 999;
  plan.steps[1].input.nested.safe = false;
  release();
  await execution;
  assert.deepEqual(received, { amount: 1, nested: { safe: true } });
});

test('approval expiry is rechecked before a delayed high-risk step', async () => {
  const originalNow = Date.now;
  let clock = originalNow();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let writes = 0;
  const adapter = {
    skills: {
      'demo.wait': { id: 'demo.wait', risk: 'low', requiresApproval: false },
      'demo.write': { id: 'demo.write', risk: 'high', requiresApproval: true }
    },
    handlers: { 'demo.wait': async () => { await gate; return {}; }, 'demo.write': async () => { writes += 1; return {}; } }
  };
  const plan = { plan_id: 'expiring', goal: 'write', steps: [
    { id: 'wait', skill_id: 'demo.wait' }, { id: 'write', skill_id: 'demo.write' }
  ] };
  try {
    Date.now = () => clock;
    const host = createJRHHost({ adapters: [adapter] });
    const execution = host.execute(plan, { approval: { plan_id: plan.plan_id, plan_fingerprint: planFingerprint(plan), approvedSteps: ['write'], expires_at: new Date(clock + 10_000).toISOString() } });
    await new Promise((resolve) => setImmediate(resolve));
    clock += 10_001;
    release();
    await assert.rejects(execution, (error) => error.code === 'APPROVAL_REJECTED' && error.reason === 'expired' && error.events.some((event) => event.type === 'step.blocked'));
    assert.equal(writes, 0);
  } finally {
    Date.now = originalNow;
  }
});

test('prototype-like step IDs remain ordinary own output and metrics keys', async () => {
  const host = createJRHHost({ adapters: [readAdapter] });
  const plan = { goal: 'read', steps: [{ id: '__proto__', skill_id: 'demo.read', input: { value: 7 } }] };
  const result = await host.execute(plan);
  assert.equal(Object.hasOwn(result.outputs, '__proto__'), true);
  assert.deepEqual(result.outputs.__proto__, { value: 7 });
  assert.equal(Object.hasOwn(result.metrics.steps, '__proto__'), true);
  await assert.rejects(() => host.execute(plan, { executionPolicy: { maxSteps: 0 } }),
    (error) => error.code === 'RUN_BUDGET_EXCEEDED' && error.metrics.steps.__proto__.status === 'budget_exceeded');
});

test('host rejects malformed policy and non-JSON plans before running a handler', async () => {
  assert.throws(() => createJRHHost({ adapters: [{ skills: { bad: { risk: 'HIGH' } }, handlers: { bad: () => {} } }] }), /risk/);
  assert.throws(() => createJRHHost({ adapters: [{ skills: { bad: { risk: 'low', requiresApproval: 'yes' } }, handlers: { bad: () => {} } }] }), /requiresApproval/);
  const host = createJRHHost({ adapters: [readAdapter] });
  const invalids = [
    { goal: 'x', steps: [{ id: '', skill_id: 'demo.read' }] },
    { goal: 'x', steps: [{ id: 'a', skill_id: 'demo.read', input: [] }] },
    { goal: 'x', steps: [{ id: 'a', skill_id: 'demo.read', input: { value: NaN } }] },
    { goal: 'x', steps: [{ id: 'a', skill_id: 'demo.read', input: { value: () => 3 } }] }
  ];
  for (const plan of invalids) await assert.rejects(() => host.execute(plan));
  await assert.rejects(() => host.execute({ goal: 'x', steps: [] }, { approvedSteps: 'write' }), /approvedSteps/);
});

test('host retries only explicitly selected low-risk skills', async () => {
  let attempts = 0;
  const flakyAdapter = {
    skills: { 'demo.flaky': { id: 'demo.flaky', description: 'Flaky demo', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.flaky': async () => { attempts += 1; if (attempts < 2) throw new Error('temporary'); return { ok: true }; } }
  };
  const host = createJRHHost({ adapters: [flakyAdapter] });
  const result = await host.execute({ goal: 'retry', steps: [{ id: 'f', skill_id: 'demo.flaky' }] }, {
    retryPolicy: { maxAttempts: 1, retryableSkills: ['demo.flaky'] }
  });
  assert.equal(attempts, 2);
  assert.equal(result.events.filter((event) => event.type === 'step.retrying').length, 1);
  assert.equal(result.metrics.steps.f.attempts, 2);
  assert.equal(result.metrics.steps.f.status, 'completed');
});

test('host rethrows frozen errors and non-Error values without replacement', async () => {
  for (const thrown of [Object.freeze(new Error('frozen')), 'thrown string', null]) {
    const adapter = {
      skills: { 'demo.fail': { id: 'demo.fail', risk: 'low', requiresApproval: false } },
      handlers: { 'demo.fail': async () => { throw thrown; } }
    };
    const host = createJRHHost({ adapters: [adapter] });
    try {
      await host.execute({ goal: 'fail', steps: [{ id: 'f', skill_id: 'demo.fail' }] });
      assert.fail('handler should have failed');
    } catch (actual) {
      assert.equal(actual, thrown);
    }
  }
});

test('host cancels before the next step and preserves lifecycle events', async () => {
  const controller = new AbortController();
  const host = createJRHHost({ adapters: [readAdapter] });
  controller.abort();
  await assert.rejects(
    () => host.execute({ goal: 'cancel', steps: [{ id: 'read', skill_id: 'demo.read' }] }, { signal: controller.signal }),
    (error) => error.code === 'RUN_CANCELLED' && error.status === 'cancelled' && error.metrics.status === 'cancelled' && error.events.at(-1).type === 'run.cancelled'
  );
});

test('host stops at the configured step budget', async () => {
  const host = createJRHHost({ adapters: [readAdapter] });
  await assert.rejects(
    () => host.execute({ goal: 'budget', steps: [
      { id: 'one', skill_id: 'demo.read' },
      { id: 'two', skill_id: 'demo.read' }
    ] }, { executionPolicy: { maxSteps: 1 } }),
    (error) => error.code === 'RUN_BUDGET_EXCEEDED'
      && error.status === 'budget_exceeded'
      && error.events.at(-1).type === 'run.budget_exceeded'
      && error.metrics.steps.one.status === 'completed'
      && error.metrics.steps.two.status === 'budget_exceeded'
  );
});

test('host rejects oversized step output', async () => {
  const largeAdapter = {
    skills: { 'demo.large': { id: 'demo.large', description: 'Large demo', risk: 'low', requiresApproval: false } },
    handlers: { 'demo.large': async () => ({ payload: 'x'.repeat(100) }) }
  };
  const host = createJRHHost({ adapters: [largeAdapter] });
  await assert.rejects(
    () => host.execute({ goal: 'size', steps: [{ id: 'large', skill_id: 'demo.large' }] }, { executionPolicy: { maxOutputBytes: 20 } }),
    (error) => error.code === 'RUN_BUDGET_EXCEEDED'
      && error.events.some((event) => event.type === 'step.output_rejected')
      && error.metrics.steps.large.output_bytes > 20
  );
});

test('host allowlist and duplicate protection fail closed', () => {
  const host = createJRHHost({ adapters: [readAdapter, writeAdapter], allowedSkills: ['demo.read'] });
  assert.equal(host.statusFor('demo.write').available, false);
  assert.throws(() => createJRHHost({ adapters: [readAdapter, readAdapter] }), /Duplicate host skill/);
  assert.throws(() => createJRHHost({ adapters: [] }), /at least one adapter/);
});
