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
});

test('host blocks high-risk steps without exact approval', async () => {
  const host = createJRHHost({ adapters: [writeAdapter] });
  await assert.rejects(() => host.execute({ goal: 'write', steps: [{ id: 'w1', skill_id: 'demo.write' }] }), /Approval required: w1/);
});

test('host allowlist and duplicate protection fail closed', () => {
  const host = createJRHHost({ adapters: [readAdapter, writeAdapter], allowedSkills: ['demo.read'] });
  assert.equal(host.statusFor('demo.write').available, false);
  assert.throws(() => createJRHHost({ adapters: [readAdapter, readAdapter] }), /Duplicate host skill/);
  assert.throws(() => createJRHHost({ adapters: [] }), /at least one adapter/);
});
