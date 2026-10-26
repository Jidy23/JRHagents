'use strict';

function createJRHHost({ adapters = [], allowedSkills = null } = {}) {
  if (!Array.isArray(adapters) || adapters.length === 0) throw new Error('JRH host requires at least one adapter.');
  const skills = new Map();
  const handlers = new Map();
  const allowlist = allowedSkills ? new Set(allowedSkills) : null;

  for (const adapter of adapters) {
    if (!adapter || !adapter.skills || !adapter.handlers) throw new Error('Invalid adapter: skills and handlers are required.');
    for (const [id, spec] of Object.entries(adapter.skills)) {
      if (allowlist && !allowlist.has(id)) continue;
      if (skills.has(id)) throw new Error(`Duplicate host skill: ${id}`);
      if (spec.risk === 'high' && spec.requiresApproval !== true) throw new Error(`High-risk skill must require approval: ${id}`);
      if (typeof adapter.handlers[id] !== 'function') throw new Error(`Missing handler for host skill: ${id}`);
      skills.set(id, { ...spec });
      handlers.set(id, adapter.handlers[id]);
    }
  }

  const validatePlan = (plan) => {
    if (!plan || typeof plan.goal !== 'string' || !plan.goal.trim()) throw new Error('Workflow goal is required.');
    if (!Array.isArray(plan.steps)) throw new Error('Workflow steps must be an array.');
    const ids = new Set();
    for (const step of plan.steps) {
      if (!step || typeof step.id !== 'string' || typeof step.skill_id !== 'string') throw new Error('Each step requires id and skill_id.');
      if (ids.has(step.id)) throw new Error(`Duplicate step ID: ${step.id}`);
      ids.add(step.id);
    }
    return plan;
  };

  return {
    listSkills() { return [...skills.values()]; },
    statusFor(skillId) {
      const spec = skills.get(skillId);
      return spec ? { available: true, requiresApproval: spec.requiresApproval === true, risk: spec.risk || 'low' } : { available: false, requiresApproval: false };
    },
    async execute(plan, { approvedSteps = new Set() } = {}) {
      validatePlan(plan);
      const runId = `run_${Date.now().toString(36)}`;
      const outputs = {};
      const events = [{ type: 'run.started', run_id: runId }];
      for (const step of plan.steps) {
        const spec = skills.get(step.skill_id);
        const handler = handlers.get(step.skill_id);
        if (!spec || !handler) throw new Error(`Host skill unavailable: ${step.skill_id}`);
        if (spec.requiresApproval === true && !approvedSteps.has(step.id)) {
          events.push({ type: 'step.blocked', step_id: step.id, reason: 'approval_required' });
          throw new Error(`Approval required: ${step.id}`);
        }
        events.push({ type: 'step.started', step_id: step.id, skill_id: step.skill_id });
        outputs[step.id] = await handler(step.input || {});
        events.push({ type: 'step.completed', step_id: step.id });
      }
      events.push({ type: 'run.completed', run_id: runId });
      return { run_id: runId, status: 'completed', outputs, events };
    }
  };
}

module.exports = { createJRHHost };
