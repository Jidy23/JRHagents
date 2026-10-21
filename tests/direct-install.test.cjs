const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const installer=require('../docs/assets/direct-install.js');
const page=fs.readFileSync(__dirname+'/../docs/index.html','utf8');
const app=fs.readFileSync(__dirname+'/../docs/assets/app.js','utf8');

test('seven AI coding clients get direct GitHub installs, no Python or ZIP',()=>{
 for(const client of ['codex','claude','gemini','cursor','copilot','opencode','windsurf']){
  const r=installer.get('windows',client,'skill','.','user');
  assert.equal(r.supported,true,client);
  assert.match(r.steps[0].command,/^npx skills add Jidy23\/JRHagents --skill jrhagents -a [\w-]+ -g$/);
  assert.doesNotMatch(r.steps[0].command,/\.zip|pip |venv/);
 }
});
test('project install never adds global flag',()=>{
 const r=installer.get('linux','cursor','skill','.', 'project');
 assert.ok(!r.steps[0].command.includes(' -g'));
 assert.equal(r.steps[0].where,'Terminal');
});
test('plugin uses Claude Code marketplace commands inside client',()=>{
 const r=installer.get('windows','claude','plugin');
 assert.equal(r.supported,true);
 assert.equal(r.steps[0].command,'/plugin marketplace add Jidy23/JRHagents');
 assert.equal(r.steps[1].command,'/plugin install jrhagents@jrhagents');
 assert.ok(r.steps.every(x=>x.where==='Claude Code'));
 assert.equal(installer.get('mac','cursor','plugin').supported,false);
});
test('MCP instructions separate runtime from skill',()=>{
 const r=installer.get('linux','cursor','mcp','/tmp/project');
 assert.equal(r.supported,true);
 assert.ok(r.steps.some(x=>x.command.includes('setup --mode mcp --client cursor')));
 assert.ok(r.steps.some(x=>x.command.includes('main.zip')));
 assert.ok(r.steps.every(x=>x.where==='Terminal'));
 assert.equal(installer.get('mac','opencode','mcp').supported,false);
});
test('invalid path, client, scope and OS rejected',()=>{
 assert.throws(()=>installer.get('windows','cursor','mcp','foo&bar'));
 assert.throws(()=>installer.get('linux','other','skill'));
 assert.throws(()=>installer.get('x','claude','plugin'));
 assert.throws(()=>installer.get('mac','claude','skill','.','unknown'));
});
test('website loads direct installer and dynamic task picker, defaults to skill',()=>{
 assert.match(page,/direct-install\.js/);
 assert.match(page,/id="installScope"/);
 assert.match(page,/id="exampleTask"/);
 assert.match(app,/globalThis\.JRHDirectInstall/);
 assert.match(app,/installScope/);
 assert.match(page,/npx skills add Jidy23\/JRHagents/);
 assert.doesNotMatch(page,/pip install jrhagents\b/);
});
