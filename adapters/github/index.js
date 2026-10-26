'use strict';

const API_VERSION = '2022-11-28';

function createGitHubAdapter({ token, fetchImpl = globalThis.fetch, apiBase = 'https://api.github.com' } = {}) {
  if (typeof token !== 'string' || token.trim().length < 10) {
    throw new Error('GitHub adapter requires a host-injected token.');
  }
  if (typeof fetchImpl !== 'function') throw new Error('GitHub adapter requires fetchImpl.');

  const request = async (method, path, body) => {
    const response = await fetchImpl(`${apiBase}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': API_VERSION,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }
    if (!response.ok) {
      const message = data && data.message ? data.message : `GitHub request failed (${response.status})`;
      throw new Error(message);
    }
    return data;
  };

  const repositoryPath = (input) => {
    if (!input || typeof input.repository !== 'string' || !/^[^/\s]+\/[^/\s]+$/.test(input.repository)) {
      throw new Error('repository must use the owner/name format.');
    }
    return encodeURIComponent(input.repository).replace('%2F', '/');
  };

  return {
    skills: {
      'github.repo.read': { id: 'github.repo.read', description: 'Read repository metadata', risk: 'low', requiresApproval: false },
      'github.pr.list': { id: 'github.pr.list', description: 'List pull requests', risk: 'low', requiresApproval: false },
      'github.pr.merge': { id: 'github.pr.merge', description: 'Merge an approved pull request', risk: 'high', requiresApproval: true }
    },
    handlers: {
      'github.repo.read': (input) => request('GET', `/repos/${repositoryPath(input)}`),
      'github.pr.list': (input) => request('GET', `/repos/${repositoryPath(input)}/pulls?state=${input && input.state === 'closed' ? 'closed' : 'open'}`),
      'github.pr.merge': (input) => {
        if (!input || !Number.isInteger(input.pull_request) || input.pull_request < 1) {
          throw new Error('pull_request must be a positive integer.');
        }
        const method = input.merge_method || 'squash';
        if (!['merge', 'squash', 'rebase'].includes(method)) throw new Error('Unsupported merge_method.');
        return request('PUT', `/repos/${repositoryPath(input)}/pulls/${input.pull_request}/merge`, {
          merge_method: method,
          ...(typeof input.commit_title === 'string' ? { commit_title: input.commit_title } : {}),
          ...(typeof input.commit_message === 'string' ? { commit_message: input.commit_message } : {})
        });
      }
    }
  };
}

module.exports = { API_VERSION, createGitHubAdapter };
