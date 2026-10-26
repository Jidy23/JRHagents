(function (global) {
  'use strict';

  function createHostAdapter(definition) {
    const source = definition || {};
    const skills = new Map();
    const handlers = source.handlers || {};

    Object.keys(source.skills || {}).forEach((id) => {
      const spec = source.skills[id];
      if (!spec || spec.id !== id || typeof spec.description !== 'string') {
        throw new Error(`Invalid skill specification: ${id}`);
      }
      if (spec.risk === 'high' && spec.requiresApproval !== true) {
        throw new Error(`High-risk skill must require approval: ${id}`);
      }
      if (typeof handlers[id] !== 'function') {
        throw new Error(`Missing host handler: ${id}`);
      }
      skills.set(id, { ...spec });
    });

    return {
      statusFor(skillId) {
        const spec = skills.get(skillId);
        return spec ? { available: true, requiresApproval: spec.requiresApproval === true, description: spec.description } : { available: false, requiresApproval: false };
      },
      async execute(plan, approvedSteps) {
        const outputs = {};
        const events = [];
        const approvals = approvedSteps || new Set();
        for (const step of plan.steps) {
          const spec = skills.get(step.skill_id);
          if (!spec || typeof handlers[step.skill_id] !== 'function') {
            throw new Error(`Host handler unavailable: ${step.skill_id}`);
          }
          if (spec.requiresApproval === true && !approvals.has(step.id)) {
            throw new Error(`Approval required: ${step.id}`);
          }
          events.push({ type: 'step.started', step_id: step.id });
          outputs[step.id] = await handlers[step.skill_id](step.input || {});
          events.push({ type: 'step.completed', step_id: step.id });
        }
        return { status: 'completed', outputs, events };
      }
    };
  }

  global.JRHHostBridge = { createHostAdapter };
}(typeof window === 'undefined' ? globalThis : window));
