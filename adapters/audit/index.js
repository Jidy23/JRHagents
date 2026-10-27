'use strict';

const nodeFs = require('node:fs/promises');
const nodePath = require('node:path');
const { HOST_AUDIT_CAPTURE } = require('../host');

const SENSITIVE_KEY = /(token|secret|password|authorization|api[_-]?key|private[_-]?key)/i;
const FAILURE_STATUSES = new Set(['failed', 'blocked', 'paused', 'cancelled', 'budget_exceeded']);
const APPROVAL_REASONS = new Set(['malformed', 'plan_id_mismatch', 'fingerprint_mismatch', 'expired', 'unknown_step']);
const EVENT_REASONS = new Set([
  'handler_error', 'skill_unavailable', 'approval_required', 'approval_expired',
  'signal_aborted', 'max_steps', 'max_duration_ms', 'max_output_bytes', ...APPROVAL_REASONS
]);
const ERROR_TYPES = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'NonError']);
const EVENT_TYPES = new Set([
  'run.queued', 'run.started', 'run.failed', 'run.paused',
  'run.blocked', 'run.cancelled', 'run.budget_exceeded', 'run.events_truncated',
  'approval.accepted', 'approval.rejected', 'step.started', 'step.completed',
  'step.failed', 'step.blocked', 'step.retrying', 'step.output_rejected'
]);

// An error can be null, frozen, or contain attacker-controlled getters and
// strings. Only inspect own data properties, then copy an explicit allowlist.
function ownData(value, key) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value') ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

function safeFailureEvents(rawEvents, fallbackReason, context) {
  const fallback = () => [{ type: fallbackReason === 'handler_error' ? 'run.failed' : 'approval.rejected', reason: fallbackReason }];
  if (!Array.isArray(rawEvents)) return fallback();
  try {
    const selected = rawEvents.length > 1024
      ? [...rawEvents.slice(0, 512), { type: 'run.events_truncated' }, ...rawEvents.slice(-511)]
      : rawEvents;
    const safe = [];
    for (const event of selected) {
      const type = ownData(event, 'type');
      if (!EVENT_TYPES.has(type)) continue;
      const item = { type };
      for (const key of ['run_id', 'step_id', 'skill_id', 'plan_id']) {
        const value = ownData(event, key);
        const matches = key === 'run_id' ? value === context.runId
          : key === 'step_id' ? context.stepIds.has(value)
            : key === 'skill_id' ? context.skillIds.has(value) : value === context.planId;
        if (matches && typeof value === 'string' && value.length <= 256 && !/[\x00-\x1f\x7f]/.test(value)) item[key] = value;
      }
      const at = ownData(event, 'at');
      if (typeof at === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(at)) item.at = at;
      for (const key of ['attempt', 'approved_steps', 'output_bytes', 'max_output_bytes']) {
        const value = ownData(event, key);
        if (Number.isSafeInteger(value) && value >= 0) item[key] = value;
      }
      const reason = ownData(event, 'reason');
      if (EVENT_REASONS.has(reason)) item.reason = reason;
      const errorType = ownData(event, 'error_type');
      if (ERROR_TYPES.has(errorType)) item.error_type = errorType;
      safe.push(item);
    }
    return safe.length ? safe : fallback();
  } catch {
    return fallback();
  }
}

function sanitize(value, depth = 0) {
  if (depth > 8) return '[depth-limited]';
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'undefined') return null;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const output = {};
    for (const [key, item] of Object.entries(value)) output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : sanitize(item, depth + 1);
    return output;
  }
  return `[${typeof value}]`;
}

function selectRuns(runs, { status, since, limit } = {}) {
  if (status !== undefined && typeof status !== 'string') throw new Error('status filter must be a string.');
  if (since !== undefined && typeof since !== 'string') throw new Error('since filter must be an ISO string.');
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new Error('limit must be a positive integer.');
  const selected = runs.filter((run) => {
    if (status && run.status !== status) return false;
    if (since && typeof run.recorded_at === 'string' && run.recorded_at < since) return false;
    return true;
  });
  return limit ? selected.slice(0, limit) : selected;
}

function summarizeRuns(runs) {
  const byStatus = {};
  let totalDurationMs = 0;
  let measuredRuns = 0;
  for (const run of runs) {
    byStatus[run.status || 'unknown'] = (byStatus[run.status || 'unknown'] || 0) + 1;
    const duration = run.metrics && run.metrics.duration_ms;
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      totalDurationMs += duration;
      measuredRuns += 1;
    }
  }
  return {
    total: runs.length,
    by_status: byStatus,
    total_duration_ms: totalDurationMs,
    average_duration_ms: measuredRuns ? totalDurationMs / measuredRuns : 0
  };
}

function createAuditStore({ maxRuns = 500, now = () => new Date().toISOString() } = {}) {
  if (!Number.isInteger(maxRuns) || maxRuns < 1) throw new Error('maxRuns must be a positive integer.');
  const runs = new Map();
  const record = (run) => {
    if (!run || typeof run.run_id !== 'string' || !run.run_id) throw new Error('Audit record requires run_id.');
    const entry = sanitize({ ...run, recorded_at: now() });
    runs.delete(run.run_id);
    runs.set(run.run_id, entry);
    while (runs.size > maxRuns) runs.delete(runs.keys().next().value);
    return entry;
  };
  return {
    record,
    get(runId) { return runs.get(runId) || null; },
    list(options = {}) { return selectRuns([...runs.values()].reverse(), options); },
    stats() { return summarizeRuns([...runs.values()]); },
    exportJson(options = {}) { return JSON.stringify(this.list(options), null, 2); },
    clear() { runs.clear(); }
  };
}

function createFileAuditStore({ filePath, maxRuns = 500, now = () => new Date().toISOString(), fs = nodeFs } = {}) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('filePath is required.');
  if (!Number.isInteger(maxRuns) || maxRuns < 1) throw new Error('maxRuns must be a positive integer.');
  if (!fs || typeof fs.readFile !== 'function' || typeof fs.writeFile !== 'function' || typeof fs.rename !== 'function') {
    throw new Error('File audit store requires readFile, writeFile, and rename.');
  }

  let runs = new Map();
  let loaded = false;
  let queue = Promise.resolve();

  const load = async () => {
    if (loaded) return;
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Audit file must contain a JSON array.');
      runs = new Map();
      for (const item of parsed) {
        if (item && typeof item.run_id === 'string' && item.run_id) runs.set(item.run_id, sanitize(item));
      }
      while (runs.size > maxRuns) runs.delete(runs.keys().next().value);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        runs = new Map();
      } else {
        throw new Error(`Unable to load audit file: ${error.message}`);
      }
    }
    loaded = true;
  };

  const persist = async () => {
    const directory = nodePath.dirname(filePath);
    const temporaryPath = nodePath.join(directory, `.${nodePath.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
    await fs.writeFile(temporaryPath, JSON.stringify([...runs.values()], null, 2), 'utf8');
    try {
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      if (typeof fs.unlink === 'function') await fs.unlink(temporaryPath).catch(() => {});
      throw new Error(`Unable to persist audit file: ${error.message}`);
    }
  };

  const enqueue = (operation) => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  };

  return {
    load: () => enqueue(load),
    record(run) {
      return enqueue(async () => {
        await load();
        if (!run || typeof run.run_id !== 'string' || !run.run_id) throw new Error('Audit record requires run_id.');
        const entry = sanitize({ ...run, recorded_at: now() });
        runs.delete(run.run_id);
        runs.set(run.run_id, entry);
        while (runs.size > maxRuns) runs.delete(runs.keys().next().value);
        await persist();
        return entry;
      });
    },
    get(runId) {
      return enqueue(async () => {
        await load();
        return runs.get(runId) || null;
      });
    },
    list(options = {}) {
      return enqueue(async () => {
        await load();
        return selectRuns([...runs.values()].reverse(), options);
      });
    },
    stats() {
      return enqueue(async () => {
        await load();
        return summarizeRuns([...runs.values()]);
      });
    },
    exportJson(options = {}) {
      return enqueue(async () => {
        await load();
        return JSON.stringify(selectRuns([...runs.values()].reverse(), options), null, 2);
      });
    },
    clear() {
      return enqueue(async () => {
        await load();
        runs.clear();
        await persist();
      });
    }
  };
}

function createAuditedHost({ host, store } = {}) {
  if (!host || typeof host.execute !== 'function') throw new Error('Audited host requires an executable host.');
  if (!store || typeof store.record !== 'function') throw new Error('Audited host requires an audit store.');
  return {
    listSkills: (...args) => typeof host.listSkills === 'function' ? host.listSkills(...args) : [],
    statusFor: (...args) => typeof host.statusFor === 'function' ? host.statusFor(...args) : { available: false, requiresApproval: false },
    async execute(plan, options) {
      const stepIds = new Set();
      const skillIds = new Set();
      const rawSteps = ownData(plan, 'steps');
      if (Array.isArray(rawSteps)) {
        try {
          for (const step of rawSteps) {
            if (typeof ownData(step, 'id') === 'string') stepIds.add(ownData(step, 'id'));
            if (typeof ownData(step, 'skill_id') === 'string') skillIds.add(ownData(step, 'skill_id'));
          }
        } catch { /* Preserve execution even if a non-standard plan cannot be inspected. */ }
      }
      const planId = ownData(plan, 'plan_id');
      const capture = Object.create(null);
      let result;
      try {
        const hostOptions = host[HOST_AUDIT_CAPTURE] === true
          ? { ...(options || {}), [HOST_AUDIT_CAPTURE]: capture }
          : options;
        result = await host.execute(plan, hostOptions);
      } catch (error) {
        const failure = ownData(capture, 'failure');
        const candidateId = ownData(failure, 'run_id');
        const runId = typeof candidateId === 'string' && /^run_[a-z0-9]{1,12}_[a-z0-9]{1,6}$/i.test(candidateId)
          ? candidateId : `failed_${Date.now().toString(36)}`;
        const rawReason = ownData(failure, 'reason');
        const reason = APPROVAL_REASONS.has(rawReason) ? rawReason : 'handler_error';
        const rawStatus = ownData(failure, 'status');
        const status = FAILURE_STATUSES.has(rawStatus) ? rawStatus : 'failed';
        const events = safeFailureEvents(ownData(failure, 'events'), reason, { runId, stepIds, skillIds, planId });
        try {
          await store.record({ run_id: runId, status, outputs: {}, events });
        } catch {
          // Do not replace the handler's original exception with an audit-store
          // exception; expose a controlled flag when the value is extensible.
          if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
            try { error.audit_record_failed = true; } catch { /* immutable original */ }
          }
        }
        throw error;
      }
      await store.record(result);
      return result;
    }
  };
}

module.exports = { createAuditStore, createFileAuditStore, createAuditedHost, sanitize, selectRuns, summarizeRuns };
