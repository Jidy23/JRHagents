const {test}=require('node:test');const assert=require('node:assert/strict');
const audit=require('../docs/assets/browser-audit.js');const install=require('../docs/assets/site-model-v19.js');
function f(name,content){return {name,size:content.length,text:async()=>content};}
test('browser analyzer finds real issues with line numbers',async()=>{
 const r=await audit.auditFiles([f('index.html','<a href="#">A</a>\n<!-- TODO fix -->')]);
 assert.equal(r.filesScanned,1);assert.ok(r.findings.some(x=>x.id==='placeholder'&&x.line===1));assert.ok(r.findings.some(x=>x.id==='todo'&&x.line===2));
});
test('no source or secret values leaked to report',async()=>{
 const secret='ghp_'+'A'.repeat(38);const r=await audit.auditFiles([f('server.js','const token="'+secret+'"')]);
 assert.ok(r.findings.some(x=>x.id==='possible-secret'));assert.ok(!JSON.stringify(r).includes(secret));
});
test('dotenv ignored and reported without being read',async()=>{
 let reads=0;const r=await audit.auditFiles([{name:'.env',size:50,text:async()=>{reads++;return 'secret';}}]);
 assert.equal(reads,0);assert.ok(r.findings.some(x=>x.id==='env-file'));
});
test('reject binaries large files and dependencies',async()=>{
 const r=await audit.auditFiles([f('x.png','no'),f('node_modules/a.js','no'),{name:'too-big.js',size:900000,text:async()=>{throw Error('must not read')}}]);
 assert.equal(r.filesScanned,0);assert.equal(r.filesSkipped,3);
});
test('stack detection from real package.json',async()=>{
 const r=await audit.auditFiles([f('package.json','{"dependencies":{"react":"18","next":"14"},"devDependencies":{"vite":"5"}}')]);
 assert.ok(r.stack.includes('React'));assert.ok(r.stack.includes('Next.js'));assert.ok(r.stack.includes('Vite'));
});
test('example yields findings',async()=>{const r=await audit.auditFiles(audit.exampleFiles);assert.ok(r.findings.length>0)});
test('installation wizard generates source-based install for every OS',()=>{
 for(const os of ['windows','mac','linux']){const r=install.get(os,'codex','skill','.');assert.ok(r.supported);assert.ok(r.steps.some(x=>x.command.includes('archive/refs/heads/main.zip')));assert.ok(r.steps.some(x=>x.command.includes('jrhagents setup')));}
});
test('MCP unsupported client clearly disabled',()=>{const r=install.get('windows','windsurf','mcp','.');assert.equal(r.supported,false);});
test('MCP supported uses real setup CLI',()=>{const r=install.get('linux','cursor','mcp','/tmp/my project');assert.ok(r.steps.some(x=>x.command.includes('setup --mode mcp --client cursor')));});
test('windows path validation and shell quoting',()=>{assert.throws(()=>install.get('windows','codex','skill','p&x'));assert.ok(install.get('windows','codex','skill','C:\\my work').steps[3].command.includes('"C:\\my work"'));});
test('plugin not claimed universal',()=>{assert.equal(install.get('linux','codex','plugin','.').supported,false);});
