'use strict';

const { planFingerprint } = require('../planner/fingerprint');

class RunCancelledError extends Error {
  constructor(message = 'Run cancelled.') {
    super(message);
    this.name = 'RunCancelledError';
    this.code = 'RUN_CANCELLED';
  }
}

class RunBudgetError extends Error {
  constructor(message = 'Run execution budget exceeded.') {
    super(message);
    this.name = 'RunBudgetError';
    this.code = 'RUN_BUDGET_EXCEEDED';
  }
}

function attachRun(error, runId, events, status, metrics) {
  error.run_id = runId;
  error.events = events;
  error.status = status;
  error.metrics = metrics;
  return error;
}

function createJRHHost({ adapters = [], allowedSkills = null, now = () => new Date().toISOString() } = {}) {
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
    async execute(plan, { approvedSteps = new Set(), approval = null, signal = null, retryPolicy = {}, executionPolicy = {} } = {}) {
      validatePlan(plan);
      if (approval !== null) {
        if (!approval || typeof approval.plan_id !== 'string' || !Array.isArray(approval.approvedSteps)) {
          throw new Error('approval must contain plan_id and approvedSteps.');
        }
        if (plan.plan_id && approval.plan_id !== plan.plan_id) throw new Error('Approval plan_id does not match workflow plan.');
        if (approval.plan_fingerprint !== undefined && approval.plan_fingerprint !== planFingerprint(plan)) {
          throw new Error('Approval plan_fingerprint does not match workflow plan.');
        }
        if (approval.expires_at !== undefined && (!Number.isFinite(Date.parse(approval.expires_at)) || Date.parse(approval.expires_at) <= Date.now())) {
          throw new Error('Approval has expired.');
        }
        approvedSteps = approval.approvedSteps;
      }
      if (!approvedSteps || typeof approvedSteps[Symbol.iterator] !== 'function') throw new Error('approvedSteps must be iterable.');
      const approvalSet = new Set(approvedSteps);
      if (signal && typeof signal.aborted !== 'boolean') throw new Error('signal must be an AbortSignal-like object.');
      const maxAttempts = retryPolicy.maxAttempts === undefined ? 0 : retryPolicy.maxAttempts;
      const retryableSkills = new Set(retryPolicy.retryableSkills || []);
      if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new Error('retryPolicy.maxAttempts must be a non-negative integer.');
      if (!Array.isArray(retryPolicy.retryableSkills || [])) throw new Error('retryPolicy.retryableSkills must be an array.');
      const maxSteps = executionPolicy.maxSteps === undefined ? Infinity : executionPolicy.maxSteps;
      const maxDurationMs = executionPolicy.maxDurationMs === undefined ? Infinity : executionPolicy.maxDurationMs;
      if (!(maxSteps === Infinity || (Number.isInteger(maxSteps) && maxSteps >= 0))) throw new Error('executionPolicy.maxSteps must be a non-negative integer.');
      if (!(maxDurationMs === Infinity || (Number.isFinite(maxDurationMs) && maxDurationMs >= 0))) throw new Error('executionPolicy.maxDurationMs must be a non-negative number.');
      const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const outputs = {};
      const startedAt = Date.now();
      const startedAtIso = now();
      const events = [];
      const stepMetrics = {};
      const emit = (type, detail = {}) => {
        const event = { type, run_id: runId, at: now(), ...detail };
        events.push(event);
        return event;
      };
      const metrics = (status, endedAt = Date.now()) => ({
        started_at: startedAtIso,
        ended_at: now(),
        duration_ms: Math.max(0, endedAt - startedAt),
        status,
        steps: { ...stepMetrics }
      });
      const cancel = () => attachRun(new RunCancelledError(), runId, events, 'cancelled', metrics('cancelled'));
      const budgetFail = (stepId, reason) => {
        stepMetrics[stepId] = stepMetrics[stepId] || { attempts: 0, status: 'budget_exceeded', duration_ms: 0 };
        stepMetrics[stepId].status = 'budget_exceeded';
        emit('run.budget_exceeded', { step_id: stepId, reason });
        return attachRun(new RunBudgetError(`Execution budget exceeded: ${reason}`), runId, events, 'budget_exceeded', metrics('budget_exceeded'));
      };
      emit('run.queued');
      emit('run.started');
      for (const [stepIndex, step] of plan.steps.entries()) {
        if (stepIndex >= maxSteps) throw budgetFail(step.id, 'max_steps');
        if (Date.now() - startedAt > maxDurationMs) throw budgetFail(step.id, 'max_duration_ms');
        if (signal && signal.aborted) {
          stepMetrics[step.id] = { attempts: 0, status: 'cancelled', duration_ms: 0 };
          emit('run.cancelled', { step_id: step.id, reason: 'signal_aborted' });
          throw cancel();
        }
        const spec = skills.get(step.skill_id);
        const handler = handlers.get(step.skill_id);
        if (!spec || !handler) {
          stepMetrics[step.id] = { attempts: 0, status: 'failed', duration_ms: 0 };
          emit('step.failed', { step_id: step.id, reason: 'skill_unavailable' });
          emit('run.failed');
          throw attachRun(new Error(`Host skill unavailable: ${step.skill_id}`), runId, events, 'failed', metrics('failed'));
        }
        if (spec.requiresApproval === true && !approvalSet.has(step.id)) {
          stepMetrics[step.id] = { attempts: 0, status: 'paused', duration_ms: 0 };
          emit('step.blocked', { step_id: step.id, reason: 'approval_required' });
          emit('run.paused', { reason: 'approval_required' });
          throw attachRun(new Error(`Approval required: ${step.id}`), runId, events, 'paused', metrics('paused'));
        }
        const attemptsAllowed = spec.risk === 'high' ? 0 : (retryableSkills.has(step.skill_id) ? maxAttempts : 0);
        let attempt = 0;
        let stepStartedAt = Date.now();
        stepMetrics[step.id] = { attempts: 0, status: 'running', duration_ms: 0 };
        while (true) {
          if (signal && signal.aborted) {
            stepMetrics[step.id].status = 'cancelled';
            stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
            emit('run.cancelled', { step_id: step.id, reason: 'signal_aborted' });
            throw cancel();
          }
          attempt += 1;
          stepMetrics[step.id].attempts = attempt;
          stepStartedAt = Date.now();
          emit('step.started', { step_id: step.id, skill_id: step.skill_id, attempt });
          try {
            outputs[step.id] = await handler(step.input || {});
            if (signal && signal.aborted) {
              stepMetrics[step.id].status = 'cancelled';
              stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
              emit('run.cancelled', { step_id: step.id, reason: 'signal_aborted' });
              throw cancel();
            }
            if (Date.now() - startedAt > maxDurationMs) {
              stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
              emit('step.completed', { step_id: step.id, attempt });
              throw budgetFail(step.id, 'max_duration_ms');
            }
            stepMetrics[step.id].status = 'completed';
            stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
            emit('step.completed', { step_id: step.id, attempt });
            break;
          } catch (error) {
            if (error && (error.code === 'RUN_CANCELLED' || error.code === 'RUN_BUDGET_EXCEEDED')) throw error;
            stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
            emit('step.failed', { step_id: step.id, attempt, error: error.message });
            if (attempt <= attemptsAllowed) {
              stepMetrics[step.id].status = 'retrying';
              emit('step.retrying', { step_id: step.id, attempt: attempt + 1, reason: error.message });
              continue;
            }
            stepMetrics[step.id].status = 'failed';
            emit('run.failed');
            throw attachRun(error, runId, events, 'failed', metrics('failed'));
          }
        }
      }
      emit('run.completed');
      return { run_id: runId, status: 'completed', outputs, events, metrics: metrics('completed') };
    }
  };
}

module.exports = { createJRHHost, RunCancelledError, RunBudgetError };
