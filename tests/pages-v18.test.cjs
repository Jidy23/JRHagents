/* Regression tests for the new functional Pages. Historical filename retained for CI compatibility. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'../docs');const page=fs.readFileSync(path.join(root,'index.html'),'utf8');const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');const css=fs.readFileSync(path.join(root,'assets/style.css'),'utf8');
test('homepage provides actual workspace and installation flow',()=>{
 for(const id of ['coba','choose','install','contoh','fitur','faq','fileInput','folderInput','sampleAudit','auditResults','downloadReport','installSteps','client','projectPath'])assert.ok(page.includes(`id="${id}"`),id);
});
test('page loads real static analyzer modules',()=>{
 assert.match(page,/browser-audit\.js/);assert.match(page,/direct-install\.js/);assert.match(app,/auditFiles\(/);assert.match(app,/URL\.createObjectURL/);
});
test('not a fictitious AI SaaS runtime',()=>{
 assert.doesNotMatch(page,/jrh run web\.search/);assert.doesNotMatch(page,/jrh run image\.create/);assert.doesNotMatch(page,/pip install jrhagents\b/);
 assert.match(page,/Tidak mengunggah berkas/);assert.match(page,/Tidak menjalankan kode/);
});
test('accessibility and copy control exist',()=>{
 for(const term of ['aria-live','aria-label','aria-pressed','role="status"','aria-expanded'])assert.ok(page.includes(term),term);
 assert.match(app,/function copyText\(/);assert.match(app,/copyText\(item\.command\)/);
});
test('responsive layout includes small screens and reduced motion',()=>{
 assert.match(css,/@media\(max-width:650px\)/);assert.match(css,/@media\(max-width:365px\)/);assert.match(css,/prefers-reduced-motion/);
});
test('public GitHub links are safe',()=>{assert.match(page,/github\.com\/Jidy23\/JRHagents/);assert.match(page,/rel="noopener noreferrer"/);});
