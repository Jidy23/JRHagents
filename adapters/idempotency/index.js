'use strict';

const nodeFs = require('node:fs/promises');
const nodePath = require('node:path');
const { planFingerprint } = require('../planner/fingerprint');

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

function createIdempotentHost({ host, store, namespace = null } = {}) {
  if (!host || typeof host.execute !== 'function') throw new Error('Idempotent host requires an executable host.');
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('Idempotent host requires a get/set store.');
  }
  if (namespace !== null && (typeof namespace !== 'string' || !namespace.trim())) throw new Error('namespace must be a non-empty string.');
  const inFlight = new Map();
  const scopedKey = (key) => namespace === null ? key : JSON.stringify([namespace, key]);
  return {
    listSkills: (...args) => typeof host.listSkills === 'function' ? host.listSkills(...args) : [],
    statusFor: (...args) => typeof host.statusFor === 'function' ? host.statusFor(...args) : { available: false, requiresApproval: false },
    async execute(plan, options = {}) {
      const key = options.idempotencyKey;
      if (typeof key !== 'string' || !key.trim()) throw new Error('idempotencyKey is required.');
      const fingerprint = planFingerprint(plan);
      const storageKey = scopedKey(key);
      const concurrent = inFlight.get(storageKey);
      if (concurrent) {
        if (concurrent.fingerprint !== fingerprint) throw new Error('Idempotency key reused for a different plan.');
        return { ...(await concurrent.promise), replayed: true };
      }
      const pending = (async () => {
        const existing = await store.get(storageKey);
        if (existing) {
          if (existing.fingerprint !== fingerprint || !existing.result) throw new Error('Idempotency key reused for a different plan or legacy record.');
          return { ...existing.result, replayed: true };
        }
        const result = await host.execute(plan, options);
        if (result && result.status === 'completed') await store.set(storageKey, { fingerprint, result });
        return result;
      })();
      const active = { fingerprint, promise: pending };
      inFlight.set(storageKey, active);
      try {
        return await pending;
      } finally {
        if (inFlight.get(storageKey) === active) inFlight.delete(storageKey);
      }
    }
  };
}

module.exports = { createIdempotencyStore, createFileIdempotencyStore, createIdempotentHost };
