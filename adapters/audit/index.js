'use strict';

const nodeFs = require('node:fs/promises');
const nodePath = require('node:path');

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
    list() {
      return enqueue(async () => {
        await load();
        return [...runs.values()].reverse();
      });
    },
    exportJson() {
      return enqueue(async () => {
        await load();
        return JSON.stringify([...runs.values()].reverse(), null, 2);
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
      try {
        const result = await host.execute(plan, options);
        await store.record(result);
        return result;
      } catch (error) {
        const runId = `failed_${Date.now().toString(36)}`;
        await store.record({ run_id: runId, status: 'failed', outputs: {}, events: [{ type: 'run.failed', error: error.message }] });
        throw error;
      }
    }
  };
}

module.exports = { createAuditStore, createFileAuditStore, createAuditedHost, sanitize };
