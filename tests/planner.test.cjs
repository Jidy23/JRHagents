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
