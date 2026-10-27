'use strict';

const { planFingerprint } = require('../planner/fingerprint');
// Private per-execution capture shared with the audit wrapper. The host, not
// an exception thrown by an injected handler, supplies run status and events.
const HOST_AUDIT_CAPTURE = Symbol('jrh.host.audit.capture');

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

class ApprovalRejectedError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'ApprovalRejectedError';
    this.code = 'APPROVAL_REJECTED';
    this.reason = reason;
    this.status = 'blocked';
  }
}

function attachRun(error, runId, events, status, metrics) {
  // Keep the original thrown value even when a handler throws a primitive or
  // a frozen Error that cannot accept run metadata.
  if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
    try {
      error.run_id = runId;
      error.events = events;
      error.status = status;
      error.metrics = metrics;
    } catch {
      // A non-extensible thrown value remains the caller's original exception.
    }
  }
  return error;
}

// Error messages, names, and codes are handler-controlled and may contain
// credentials. Emit only fixed, bounded categories in the audit event stream.
function safeErrorType(error) {
  if (error instanceof TypeError) return 'TypeError';
  if (error instanceof RangeError) return 'RangeError';
  if (error instanceof SyntaxError) return 'SyntaxError';
  if (error instanceof ReferenceError) return 'ReferenceError';
  if (error instanceof Error) return 'Error';
  return 'NonError';
}

function serializedBytes(value) {
  const serialized = JSON.stringify(value);
  return Buffer.byteLength(serialized === undefined ? 'null' : serialized, 'utf8');
}

// A reviewed plan is a JSON value. Copy it before the first await so callers
// cannot change a later step after its approval was checked.
function snapshotJson(value, ancestors = new Set(), depth = 0) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || depth > 128 || ancestors.has(value)) {
    throw new Error('Workflow plan must contain only acyclic JSON values.');
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('Workflow plan objects must be plain JSON objects.');
  }
  ancestors.add(value);
  const output = Array.isArray(value) ? [] : {};
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string') throw new Error('Workflow plan must not contain symbol keys.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new Error('Workflow plan must contain only enumerable JSON data.');
    }
    if (Array.isArray(value) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      throw new Error('Workflow plan arrays must contain only indexed JSON data.');
    }
    Object.defineProperty(output, key, {
      value: snapshotJson(descriptor.value, ancestors, depth + 1),
      enumerable: true, configurable: true, writable: true
    });
  }
  if (Array.isArray(value) && Object.keys(output).length !== value.length) {
    throw new Error('Workflow plan arrays must not contain holes.');
  }
  ancestors.delete(value);
  return output;
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
      if (!spec || typeof spec !== 'object') throw new Error(`Invalid host skill: ${id}`);
      if (spec.risk !== undefined && spec.risk !== 'low' && spec.risk !== 'high') throw new Error(`Invalid host skill risk: ${id}`);
      if (spec.requiresApproval !== undefined && typeof spec.requiresApproval !== 'boolean') throw new Error(`requiresApproval must be boolean: ${id}`);
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
      if (!step || typeof step.id !== 'string' || !step.id.trim() || typeof step.skill_id !== 'string' || !step.skill_id.trim()) throw new Error('Each step requires non-empty id and skill_id.');
      if (step.input !== undefined && (!step.input || typeof step.input !== 'object' || Array.isArray(step.input))) throw new Error('Step input must be a JSON object.');
      if (ids.has(step.id)) throw new Error(`Duplicate step ID: ${step.id}`);
      ids.add(step.id);
    }
    return plan;
  };

  return {
    [HOST_AUDIT_CAPTURE]: true,
    listSkills() { return [...skills.values()]; },
    statusFor(skillId) {
      const spec = skills.get(skillId);
      return spec ? { available: true, requiresApproval: spec.requiresApproval === true, risk: spec.risk || 'low' } : { available: false, requiresApproval: false };
    },
    async execute(plan, { approvedSteps = new Set(), approval = null, signal = null, retryPolicy = {}, executionPolicy = {}, [HOST_AUDIT_CAPTURE]: auditCapture = null } = {}) {
      const capture = (failure) => {
        if (auditCapture && typeof auditCapture === 'object') {
          try { auditCapture.failure = failure; } catch { /* Audit capture is optional. */ }
        }
      };
      const rejectApproval = (message, reason) => {
        capture({ status: 'blocked', reason, events: [{ type: 'approval.rejected', reason }] });
        return new ApprovalRejectedError(message, reason);
      };
      plan = snapshotJson(plan);
      validatePlan(plan);
      let approvalExpiresAt = null;
      if (approval !== null) {
        if (!approval || typeof approval.plan_id !== 'string' || !approval.plan_id.trim()
          || typeof approval.plan_fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(approval.plan_fingerprint)
          || !Array.isArray(approval.approvedSteps)) {
          throw rejectApproval('approval must contain plan_id, plan_fingerprint and approvedSteps.', 'malformed');
        }
        if (typeof plan.plan_id !== 'string' || !plan.plan_id.trim() || approval.plan_id !== plan.plan_id) throw rejectApproval('Approval plan_id does not match workflow plan.', 'plan_id_mismatch');
        if (approval.plan_fingerprint !== planFingerprint(plan)) {
          throw rejectApproval('Approval plan_fingerprint does not match workflow plan.', 'fingerprint_mismatch');
        }
        const stepIds = new Set(plan.steps.map((step) => step.id));
        if (approval.approvedSteps.some((id) => typeof id !== 'string' || !stepIds.has(id))) {
          throw rejectApproval('Approval references a step outside the plan.', 'unknown_step');
        }
        if (approval.expires_at !== undefined) {
          approvalExpiresAt = Date.parse(approval.expires_at);
          if (!Number.isFinite(approvalExpiresAt) || approvalExpiresAt <= Date.now()) {
            throw rejectApproval('Approval has expired.', 'expired');
          }
        }
        approvedSteps = [...approval.approvedSteps];
      }
      if (!approvedSteps || typeof approvedSteps === 'string' || typeof approvedSteps[Symbol.iterator] !== 'function') throw new Error('approvedSteps must be an iterable of step IDs.');
      const approvalSet = new Set(approvedSteps);
      if ([...approvalSet].some((id) => typeof id !== 'string' || !id.trim())) throw new Error('approvedSteps must contain non-empty step IDs.');
      if (signal && typeof signal.aborted !== 'boolean') throw new Error('signal must be an AbortSignal-like object.');
      const maxAttempts = retryPolicy.maxAttempts === undefined ? 0 : retryPolicy.maxAttempts;
      const retryableSkills = new Set(retryPolicy.retryableSkills || []);
      if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new Error('retryPolicy.maxAttempts must be a non-negative integer.');
      if (!Array.isArray(retryPolicy.retryableSkills || [])) throw new Error('retryPolicy.retryableSkills must be an array.');
      const maxSteps = executionPolicy.maxSteps === undefined ? Infinity : executionPolicy.maxSteps;
      const maxDurationMs = executionPolicy.maxDurationMs === undefined ? Infinity : executionPolicy.maxDurationMs;
      const maxOutputBytes = executionPolicy.maxOutputBytes === undefined ? Infinity : executionPolicy.maxOutputBytes;
      if (!(maxSteps === Infinity || (Number.isInteger(maxSteps) && maxSteps >= 0))) throw new Error('executionPolicy.maxSteps must be a non-negative integer.');
      if (!(maxDurationMs === Infinity || (Number.isFinite(maxDurationMs) && maxDurationMs >= 0))) throw new Error('executionPolicy.maxDurationMs must be a non-negative number.');
      if (!(maxOutputBytes === Infinity || (Number.isInteger(maxOutputBytes) && maxOutputBytes >= 0))) throw new Error('executionPolicy.maxOutputBytes must be a non-negative integer.');
      const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const outputs = Object.create(null);
      const startedAt = Date.now();
      const startedAtIso = now();
      const events = [];
      const stepMetrics = Object.create(null);
      const internalErrors = new WeakSet();
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
      const attachCapturedRun = (error, status) => {
        const details = { run_id: runId, events, status, metrics: metrics(status) };
        capture(details);
        return attachRun(error, runId, events, status, details.metrics);
      };
      const internalError = (error, status) => {
        internalErrors.add(error);
        return attachCapturedRun(error, status);
      };
      const cancel = () => internalError(new RunCancelledError(), 'cancelled');
      const budgetFail = (stepId, reason) => {
        stepMetrics[stepId] = stepMetrics[stepId] || { attempts: 0, status: 'budget_exceeded', duration_ms: 0 };
        stepMetrics[stepId].status = 'budget_exceeded';
        emit('run.budget_exceeded', { step_id: stepId, reason });
        return internalError(new RunBudgetError(`Execution budget exceeded: ${reason}`), 'budget_exceeded');
      };
      emit('run.queued');
      emit('run.started');
      if (approval !== null) emit('approval.accepted', { plan_id: approval.plan_id, approved_steps: approval.approvedSteps.length });
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
          throw attachCapturedRun(new Error(`Host skill unavailable: ${step.skill_id}`), 'failed');
        }
        if (spec.requiresApproval === true && !approvalSet.has(step.id)) {
          stepMetrics[step.id] = { attempts: 0, status: 'paused', duration_ms: 0 };
          emit('step.blocked', { step_id: step.id, reason: 'approval_required' });
          emit('run.paused', { reason: 'approval_required' });
          throw attachCapturedRun(new Error(`Approval required: ${step.id}`), 'paused');
        }
        if (spec.requiresApproval === true && approvalExpiresAt !== null && approvalExpiresAt <= Date.now()) {
          stepMetrics[step.id] = { attempts: 0, status: 'blocked', duration_ms: 0 };
          emit('step.blocked', { step_id: step.id, reason: 'approval_expired' });
          emit('run.blocked', { reason: 'approval_expired' });
          throw attachCapturedRun(new ApprovalRejectedError('Approval has expired.', 'expired'), 'blocked');
        }
        const attemptsAllowed = spec.risk === 'high' ? 0 : (retryableSkills.has(step.skill_id) ? maxAttempts : 0);
        let attempt = 0;
        let stepStartedAt = Date.now();
        stepMetrics[step.id] = { attempts: 0, status: 'running', duration_ms: 0, output_bytes: 0 };
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
            const outputBytes = serializedBytes(outputs[step.id]);
            stepMetrics[step.id].output_bytes = outputBytes;
            if (outputBytes > maxOutputBytes) {
              stepMetrics[step.id].status = 'budget_exceeded';
              emit('step.output_rejected', { step_id: step.id, attempt, output_bytes: outputBytes, max_output_bytes: maxOutputBytes });
              throw budgetFail(step.id, 'max_output_bytes');
            }
            stepMetrics[step.id].status = 'completed';
            stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
            emit('step.completed', { step_id: step.id, attempt });
            break;
          } catch (error) {
            if (internalErrors.has(error)) throw error;
            stepMetrics[step.id].duration_ms += Math.max(0, Date.now() - stepStartedAt);
            emit('step.failed', { step_id: step.id, attempt, reason: 'handler_error', error_type: safeErrorType(error) });
            if (attempt <= attemptsAllowed) {
              stepMetrics[step.id].status = 'retrying';
              emit('step.retrying', { step_id: step.id, attempt: attempt + 1, reason: 'handler_error' });
              continue;
            }
            stepMetrics[step.id].status = 'failed';
            emit('run.failed');
            throw attachCapturedRun(error, 'failed');
          }
        }
      }
      emit('run.completed');
      return { run_id: runId, status: 'completed', outputs: { ...outputs }, events, metrics: metrics('completed') };
    }
  };
}

module.exports = { createJRHHost, RunCancelledError, RunBudgetError, ApprovalRejectedError, serializedBytes, HOST_AUDIT_CAPTURE };
