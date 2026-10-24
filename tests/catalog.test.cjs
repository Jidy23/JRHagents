const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const caps=require('../docs/assets/catalog.js');
const html=fs.readFileSync(path.join(root,'docs/index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'docs/assets/app.js'),'utf8');
test('exactly 66 ordered unique capability workflows',()=>{
 assert.equal(caps.length,66);assert.deepEqual(caps.map(x=>x.id),Array.from({length:66},(_,i)=>i+1));
 assert.equal(new Set(caps.map(x=>x.title)).size,66);
});
test('11 categories have six workflows each',()=>{
 const counts={};for(const cap of caps)counts[cap.category]=(counts[cap.category]||0)+1;
 assert.equal(Object.keys(counts).length,11);assert.ok(Object.values(counts).every(x=>x===6));
});
test('all 66 have real references and expected outputs',()=>{
 for(const c of caps){assert.ok(fs.existsSync(path.join(root,'skills/jrhagents/references',c.reference)),c.title);
 assert.ok(c.deliverable.length>=7);assert.ok(c.descriptionEn.length>=10);
 assert.equal(c.minimum_host,'chat');assert.ok(Array.isArray(c.optional_host));}
});
test('website discloses optional host tools for selected workflow',()=>{
 assert.ok(html.includes('id="detailAccess"'));
 assert.ok(script.includes("v.optional_host.map"));
});
test('UI has only four primary tabs and local lightweight scripts',()=>{
 assert.equal((html.match(/data-screen=/g)||[]).length,4);
 assert.ok(html.includes('class="mobile-bottom"'));
 for(const n of ['catalog.js','universal.js','app.js'])assert.match(html, new RegExp(`assets/${n}\\?v=\\d+`));
 assert.ok(!html.includes('three.min.js'));assert.ok(!html.includes('https://cdn.'));
});
test('masked preview is not claimed to be secret',()=>{
 assert.ok(script.includes('not encrypted')||script.includes('not encrypted')||script.includes('not encrypted'));
 assert.ok(script.includes('fullText()'));assert.ok(script.includes('navigator.clipboard'));
});
test('copy for non-shell platforms is a full prompt and coding has distinct command',()=>{
 const universal=fs.readFileSync(path.join(root,'docs/assets/universal.js'),'utf8');
 assert.ok(universal.includes('You are JRHagents'));
 assert.ok(script.includes("state.type==='coding'?install"));
 assert.ok(script.includes('copy(taskText())'));
});
