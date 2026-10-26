const assert = require('node:assert/strict');
const test = require('node:test');
const { createSupabaseAdapter } = require('../adapters/supabase');

function fakeFetch(calls, payload = []) {
  return async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
  };
}

test('Supabase adapter exposes read-only select and approval-gated writes', () => {
  const adapter = createSupabaseAdapter({ url: 'https://demo.supabase.co', key: 'sb_test_key_123', allowedTables: ['tasks'], fetchImpl: fakeFetch([]) });
  assert.equal(adapter.skills['supabase.table.select'].requiresApproval, false);
  assert.equal(adapter.skills['supabase.table.insert'].requiresApproval, true);
  assert.equal(adapter.skills['supabase.table.update'].risk, 'high');
});

test('select uses the allowlist and bounded query', async () => {
  const calls = [];
  const adapter = createSupabaseAdapter({ url: 'https://demo.supabase.co', key: 'sb_test_key_123', allowedTables: ['tasks'], fetchImpl: fakeFetch(calls) });
  await adapter.handlers['supabase.table.select']({ table: 'tasks', columns: 'id,title', limit: 20, eq: { owner_id: 'u1' } });
  assert.match(calls[0].url, /^https:\/\/demo\.supabase\.co\/rest\/v1\/tasks\?/);
  assert.match(calls[0].url, /limit=20/);
  assert.equal(calls[0].options.headers.apikey, 'sb_test_key_123');
});

test('writes validate rows and require filters for update', async () => {
  const calls = [];
  const adapter = createSupabaseAdapter({ url: 'https://demo.supabase.co', key: 'sb_test_key_123', allowedTables: ['tasks'], fetchImpl: fakeFetch(calls) });
  assert.throws(() => adapter.handlers['supabase.table.insert']({ table: 'tasks', rows: [] }), /1 to 100/);
  assert.throws(() => adapter.handlers['supabase.table.update']({ table: 'tasks', values: { done: true } }), /at least one equality filter/);
  await adapter.handlers['supabase.table.update']({ table: 'tasks', values: { done: true }, eq: { id: 1 } });
  assert.equal(calls[0].options.method, 'PATCH');
});

test('rejects unallowlisted table and invalid credentials', () => {
  assert.throws(() => createSupabaseAdapter({ url: 'https://demo.supabase.co', key: 'sb_test_key_123', allowedTables: [] }), /non-empty table allowlist/);
  const adapter = createSupabaseAdapter({ url: 'https://demo.supabase.co', key: 'sb_test_key_123', allowedTables: ['tasks'], fetchImpl: fakeFetch([]) });
  assert.throws(() => adapter.handlers['supabase.table.select']({ table: 'users' }), /not allowlisted/);
});
