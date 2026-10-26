const assert = require('node:assert/strict');
const test = require('node:test');
const { PROTOCOL_VERSION, createMcpClient } = require('../adapters/mcp');

function fakeTransport(calls) {
  return { request: async (message) => {
    calls.push(message);
    if (message.method === 'tools/list') return { jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'safe.read' }] } };
    return { jsonrpc: '2.0', id: message.id, result: { ok: true } };
  } };
}

test('MCP client sends JSON-RPC metadata and unique IDs', async () => {
  const calls = [];
  const client = createMcpClient({ transport: fakeTransport(calls), safeTools: ['safe.read'] });
  await client.discover();
  await client.listTools();
  assert.equal(calls[0].jsonrpc, '2.0');
  assert.equal(calls[0].params._meta['io.modelcontextprotocol/protocolVersion'], PROTOCOL_VERSION);
  assert.notEqual(calls[0].id, calls[1].id);
});

test('MCP tool calls require explicit approval unless allowlisted safe', async () => {
  const calls = [];
  const client = createMcpClient({ transport: fakeTransport(calls), safeTools: ['safe.read'] });
  await client.callTool('safe.read', { query: 'x' });
  await assert.rejects(() => client.callTool('dangerous.write', {}), /Approval required/);
  await client.callTool('dangerous.write', {}, { approved: true });
  assert.equal(calls.at(-1).method, 'tools/call');
});

test('invalid MCP responses and transport are rejected', async () => {
  assert.throws(() => createMcpClient({}), /transport/);
  const bad = createMcpClient({ transport: { request: async () => ({ jsonrpc: '2.0', id: 99, result: {} }) } });
  await assert.rejects(() => bad.discover(), /Invalid MCP JSON-RPC response/);
});
