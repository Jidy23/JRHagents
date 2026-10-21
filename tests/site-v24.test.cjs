'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const guide=require('../docs/assets/guide.js');
const root=path.resolve(__dirname,'..');
const raw=fs.readFileSync(path.join(root,'UNIVERSAL_PROMPT.md'),'utf8').split('\n---\n')[1].trim();

test('26 unique skills, not 26 installed APIs',()=>{
 assert.equal(guide.capabilities.length,26);
 assert.deepEqual(guide.capabilities.map(x=>x.id),Array.from({length:26},(_,i)=>i+1));
 assert.equal(new Set(guide.capabilities.map(x=>x.id)).size,26);
});
test('chat clients get full original prompt with zero shell command',()=>{
 for(const {id} of guide.getApps('chat')){
  const info=guide.getInstall('chat',id,raw);
  assert.equal(info.text,raw);
  assert.doesNotMatch(info.text,/npx skills add/);
  assert.match(info.description,/Tidak perlu terminal/);
  assert.match(info.notice,/tidak perlu API key/);
 }
});
test('coding clients get native installer, not fictitious API',()=>{
 for(const {id} of guide.getApps('coding')){
  const info=guide.getInstall('coding',id,raw);
  assert.equal(info.text,'npx skills add Jidy23/JRHagents --skill jrhagents');
  assert.match(info.description,/Terminal/);
 }
});
test('crossing categories fails cleanly',()=>{
 assert.throws(()=>guide.getInstall('chat','codex',raw));
 assert.throws(()=>guide.getInstall('coding','chatgpt',raw));
 assert.throws(()=>guide.getApps('future'));
});
test('all task options produce distinct usable prompts',()=>{
 const list=Object.keys(guide.tasks);assert.equal(list.length,9);
 const prompts=list.map(x=>guide.makeTask(x,'website saya'));
 assert.equal(new Set(prompts).size,9);
 prompts.forEach(x=>assert.match(x,/Konteks tugas saya: website saya/));
});
test('task context is bounded and untrusted',()=>{
 assert.equal(guide.makeTask('audit','x'.repeat(800)).length<1200,true);
 assert.throws(()=>guide.makeTask('alien','a'));
});
test('filters return a stable subset and meaningful search',()=>{
 assert.equal(guide.filterCapabilities('','Semua').length,26);
 assert.ok(guide.filterCapabilities('desain','Semua').length>=2);
 assert.ok(guide.filterCapabilities('','Kode').every(x=>x.category==='Kode'));
 assert.equal(guide.filterCapabilities('zzz-unknown','Semua').length,0);
});
test('source instructions have no API base URL prerequisite',()=>{
 const install=fs.readFileSync(path.join(root,'docs/INSTALL.md'),'utf8');
 assert.match(install,/Tidak perlu API/);
 assert.match(install,/ChatGPT/);
});
