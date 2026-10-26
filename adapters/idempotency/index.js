'use strict';

function createIdempotencyStore({ maxKeys = 1000 } = {}) {
  if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error('maxKeys must be a positive integer.');
  const records = new Map();
  return {
    get(key) { return records.get(key) || null; },
    set(key, result) {
      if (typeof key !== 'string' || !key.trim()) throw new Error('Idempotency key is required.');
      records.delete(key);
      records.set(key, result);
      while (records.size > maxKeys) records.delete(records.keys().next().value);
      return result;
    },
    has(key) { return records.has(key); },
    clear() { records.clear(); },
    size() { return records.size; }
  };
}

function createIdempotentHost({ host, store } = {}) {
  if (!host || typeof host.execute !== 'function') throw new Error('Idempotent host requires an executable host.');
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function') {
    throw new Error('Idempotent host requires a get/set store.');
  }
  return {
    listSkills: (...args) => typeof host.listSkills === 'function' ? host.listSkills(...args) : [],
    statusFor: (...args) => typeof host.statusFor === 'function' ? host.statusFor(...args) : { available: false, requiresApproval: false },
    async execute(plan, options = {}) {
      const key = options.idempotencyKey;
      if (typeof key !== 'string' || !key.trim()) throw new Error('idempotencyKey is required.');
      const existing = await store.get(key);
      if (existing) return { ...existing, replayed: true };
      const result = await host.execute(plan, options);
      if (result && result.status === 'completed') await store.set(key, result);
      return result;
    }
  };
}

module.exports = { createIdempotencyStore, createIdempotentHost };
