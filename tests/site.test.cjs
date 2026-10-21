const {test} = require('node:test');
const assert = require('node:assert/strict');
const model = require('../docs/assets/site-model.js');

test('26 feature entries have unique IDs and real categories',()=>{
 assert.equal(model.features.length,26);
 assert.equal(new Set(model.features.map(x=>x.id)).size,26);
 assert.ok(model.features.every(f=>model.categories.includes(f.category)));
});
test('search matches Indonesian description and category',()=>{
 assert.ok(model.filterFeatures('kredensial','All').some(f=>f.id===20));
 assert.ok(model.filterFeatures('','Design').length>=3);
 assert.equal(model.filterFeatures('something-unfindable','All').length,0);
});
test('installer supports three clients and three operating systems',()=>{
 for (const client of ['claude','codex','gemini']) for(const os of ['linux','mac','windows']) {
   const value=model.installCommand(client,os,'.','project');
   assert.ok(value.includes(`--client ${client}`));
   assert.ok(value.includes('--scope project'));
 }
});
test('system paths use safe shell quoting',()=>{
 assert.equal(model.installCommand('codex','linux',"a'b",'project').includes("'a'\\''b'"),true);
 assert.equal(model.installCommand('codex','windows','C:\\My Project','project').includes('"C:\\My Project"'),true);
 assert.throws(()=>model.installCommand('codex','windows','p&n','project'));
 assert.throws(()=>model.installCommand('codex','mac','hello\nworld','project'));
});
test('user scope omits project path',()=>{
 assert.ok(model.installCommand('gemini','linux','.','user').includes('--scope user'));
 assert.ok(!model.installCommand('gemini','linux','.','user').includes('--project'));
});
test('unrecognized clients rejected',()=>{
 assert.throws(()=>model.installCommand('invented','linux','.','project'));
});
test('HTML escaping blocks injected tags in UI content',()=>{
 assert.equal(model.escapeHtml('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
});
test('tasks provide real copyable prompts',()=>{
 assert.ok(Object.keys(model.tasks).length>=5);
 assert.ok(Object.values(model.tasks).every(x=>x.prompt.startsWith('JRHagents,')));
});

test('MCP command builder uses real command and scoped paths',()=>{
  const cmd=model.installCommand('claude','linux','/tmp/project','project','mcp');
  assert.ok(cmd.includes('mcp-config --client claude'));
  assert.ok(cmd.includes('/tmp/project'));
  assert.ok(model.installCommand('gemini','windows','C:\\proj','project','mcp').includes('--client generic'));
});
test('plugin mode shows source location without pretending install happened',()=>{
  assert.equal(model.installCommand('copilot','linux','.','project','plugin'),'https://github.com/Jidy23/JRHagents');
});
