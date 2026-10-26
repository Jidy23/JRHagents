'use strict';

const SENSITIVE_KEY = /(token|secret|password|authorization|api[_-]?key|private[_-]?key)/i;

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
    list() { return [...runs.values()].reverse(); },
    exportJson() { return JSON.stringify(this.list(), null, 2); },
    clear() { runs.clear(); }
  };
}

function createAuditedHost({ host, store } = {}) {
  if (!host || typeof host.execute !== 'function') throw new Error('Audited host requires an executable host.');
  if (!store || typeof store.record !== 'function') throw new Error('Audited host requires an audit store.');
  return {
    listSkills: (...args) => typeof host.listSkills === 'function' ? host.listSkills(...args) : [],
    statusFor: (...args) => typeof host.statusFor === 'function' ? host.statusFor(...args) : { available: false, requiresApproval: false },
    async execute(plan, options) {
      try {
        const result = await host.execute(plan, options);
        store.record(result);
        return result;
      } catch (error) {
        const runId = `failed_${Date.now().toString(36)}`;
        store.record({ run_id: runId, status: 'failed', outputs: {}, events: [{ type: 'run.failed', error: error.message }] });
        throw error;
      }
    }
  };
}

module.exports = { createAuditStore, createAuditedHost, sanitize };
