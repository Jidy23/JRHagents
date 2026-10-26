'use strict';

class RunCancelledError extends Error {
  constructor(message = 'Run cancelled.') {
    super(message);
    this.name = 'RunCancelledError';
    this.code = 'RUN_CANCELLED';
  }
}

function attachRun(error, runId, events, status) {
  error.run_id = runId;
  error.events = events;
  error.status = status;
  return error;
}

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
    async execute(plan, { approvedSteps = new Set(), signal = null, retryPolicy = {} } = {}) {
      validatePlan(plan);
      if (signal && typeof signal.aborted !== 'boolean') throw new Error('signal must be an AbortSignal-like object.');
      const maxAttempts = retryPolicy.maxAttempts === undefined ? 0 : retryPolicy.maxAttempts;
      const retryableSkills = new Set(retryPolicy.retryableSkills || []);
      if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new Error('retryPolicy.maxAttempts must be a non-negative integer.');
      if (!Array.isArray(retryPolicy.retryableSkills || [])) throw new Error('retryPolicy.retryableSkills must be an array.');
      const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const outputs = {};
      const events = [{ type: 'run.queued', run_id: runId }, { type: 'run.started', run_id: runId }];
      const cancel = () => attachRun(new RunCancelledError(), runId, events, 'cancelled');
      for (const step of plan.steps) {
        if (signal && signal.aborted) {
          events.push({ type: 'run.cancelled', run_id: runId, step_id: step.id, reason: 'signal_aborted' });
          throw cancel();
        }
        const spec = skills.get(step.skill_id);
        const handler = handlers.get(step.skill_id);
        if (!spec || !handler) {
          events.push({ type: 'step.failed', step_id: step.id, reason: 'skill_unavailable' });
          events.push({ type: 'run.failed', run_id: runId });
          throw attachRun(new Error(`Host skill unavailable: ${step.skill_id}`), runId, events, 'failed');
        }
        if (spec.requiresApproval === true && !approvedSteps.has(step.id)) {
          events.push({ type: 'step.blocked', step_id: step.id, reason: 'approval_required' });
          events.push({ type: 'run.paused', run_id: runId, reason: 'approval_required' });
          throw attachRun(new Error(`Approval required: ${step.id}`), runId, events, 'paused');
        }
        const attemptsAllowed = spec.risk === 'high' ? 0 : (retryableSkills.has(step.skill_id) ? maxAttempts : 0);
        let attempt = 0;
        while (true) {
          if (signal && signal.aborted) {
            events.push({ type: 'run.cancelled', run_id: runId, step_id: step.id, reason: 'signal_aborted' });
            throw cancel();
          }
          attempt += 1;
          events.push({ type: 'step.started', step_id: step.id, skill_id: step.skill_id, attempt });
          try {
            outputs[step.id] = await handler(step.input || {});
            if (signal && signal.aborted) {
              events.push({ type: 'run.cancelled', run_id: runId, step_id: step.id, reason: 'signal_aborted' });
              throw cancel();
            }
            events.push({ type: 'step.completed', step_id: step.id, attempt });
            break;
          } catch (error) {
            if (error && error.code === 'RUN_CANCELLED') throw error;
            events.push({ type: 'step.failed', step_id: step.id, attempt, error: error.message });
            if (attempt <= attemptsAllowed) {
              events.push({ type: 'step.retrying', step_id: step.id, attempt: attempt + 1, reason: error.message });
              continue;
            }
            events.push({ type: 'run.failed', run_id: runId });
            throw attachRun(error, runId, events, 'failed');
          }
        }
      }
      events.push({ type: 'run.completed', run_id: runId });
      return { run_id: runId, status: 'completed', outputs, events };
    }
  };
}

module.exports = { createJRHHost, RunCancelledError };
