'use strict';

function createSupabaseAdapter({ url, key, allowedTables = [], fetchImpl = globalThis.fetch } = {}) {
  if (typeof url !== 'string' || !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)) throw new Error('Supabase adapter requires a valid project URL.');
  if (typeof key !== 'string' || key.trim().length < 10) throw new Error('Supabase adapter requires a host-injected key.');
  if (!Array.isArray(allowedTables) || allowedTables.length === 0) throw new Error('Supabase adapter requires a non-empty table allowlist.');
  if (typeof fetchImpl !== 'function') throw new Error('Supabase adapter requires fetchImpl.');

  const tables = new Set(allowedTables.filter((table) => typeof table === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)));
  if (tables.size !== allowedTables.length) throw new Error('allowedTables contains an invalid table name.');
  const baseUrl = url.replace(/\/$/, '');
  const tablePath = (input) => {
    const table = input && input.table;
    if (!tables.has(table)) throw new Error(`Table is not allowlisted: ${table}`);
    return encodeURIComponent(table);
  };
  const filters = (input) => {
    const values = input && input.eq;
    if (values === undefined) return '';
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('eq filters must be an object.');
    return Object.entries(values).map(([column, value]) => {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) throw new Error(`Invalid filter column: ${column}`);
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new Error(`Invalid filter value: ${column}`);
      return `${encodeURIComponent(column)}=eq.${encodeURIComponent(String(value))}`;
    }).join('&');
  };
  const request = async (method, path, body, extraHeaders = {}) => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json', ...extraHeaders, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const text = await response.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }
    if (!response.ok) throw new Error(data?.message || data?.hint || `Supabase request failed (${response.status})`);
    return data;
  };
  const selectQuery = (input) => {
    const columns = input?.columns || '*';
    if (typeof columns !== 'string' || !/^[a-zA-Z0-9_,* ]+$/.test(columns)) throw new Error('columns must be a simple column list.');
    const limit = input?.limit === undefined ? 100 : input.limit;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('limit must be an integer between 1 and 1000.');
    return `?select=${encodeURIComponent(columns)}&limit=${limit}${filters(input) ? `&${filters(input)}` : ''}`;
  };

  return {
    skills: {
      'supabase.table.select': { id: 'supabase.table.select', description: 'Read allowlisted table rows', risk: 'low', requiresApproval: false },
      'supabase.table.insert': { id: 'supabase.table.insert', description: 'Insert rows into an allowlisted table', risk: 'high', requiresApproval: true },
      'supabase.table.update': { id: 'supabase.table.update', description: 'Update filtered rows in an allowlisted table', risk: 'high', requiresApproval: true }
    },
    handlers: {
      'supabase.table.select': (input) => request('GET', `/rest/v1/${tablePath(input)}${selectQuery(input)}`),
      'supabase.table.insert': (input) => {
        if (!Array.isArray(input?.rows) || input.rows.length === 0 || input.rows.length > 100) throw new Error('rows must contain 1 to 100 records.');
        return request('POST', `/rest/v1/${tablePath(input)}`, input.rows, { Prefer: 'return=representation' });
      },
      'supabase.table.update': (input) => {
        if (!input?.values || typeof input.values !== 'object' || Array.isArray(input.values)) throw new Error('values must be an object.');
        const where = filters(input);
        if (!where) throw new Error('update requires at least one equality filter.');
        return request('PATCH', `/rest/v1/${tablePath(input)}?${where}`, input.values, { Prefer: 'return=representation' });
      }
    }
  };
}

module.exports = { createSupabaseAdapter };
