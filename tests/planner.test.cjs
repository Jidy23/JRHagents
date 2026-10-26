const assert = require('node:assert/strict');
const test = require('node:test');
const { createGoalPlanner } = require('../adapters/planner');

const host = {
  listSkills: () => [{ id: 'demo.read', description: 'Read', risk: 'low', requiresApproval: false }],
  statusFor: (id) => id === 'demo.read' ? { available: true, requiresApproval: false, risk: 'low' } : { available: false, requiresApproval: false }
};

test('planner converts an injected proposal into a reviewed plan', async () => {
  const planner = createGoalPlanner({ host, propose: async ({ goal }) => ({ goal, steps: [{ id: 'read', skill_id: 'demo.read', input: { x: 1 } }] }) });
  const result = await planner.propose('Read the data');
  assert.equal(result.plan.schema_version, 1);
  assert.equal(result.review[0].available, true);
  assert.deepEqual(result.plan.steps[0].input, { x: 1 });
});

test('planner rejects unavailable or duplicate proposed steps', async () => {
  const unavailable = createGoalPlanner({ host, propose: async () => ({ goal: 'x', steps: [{ id: 'x', skill_id: 'missing' }] }) });
  await assert.rejects(() => unavailable.propose('x'), /unavailable skill/);
  const duplicate = createGoalPlanner({ host, propose: async () => ({ goal: 'x', steps: [{ id: 'x', skill_id: 'demo.read' }, { id: 'x', skill_id: 'demo.read' }] }) });
  await assert.rejects(() => duplicate.propose('x'), /Duplicate planner step ID/);
});

test('planner requires a host and injected proposal function', () => {
  assert.throws(() => createGoalPlanner({ host }), /injected propose/);
  assert.throws(() => createGoalPlanner({ propose: () => ({}) }), /JRH host runtime/);
});

test('planner prepares explicit approvals without executing the host', async () => {
  const approvalHost = {
    listSkills: () => [
      { id: 'demo.read', description: 'Read', risk: 'low', requiresApproval: false },
      { id: 'demo.write', description: 'Write', risk: 'high', requiresApproval: true }
    ],
    statusFor: (id) => id === 'demo.write'
      ? { available: true, requiresApproval: true, risk: 'high' }
      : { available: true, requiresApproval: false, risk: 'low' }
  };
  const planner = createGoalPlanner({
    host: approvalHost,
    propose: async () => ({ goal: 'review', steps: [
      { id: 'read', skill_id: 'demo.read' },
      { id: 'write', skill_id: 'demo.write' }
    ] })
  });
  const { plan } = await planner.propose('review');
  assert.throws(() => planner.prepareExecution(plan), /Approval required before execution/);
  const prepared = planner.prepareExecution(plan, ['write']);
  assert.deepEqual(prepared.execution.approvedSteps, ['write']);
});
