'use strict';

const PROTOCOL_VERSION = '2026-07-28';

function createMcpClient({ transport, clientInfo = { name: 'JRHagents', version: '1.0.0' }, protocolVersion = PROTOCOL_VERSION, safeTools = [] } = {}) {
  if (!transport || typeof transport.request !== 'function') throw new Error('MCP adapter requires a transport.request function.');
  const safe = new Set(safeTools);
  let nextId = 0;

  const request = async (method, params = {}) => {
    const message = {
      jsonrpc: '2.0', id: ++nextId, method,
      params: {
        ...params,
        _meta: {
          'io.modelcontextprotocol/protocolVersion': protocolVersion,
          'io.modelcontextprotocol/clientInfo': clientInfo,
          'io.modelcontextprotocol/clientCapabilities': {}
        }
      }
    };
    const response = await transport.request(message);
    if (!response || response.jsonrpc !== '2.0' || response.id !== message.id) throw new Error('Invalid MCP JSON-RPC response.');
    if (response.error) throw new Error(response.error.message || 'MCP request failed.');
    return response.result;
  };

  return {
    async discover() { return request('server/discover'); },
    async listTools(cursor) { return request('tools/list', cursor ? { cursor } : {}); },
    async callTool(name, arguments_, { approved = false } = {}) {
      if (typeof name !== 'string' || !name.trim()) throw new Error('MCP tool name is required.');
      if (!safe.has(name) && !approved) throw new Error(`Approval required for MCP tool: ${name}`);
      return request('tools/call', { name, arguments: arguments_ || {} });
    },
    isSafeTool(name) { return safe.has(name); }
  };
}

module.exports = { PROTOCOL_VERSION, createMcpClient };
