'use strict';

const API_VERSION = '2022-11-02';

function createCloudflareAdapter({ token, accountId, fetchImpl = globalThis.fetch, apiBase = 'https://api.cloudflare.com/client/v4', formDataImpl = globalThis.FormData } = {}) {
  if (typeof token !== 'string' || token.trim().length < 10) throw new Error('Cloudflare adapter requires a host-injected API token.');
  if (typeof accountId !== 'string' || !/^[a-zA-Z0-9_-]{6,32}$/.test(accountId)) throw new Error('Cloudflare adapter requires a valid accountId.');
  if (typeof fetchImpl !== 'function') throw new Error('Cloudflare adapter requires fetchImpl.');

  const projectPath = (input) => {
    const project = input && input.project;
    if (typeof project !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(project)) throw new Error('project must contain lowercase letters, digits, and hyphens.');
    return encodeURIComponent(project);
  };
  const deploymentPath = (input) => {
    const id = input && input.deployment;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('deployment must be a valid deployment ID.');
    return encodeURIComponent(id);
  };

  const request = async (method, path, body, isForm = false) => {
    const headers = { Authorization: `Bearer ${token}` };
    if (!isForm) headers['Content-Type'] = 'application/json';
    const response = await fetchImpl(`${apiBase}${path}`, { method, headers, ...(body === undefined ? {} : { body: isForm ? body : JSON.stringify(body) }) });
    const text = await response.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }
    if (!response.ok || (data && data.success === false)) {
      const message = data?.errors?.[0]?.message || `Cloudflare request failed (${response.status})`;
      throw new Error(message);
    }
    return data;
  };
  const pages = `/accounts/${accountId}/pages`;
  const accountPath = pages.slice(0, pages.indexOf('/pages'));

  const read = (method, suffix) => (input) => request(method, `${pages}${suffix(input || {})}`);

  return {
    skills: {
      'cloudflare.account.read': { id: 'cloudflare.account.read', description: 'Read Cloudflare account metadata', risk: 'low', requiresApproval: false },
      'cloudflare.pages.projects.list': { id: 'cloudflare.pages.projects.list', description: 'List Pages projects', risk: 'low', requiresApproval: false },
      'cloudflare.pages.project.read': { id: 'cloudflare.pages.project.read', description: 'Read a Pages project', risk: 'low', requiresApproval: false },
      'cloudflare.pages.deployments.list': { id: 'cloudflare.pages.deployments.list', description: 'List Pages deployments', risk: 'low', requiresApproval: false },
      'cloudflare.pages.deployment.create': { id: 'cloudflare.pages.deployment.create', description: 'Create a Pages deployment', risk: 'high', requiresApproval: true },
      'cloudflare.pages.deployment.retry': { id: 'cloudflare.pages.deployment.retry', description: 'Retry a Pages deployment', risk: 'high', requiresApproval: true },
      'cloudflare.pages.deployment.rollback': { id: 'cloudflare.pages.deployment.rollback', description: 'Roll back a Pages deployment', risk: 'high', requiresApproval: true }
    },
    handlers: {
      'cloudflare.account.read': () => request('GET', `/accounts/${accountId}`),
      'cloudflare.pages.projects.list': read('GET', () => ''),
      'cloudflare.pages.project.read': read('GET', (input) => `/${projectPath(input)}`),
      'cloudflare.pages.deployments.list': read('GET', (input) => `/${projectPath(input)}/deployments`),
      'cloudflare.pages.deployment.create': (input) => {
        if (!input || typeof input.branch !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(input.branch)) throw new Error('branch is required and must be a valid branch name.');
        if (typeof formDataImpl !== 'function') throw new Error('Cloudflare deployment requires FormData in the host.');
        const form = new formDataImpl();
        form.append('branch', input.branch);
        if (typeof input.commit_hash === 'string') form.append('commit_hash', input.commit_hash);
        if (typeof input.commit_message === 'string') form.append('commit_message', input.commit_message);
        return request('POST', `${accountPath}/pages/projects/${projectPath(input)}/deployments`, form, true);
      },
      'cloudflare.pages.deployment.retry': (input) => request('POST', `${accountPath}/pages/projects/${projectPath(input)}/deployments/${deploymentPath(input)}/retry`),
      'cloudflare.pages.deployment.rollback': (input) => request('POST', `${accountPath}/pages/projects/${projectPath(input)}/deployments/${deploymentPath(input)}/rollback`)
    }
  };
}

module.exports = { API_VERSION, createCloudflareAdapter };
