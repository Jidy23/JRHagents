'use strict';

const nodeFs = require('node:fs/promises');
const nodePath = require('node:path');

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

function createFileIdempotencyStore({ filePath, maxKeys = 1000, fs = nodeFs } = {}) {
  if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('filePath is required.');
  if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error('maxKeys must be a positive integer.');
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
      records = new Map(parsed.filter((entry) => Array.isArray(entry) && typeof entry[0] === 'string'));
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

  return {
    load: () => enqueue(load),
    get(key) { return enqueue(async () => { await load(); return records.get(key) || null; }); },
    set(key, result) {
      return enqueue(async () => {
        await load();
        if (typeof key !== 'string' || !key.trim()) throw new Error('Idempotency key is required.');
        records.delete(key);
        records.set(key, result);
        while (records.size > maxKeys) records.delete(records.keys().next().value);
        await persist();
        return result;
      });
    },
    has(key) { return enqueue(async () => { await load(); return records.has(key); }); },
    size() { return enqueue(async () => { await load(); return records.size; }); },
    clear() { return enqueue(async () => { await load(); records.clear(); await persist(); }); }
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

module.exports = { createIdempotencyStore, createFileIdempotencyStore, createIdempotentHost };
