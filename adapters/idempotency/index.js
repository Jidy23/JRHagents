'use strict';

const nodeFs = require('node:fs/promises');
const nodePath = require('node:path');
const crypto = require('node:crypto');
// Capture data before the first await. Never execute or hash an accessor; a
// mutable caller-owned object must not change what an earlier hash describes.
function snapshot(value, { allowUndefined = false, allowInfinity = false } = {}, ancestors = new Set(), depth = 0) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (value === undefined && allowUndefined) return value;
  if (typeof value === 'number' && (Number.isFinite(value) || (allowInfinity && Math.abs(value) === Infinity))) return value;
  if (typeof value !== 'object' || depth > 128 || ancestors.has(value)) {
    throw new Error('Request or result must contain only acyclic JSON data.');
  }
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error('Request or result objects must be plain JSON objects.');
  }
  ancestors.add(value);
  const output = Array.isArray(value) ? [] : {};
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string') throw new Error('Request or result must not contain symbol keys.');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new Error('Request or result must contain only enumerable JSON data.');
    }
    if (Array.isArray(value) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      throw new Error('Request or result arrays must contain only indexed JSON data.');
    }
    Object.defineProperty(output, key, {
      value: snapshot(descriptor.value, { allowUndefined, allowInfinity }, ancestors, depth + 1),
      enumerable: true, writable: true, configurable: true
    });
  }
  if (Array.isArray(value) && Object.keys(output).length !== value.length) throw new Error('Request or result arrays must not contain holes.');
  ancestors.delete(value);
  return output;
}

function snapshotOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)
    || (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null)) {
    throw new Error('Execution options must be a plain object.');
  }
  const copy = {};
  for (const key of Reflect.ownKeys(options)) {
    if (typeof key !== 'string') throw new Error('Execution options must not contain symbol keys.');
    const descriptor = Object.getOwnPropertyDescriptor(options, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Execution options must contain only enumerable data.');
    let value = descriptor.value;
    // AbortSignal is intentionally live; changing it is how cancellation works.
    if (key === 'approvedSteps' && value != null) {
      if (typeof value === 'string' || typeof value[Symbol.iterator] !== 'function') throw new Error('approvedSteps must be an iterable of step IDs.');
      value = [...value];
    }
    if (key !== 'signal') value = snapshot(value, { allowUndefined: true, allowInfinity: true });
    Object.defineProperty(copy, key, { value, enumerable: true, writable: true, configurable: true });
  }
  return copy;
}

// Type-tagged canonical data prevents, for example, an Infinity policy from
// colliding with null and covers host-specific option fields as well.
function canonical(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `string:${JSON.stringify(value)}`;
  if (typeof value === 'boolean') return value ? 'bool:true' : 'bool:false';
  if (typeof value === 'number') return `number:${Object.is(value, -0) ? '-0' : String(value)}`;
  if (Array.isArray(value)) return `array:[${value.map(canonical).join(',')}]`;
  return `object:{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

function requestFingerprint(plan, options) {
  const relevant = {};
  for (const [key, value] of Object.entries(options)) {
    if (key === 'idempotencyKey' || key === 'signal') continue;
    Object.defineProperty(relevant, key, {
      value: key === 'approvedSteps' && Array.isArray(value) ? [...value].sort() : value,
      enumerable: true, writable: true, configurable: true
    });
  }
  return crypto.createHash('sha256').update(canonical({ plan, options: relevant })).digest('hex');
}

function validateTtl(ttlMs) {
  if (ttlMs !== undefined && (!Number.isInteger(ttlMs) || ttlMs < 1)) throw new Error('ttlMs must be a positive integer.');
}

function createIdempotencyStore({ maxKeys = 1000, ttlMs, now = () => Date.now() } = {}) {
  if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error('maxKeys must be a positive integer.');
  validateTtl(ttlMs);
  const records = new Map();
  const active = (key) => {
    const record = records.get(key);
    if (!record) return null;
    if (record.expires_at !== null && record.expires_at <= now()) {
      records.delete(key);
      return null;
    }
    return record.value;
  };
  return {
    get(key) { return active(key); },
    set(key, result) {
      if (typeof key !== 'string' || !key.trim()) throw new Error('Idempotency key is required.');
      records.delete(key);
      records.set(key, { value: result, expires_at: ttlMs === undefined ? null : now() + ttlMs });
      while (records.size > maxKeys) records.delete(records.keys().next().value);
      return result;
    },
    has(key) { return active(key) !== null; },
    clear() { records.clear(); },
    size() { return records.size; }
  };
}

function createFileIdempotencyStore({ filePath, maxKeys = 1000, ttlMs, now = () => Date.now(), fs = nodeFs } = {}) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('filePath is required.');
  if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error('maxKeys must be a positive integer.');
  validateTtl(ttlMs);
  if (!fs || typeof fs.readFile !== 'function' || typeof fs.writeFile !== 'function' || typeof fs.rename !== 'function') {
    throw new Error('File idempotency store requires readFile, writeFile, and rename.');
  }
  let records = new Map();
  let loaded = false;
  let queue = Promise.resolve();

  const load = async () => {
    if (loaded) return;
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
      if (!Array.isArray(parsed)) throw new Error('Idempotency file must contain an array.');
      records = new Map(parsed.filter((entry) => Array.isArray(entry) && typeof entry[0] === 'string').map(([key, value]) => [
        key,
        value && Object.prototype.hasOwnProperty.call(value, 'value') && Object.prototype.hasOwnProperty.call(value, 'expires_at')
          ? value
          : { value, expires_at: null }
      ]));
      while (records.size > maxKeys) records.delete(records.keys().next().value);
    } catch (error) {
      if (error && error.code === 'ENOENT') records = new Map();
      else throw new Error(`Unable to load idempotency file: ${error.message}`);
    }
    loaded = true;
  };

  const persist = async () => {
    const temporaryPath = nodePath.join(nodePath.dirname(filePath), `.${nodePath.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
    await fs.writeFile(temporaryPath, JSON.stringify([...records.entries()], null, 2), 'utf8');
    try {
      await fs.rename(temporaryPath, filePath);
    } catch (error) {
      if (typeof fs.unlink === 'function') await fs.unlink(temporaryPath).catch(() => {});
      throw new Error(`Unable to persist idempotency file: ${error.message}`);
    }
  };

  const enqueue = (operation) => {
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  };

  const active = (key) => {
    const record = records.get(key);
    if (!record) return null;
    if (record.expires_at !== null && record.expires_at <= now()) {
      records.delete(key);
      return null;
    }
    return record.value;
  };

  return {
    load: () => enqueue(load),
    get(key) {
      return enqueue(async () => {
        await load();
        const value = active(key);
        if (!value && !records.has(key)) await persist();
        return value;
      });
    },
    set(key, result) {
      return enqueue(async () => {
        await load();
        if (typeof key !== 'string' || !key.trim()) throw new Error('Idempotency key is required.');
        records.delete(key);
        records.set(key, { value: result, expires_at: ttlMs === undefined ? null : now() + ttlMs });
        while (records.size > maxKeys) records.delete(records.keys().next().value);
        await persist();
        return result;
      });
    },
    has(key) { return enqueue(async () => { await load(); return active(key) !== null; }); },
    size() { return enqueue(async () => { await load(); return records.size; }); },
    clear() { return enqueue(async () => { await load(); records.clear(); await persist(); }); }
  };
}

function createIdempotentHost({ host, store, namespace = null, maxOutstanding = 1000 } = {}) {
  if (!host || typeof host.execute !== 'function') throw new Error('Idempotent host requires an executable host.');
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('Idempotent host requires a get/set store.');
  }
  if (namespace !== null && (typeof namespace !== 'string' || !namespace.trim())) throw new Error('namespace must be a non-empty string.');
  if (!Number.isInteger(maxOutstanding) || maxOutstanding < 1) throw new Error('maxOutstanding must be a positive integer.');
  const inFlight = new Map();
  // Completed actions whose cache write failed are retained until the same
  // record is durably accepted by the configured store. Never rerun them in
  // this process merely because persistence failed.
  const pendingWrites = new Map();
  const scopedKey = (key) => namespace === null ? key : JSON.stringify([namespace, key]);
  const blockedResult = () => new Error('Completed action cannot be replayed: its non-JSON result was already executed.');
  const resultCopy = (result, replayed = false) => {
    if (!result || result.status !== 'completed') return replayed ? { ...result, replayed: true } : result;
    const copy = snapshot(result);
    if (replayed) copy.replayed = true;
    return copy;
  };
  return {
    listSkills: (...args) => typeof host.listSkills === 'function' ? host.listSkills(...args) : [],
    statusFor: (...args) => typeof host.statusFor === 'function' ? host.statusFor(...args) : { available: false, requiresApproval: false },
    async execute(plan, options = {}) {
      const planSnapshot = snapshot(plan);
      const executionOptions = snapshotOptions(options);
      const key = executionOptions.idempotencyKey;
      if (typeof key !== 'string' || !key.trim()) throw new Error('idempotencyKey is required.');
      const fingerprint = requestFingerprint(planSnapshot, executionOptions);
      const storageKey = scopedKey(key);
      const concurrent = inFlight.get(storageKey);
      if (concurrent) {
        if (concurrent.fingerprint !== fingerprint) throw new Error('Idempotency key reused for a different plan.');
        return resultCopy(await concurrent.promise, true);
      }
      const retained = pendingWrites.get(storageKey);
      if (retained && retained.fingerprint !== fingerprint) throw new Error('Idempotency key reused for a different plan.');
      if (!retained && inFlight.size + pendingWrites.size >= maxOutstanding) {
        throw new Error('Too many outstanding idempotent actions; resolve pending storage writes first.');
      }
      // Defer work to a microtask so the in-process lock exists even if an
      // injected store synchronously re-enters execute().
      const pending = Promise.resolve().then(async () => {
        if (retained) {
          await store.set(storageKey, snapshot(retained.record));
          pendingWrites.delete(storageKey);
          if (retained.record.blocked) throw blockedResult();
          return resultCopy(retained.record.result, true);
        }
        const stored = await store.get(storageKey);
        if (stored !== null && stored !== undefined) {
          const existing = snapshot(stored);
          if (existing.fingerprint !== fingerprint) throw new Error('Idempotency key reused for a different plan or legacy record.');
          if (existing.blocked === true) throw blockedResult();
          if (!existing.result || existing.result.status !== 'completed') throw new Error('Idempotency key reused for a different plan or legacy record.');
          return resultCopy(existing.result, true);
        }
        const result = await host.execute(planSnapshot, executionOptions);
        if (result && result.status === 'completed') {
          // Reserve the guard before validating or persisting the output: the
          // underlying operation has already happened at this point.
          const guard = { fingerprint, record: { fingerprint, blocked: true } };
          pendingWrites.set(storageKey, guard);
          let resultSnapshot;
          try {
            resultSnapshot = snapshot(result);
            guard.record = { fingerprint, result: resultSnapshot };
          } catch {
            // A tombstone allows a durable store to block reruns after restart.
            try {
              await store.set(storageKey, snapshot(guard.record));
              pendingWrites.delete(storageKey);
            } catch {
              // Retain the process-local guard when the tombstone cannot be saved.
            }
            throw new Error('Completed result must be JSON; replay is blocked because the action was already executed.');
          }
          await store.set(storageKey, snapshot(guard.record));
          pendingWrites.delete(storageKey);
          return resultSnapshot;
        }
        return result;
      });
      const active = { fingerprint, promise: pending };
      inFlight.set(storageKey, active);
      try {
        return resultCopy(await pending);
      } finally {
        if (inFlight.get(storageKey) === active) inFlight.delete(storageKey);
      }
    }
  };
}

module.exports = { createIdempotencyStore, createFileIdempotencyStore, createIdempotentHost };
