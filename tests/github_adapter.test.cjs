const assert = require('node:assert/strict');
const test = require('node:test');
const { API_VERSION, createGitHubAdapter } = require('../adapters/github');

function fakeFetch(calls, payload = { ok: true }) {
  return async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
  };
}

test('GitHub adapter exposes safe reads and an approval-marked merge skill', () => {
  const adapter = createGitHubAdapter({ token: 'ghp_test_token_123', fetchImpl: fakeFetch([]) });
  assert.equal(adapter.skills['github.repo.read'].requiresApproval, false);
  assert.equal(adapter.skills['github.pr.merge'].requiresApproval, true);
  assert.equal(adapter.skills['github.pr.merge'].risk, 'high');
});

test('repository read sends token server-side and uses GitHub API headers', async () => {
  const calls = [];
  const adapter = createGitHubAdapter({ token: 'ghp_test_token_123', fetchImpl: fakeFetch(calls) });
  await adapter.handlers['github.repo.read']({ repository: 'Jidy23/JRHagents' });
  assert.equal(calls[0].url, 'https://api.github.com/repos/Jidy23/JRHagents');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer ghp_test_token_123');
  assert.equal(calls[0].options.headers['X-GitHub-Api-Version'], API_VERSION);
});

test('merge validates input and uses PUT without executing in tests', async () => {
  const calls = [];
  const adapter = createGitHubAdapter({ token: 'ghp_test_token_123', fetchImpl: fakeFetch(calls, { merged: true }) });
  assert.throws(() => adapter.handlers['github.pr.merge']({ repository: 'Jidy23/JRHagents' }), /positive integer/);
  await adapter.handlers['github.pr.merge']({ repository: 'Jidy23/JRHagents', pull_request: 17 });
  assert.equal(calls[0].options.method, 'PUT');
  assert.deepEqual(JSON.parse(calls[0].options.body), { merge_method: 'squash' });
});

test('adapter rejects missing or weak token', () => {
  assert.throws(() => createGitHubAdapter({}), /requires a host-injected token/);
  assert.throws(() => createGitHubAdapter({ token: 'short' }), /requires a host-injected token/);
});
