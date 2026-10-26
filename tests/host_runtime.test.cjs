const assert = require('node:assert/strict');
const test = require('node:test');
const { createJRHHost } = require('../adapters/host');

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
    () => host.execute(plan, { approval: { plan_id: 'plan-2', approvedSteps: ['w1'] } }),
    /does not match workflow plan/
  );
  const result = await host.execute(plan, { approval: { plan_id: 'plan-1', approvedSteps: ['w1'] } });
  assert.equal(result.status, 'completed');
});

test('host rejects approval when plan content changes under the same ID', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  const plan = { plan_id: 'plan-stable', goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write', input: { amount: 1 } }] };
  const { planFingerprint } = require('../adapters/planner/fingerprint');
  const approval = { plan_id: 'plan-stable', plan_fingerprint: planFingerprint(plan), approvedSteps: ['w1'] };
  const changed = { ...plan, steps: [{ ...plan.steps[0], input: { amount: 999 } }] };
  await assert.rejects(() => host.execute(changed, { approval }), /plan_fingerprint does not match/);
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

test('host allowlist and duplicate protection fail closed', () => {
  const host = createJRHHost({ adapters: [readAdapter, writeAdapter], allowedSkills: ['demo.read'] });
  assert.equal(host.statusFor('demo.write').available, false);
  assert.throws(() => createJRHHost({ adapters: [readAdapter, readAdapter] }), /Duplicate host skill/);
  assert.throws(() => createJRHHost({ adapters: [] }), /at least one adapter/);
});
