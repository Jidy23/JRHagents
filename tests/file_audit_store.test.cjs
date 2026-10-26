const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createFileAuditStore, createAuditedHost } = require('../adapters/audit');

test('file audit store persists redacted, bounded history across instances', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jrh-audit-'));
  const filePath = path.join(directory, 'runs.json');
  try {
    const first = createFileAuditStore({ filePath, maxRuns: 2, now: () => 'fixed-time' });
    await first.record({ run_id: 'r1', status: 'completed', outputs: { token: 'hidden' }, events: [] });
    await first.record({ run_id: 'r2', status: 'completed', outputs: {}, events: [] });
    await first.record({ run_id: 'r3', status: 'completed', outputs: {}, events: [] });
    const second = createFileAuditStore({ filePath });
    assert.equal((await second.get('r1')), null);
    assert.equal((await second.get('r3')).status, 'completed');
    assert.equal((await second.get('r2')).outputs.token, undefined);
    assert.equal((await second.get('r2')).recorded_at, 'fixed-time');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('file audit store fails closed on malformed persisted data', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jrh-audit-'));
  const filePath = path.join(directory, 'runs.json');
  try {
    await fs.writeFile(filePath, '{not-json}', 'utf8');
    const store = createFileAuditStore({ filePath });
    await assert.rejects(() => store.load(), /Unable to load audit file/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('audited host awaits persistence adapters', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'jrh-audit-'));
  const filePath = path.join(directory, 'runs.json');
  try {
    const store = createFileAuditStore({ filePath });
    const host = createAuditedHost({
      store,
      host: { execute: async () => ({ run_id: 'awaited', status: 'completed', outputs: {}, events: [] }) }
    });
    await host.execute({});
    assert.equal((await createFileAuditStore({ filePath }).get('awaited')).status, 'completed');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

