const assert = require('node:assert/strict');
const test = require('node:test');
const { createCloudflareAdapter } = require('../adapters/cloudflare');

function fakeFetch(calls, payload = { success: true, result: { ok: true } }) {
  return async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
  };
}

class FakeFormData {
  constructor() { this.values = []; }
  append(key, value) { this.values.push([key, value]); }
}

test('Cloudflare adapter exposes read skills and approval-gated mutations', () => {
  const adapter = createCloudflareAdapter({ token: 'cf_test_token_123', accountId: 'abc123456789' , fetchImpl: fakeFetch([]), formDataImpl: FakeFormData });
  assert.equal(adapter.skills['cloudflare.pages.projects.list'].requiresApproval, false);
  assert.equal(adapter.skills['cloudflare.pages.deployment.create'].requiresApproval, true);
  assert.equal(adapter.skills['cloudflare.pages.deployment.rollback'].risk, 'high');
});

test('Pages project read uses account and project path with bearer auth', async () => {
  const calls = [];
  const adapter = createCloudflareAdapter({ token: 'cf_test_token_123', accountId: 'abc123456789', fetchImpl: fakeFetch(calls), formDataImpl: FakeFormData });
  await adapter.handlers['cloudflare.pages.project.read']({ project: 'jrhagents' });
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/accounts/abc123456789/pages/jrhagents');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer cf_test_token_123');
});

test('deployment create is POST multipart and validates branch', async () => {
  const calls = [];
  const adapter = createCloudflareAdapter({ token: 'cf_test_token_123', accountId: 'abc123456789', fetchImpl: fakeFetch(calls), formDataImpl: FakeFormData });
  assert.throws(() => adapter.handlers['cloudflare.pages.deployment.create']({ project: 'jrhagents' }), /branch is required/);
  await adapter.handlers['cloudflare.pages.deployment.create']({ project: 'jrhagents', branch: 'main' });
  assert.equal(calls[0].url, 'https://api.cloudflare.com/client/v4/accounts/abc123456789/pages/projects/jrhagents/deployments');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(calls[0].options.body.values, [['branch', 'main']]);
});

test('adapter rejects missing token or invalid account', () => {
  assert.throws(() => createCloudflareAdapter({ accountId: 'abc123456789' }), /host-injected API token/);
  assert.throws(() => createCloudflareAdapter({ token: 'cf_test_token_123', accountId: 'bad' }), /valid accountId/);
});
